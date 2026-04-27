const https = require("https");
const { URL } = require("url");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const ReturnRefund = require("../models/ReturnRefund");
const {
  createOrderFromCartForUser,
  applyCouponUsageIfNeeded,
} = require("../services/orderService");
const { validateShippingPayload } = require("../utils/shippingValidation");
const {
  releaseExpiredReservations,
  releaseReservationForOrder,
} = require("../services/stockReservationService");
const { getVisitorKey } = require("../utils/visitorKey");

const postForm = (urlString, payload) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = new URLSearchParams(payload).toString();
    let settled = false;

    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (settled) return;
          settled = true;
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );

    req.setTimeout(15000, () => {
      if (settled) return;
      settled = true;
      req.destroy(new Error(`Request timed out for ${url.hostname}`));
    });

    req.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    req.write(data);
    req.end();
  });

const getEnv = (key, fallback) => process.env[key] || fallback;
const isSslCommerzDebugEnabled = () => String(process.env.SSLCOMMERZ_DEBUG || "").toLowerCase() === "true";

const getSslCommerzErrorMessage = (resp) => {
  if (!resp) return "No response from SSLCOMMERZ";

  return (
    resp.failedreason ||
    resp.failed_reason ||
    resp.message ||
    resp.status_message ||
    resp.status ||
    (typeof resp.raw === "string" && resp.raw.trim()) ||
    "SSLCOMMERZ did not return a gateway URL"
  );
};

const normalizeBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

const getConfiguredOrigins = () =>
  String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => normalizeBaseUrl(origin.trim()))
    .filter(Boolean);

const getHeaderValue = (req, headerName) => {
  const value = req?.headers?.[headerName];
  if (Array.isArray(value)) return value[0];
  return value;
};

const getFirstForwardedValue = (value) => String(value || "").split(",")[0].trim();

const safeAbsoluteUrl = (value) => {
  if (!value) return "";

  try {
    const url = new URL(String(value).trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return normalizeBaseUrl(url.toString());
  } catch (e) {
    return "";
  }
};

const resolveBackendUrl = (req) => {
  const envUrl = safeAbsoluteUrl(process.env.BACKEND_URL);
  if (envUrl) return envUrl;

  const forwardedProto = getFirstForwardedValue(getHeaderValue(req, "x-forwarded-proto"));
  const forwardedHost = getFirstForwardedValue(getHeaderValue(req, "x-forwarded-host"));
  const host = forwardedHost || getHeaderValue(req, "host");

  if (!host) return "http://localhost:5000";
  return safeAbsoluteUrl(`${forwardedProto || req?.protocol || "http"}://${host}`) || "http://localhost:5000";
};

const getOriginFromReferer = (req) => {
  const referer = getHeaderValue(req, "referer");
  if (!referer) return "";

  try {
    const url = new URL(referer);
    return normalizeBaseUrl(url.origin);
  } catch (e) {
    return "";
  }
};

const resolveFrontendUrl = (req) => {
  const envUrl = safeAbsoluteUrl(process.env.FRONTEND_URL);
  if (envUrl) return envUrl;

  const callbackHint = safeAbsoluteUrl(getRequestValue(req, "value_c"));
  if (callbackHint) return callbackHint;

  const configuredOrigin = getConfiguredOrigins()[0];
  if (configuredOrigin) return configuredOrigin;

  const requestOrigin = safeAbsoluteUrl(getHeaderValue(req, "origin"));
  if (requestOrigin) return requestOrigin;

  const refererOrigin = safeAbsoluteUrl(getOriginFromReferer(req));
  if (refererOrigin) return refererOrigin;

  return "http://localhost:3000";
};

const getGatewayConfig = (req) => {
  const backendUrl = resolveBackendUrl(req);
  const frontendUrl = resolveFrontendUrl(req);

  return {
    storeId: process.env.SSLCOMMERZ_STORE_ID,
    storePass: process.env.SSLCOMMERZ_STORE_PASS,
    initUrl: getEnv("SSLCOMMERZ_INIT_URL", "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"),
    validationUrl: getEnv(
      "SSLCOMMERZ_VALIDATION_URL",
      "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    ),
    successUrl: getEnv("SSLCOMMERZ_SUCCESS_URL", `${backendUrl}/api/payments/sslcommerz/success`),
    failUrl: getEnv("SSLCOMMERZ_FAIL_URL", `${backendUrl}/api/payments/sslcommerz/fail`),
    cancelUrl: getEnv("SSLCOMMERZ_CANCEL_URL", `${backendUrl}/api/payments/sslcommerz/cancel`),
    ipnUrl: getEnv("SSLCOMMERZ_IPN_URL", `${backendUrl}/api/payments/sslcommerz/ipn`),
    frontendUrl,
  };
};

const getRequestValue = (req, key) => req.body?.[key] || req.query?.[key];

const isSandboxGateway = (cfg) =>
  String(cfg?.initUrl || "").toLowerCase().includes("sandbox.sslcommerz.com");

const validateSslPayment = async (cfg, valId) => {
  if (!valId) return null;

  return postForm(cfg.validationUrl, {
    val_id: valId,
    store_id: cfg.storeId,
    store_passwd: cfg.storePass,
    format: "json",
  });
};

const isValidatedPayment = (validationResp) =>
  validationResp?.status === "VALID" || validationResp?.status === "VALIDATED";

const ensureLatePaymentRefundRequest = async (order) => {
  const existing = await ReturnRefund.findOne({
    order: order._id,
    status: { $in: ["requested", "approved", "picked", "received"] },
  });

  if (existing) return;

  const items = (order.items || []).map((it) => ({
    product: it.product,
    variantId: it.variantId,
    qty: it.qty,
    reason: "late_payment_after_reservation_expiry",
  }));

  await ReturnRefund.create({
    order: order._id,
    user: order.user,
    items,
    status: "requested",
    customerRefundPreference: {
      issueType: "OTHER",
      reason: "Payment succeeded after reservation expiry cancellation",
      refundTimeOption: "WITHIN_7_DAYS",
    },
    notes: `Auto-created from late successful payment callback for ${order.orderNo}`,
  });
};

const markOrderPaidFromSslCommerz = async (order, transactionId) => {
  order.payment = order.payment || {};
  order.payment.status = "paid";
  order.payment.provider = "sslcommerz";
  order.payment.transactionId = transactionId || order.payment.transactionId;
  order.payment.paidAt = order.payment.paidAt || new Date();
  await order.save();
  await Cart.updateOne({ user: order.user }, { $set: { items: [] } });
  await applyCouponUsageIfNeeded({ order });
};

const markOrderFailedFromSslCommerz = async (order, transactionId, statusHint) => {
  if (String(order.payment?.status || "").toLowerCase() === "paid") {
    return;
  }

  order.payment = order.payment || {};
  order.payment.status = "failed";
  order.payment.provider = "sslcommerz";
  order.payment.transactionId = transactionId || order.payment.transactionId;
  order.status = "cancelled";
  await releaseReservationForOrder({
    order,
    releaseReason: statusHint === "cancelled" ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED",
    ledgerReason:
      statusHint === "cancelled" ? "PAYMENT_CANCELLED_RELEASE" : "PAYMENT_FAILED_RELEASE",
    note: `Reservation released after ${statusHint || "payment failure"} for order ${order.orderNo}`,
  });
  await order.save();
};

const syncSslCommerzOrder = async ({ req, statusHint }) => {
  const cfg = getGatewayConfig(req);
  const tranId = getRequestValue(req, "tran_id") || getRequestValue(req, "value_a");
  const valId = getRequestValue(req, "val_id");
  const status = String(getRequestValue(req, "status") || statusHint || "").toUpperCase();

  if (!tranId) {
    return { orderNo: "unknown", redirectStatus: statusHint || "pending" };
  }

  const order = await Order.findOne({ orderNo: tranId });
  if (!order) {
    return { orderNo: tranId, redirectStatus: "not-found" };
  }

  let validationResp = null;
  if (valId && cfg.storeId && cfg.storePass) {
    try {
      validationResp = await validateSslPayment(cfg, valId);
    } catch (error) {
      console.error("validateSslPayment:", error.message || error);
    }
  }

  const transactionId =
    validationResp?.tran_id || valId || getRequestValue(req, "bank_tran_id") || tranId;

  if (isValidatedPayment(validationResp)) {
    if (String(order.status || "").toLowerCase() === "cancelled") {
      await markOrderPaidFromSslCommerz(order, transactionId);
      await ensureLatePaymentRefundRequest(order);
      return { orderNo: tranId, redirectStatus: "paid" };
    }

    if (String(order.payment?.status || "").toLowerCase() !== "paid") {
      await markOrderPaidFromSslCommerz(order, transactionId);
    }
    return { orderNo: tranId, redirectStatus: "paid" };
  }

  const isSandboxSuccessFallback =
    isSandboxGateway(cfg) &&
    ["VALID", "VALIDATED", "SUCCESS"].includes(status || "") &&
    String(order.payment?.status || "").toLowerCase() !== "paid";

  if (isSandboxSuccessFallback || statusHint === "success") {
    await markOrderPaidFromSslCommerz(order, transactionId);
    return { orderNo: tranId, redirectStatus: "paid" };
  }

  if (["FAILED", "CANCELLED"].includes(status) || statusHint === "failed" || statusHint === "cancelled") {
    const nextStatus = status === "CANCELLED" || statusHint === "cancelled" ? "cancelled" : "failed";
    await markOrderFailedFromSslCommerz(order, transactionId, nextStatus);
    return { orderNo: tranId, redirectStatus: nextStatus };
  }

  return {
    orderNo: tranId,
    redirectStatus:
      String(order.payment?.status || "").toLowerCase() === "paid"
        ? "paid"
        : statusHint || "pending",
  };
};

// POST /api/payments/sslcommerz/init
// body: { shippingAddress, couponCode? }
exports.initSslCommerz = async (req, res) => {
  let session;

  try {
    await releaseExpiredReservations();
    session = await mongoose.startSession();
    session.startTransaction();

    const { shippingAddress, couponCode, deliveryOption } = req.body;
    const validation = validateShippingPayload({ shippingAddress, deliveryOption });
    if (!validation.ok) {
      await session.abortTransaction();
      return res.status(400).json({ message: validation.message });
    }

    const cfg = getGatewayConfig(req);
    if (!cfg.storeId || !cfg.storePass) {
      await session.abortTransaction();
      return res.status(500).json({ message: "SSLCOMMERZ credentials not configured" });
    }

    const createdOrder = await createOrderFromCartForUser({
      userId: req.user._id,
      shippingAddress: validation.shippingAddress,
      paymentMethod: "SSLCOMMERZ",
      paymentProvider: "sslcommerz",
      couponCode,
      deliveryOption: validation.deliveryOption,
      visitorKey: getVisitorKey(req),
      session,
      clearCart: false,
    });

    const orderNo = createdOrder.orderNo;
    const amount = createdOrder.pricing?.grandTotal || 0;

    const payload = {
      store_id: cfg.storeId,
      store_passwd: cfg.storePass,
      total_amount: amount.toFixed(2),
      currency: "BDT",
      tran_id: orderNo,
      success_url: cfg.successUrl,
      fail_url: cfg.failUrl,
      cancel_url: cfg.cancelUrl,
      ipn_url: cfg.ipnUrl,
      cus_name: validation.shippingAddress.recipientName || req.user.name || "Customer",
      cus_email: req.user.email || "customer@splashelectronics.com",
      cus_add1: validation.shippingAddress.addressLine1 || "N/A",
      cus_add2: validation.shippingAddress.addressLine2 || "",
      cus_city: validation.shippingAddress.district || "",
      cus_state: validation.shippingAddress.division || "",
      cus_postcode: validation.shippingAddress.postalCode || "",
      cus_country: "Bangladesh",
      cus_phone: validation.shippingAddress.phone || req.user.number || "N/A",
      shipping_method: "Courier",
      ship_name: validation.shippingAddress.recipientName || req.user.name || "Customer",
      ship_add1: validation.shippingAddress.addressLine1 || "N/A",
      ship_add2: validation.shippingAddress.addressLine2 || "",
      ship_city: validation.shippingAddress.district || "",
      ship_state: validation.shippingAddress.division || "",
      ship_postcode: validation.shippingAddress.postalCode || "1000",
      ship_country: "Bangladesh",
      num_of_item: createdOrder.items?.length || 1,
      product_name: "Splash Electronics Order",
      product_category: "Electronics",
      product_profile: "general",
      value_a: orderNo,
      value_b: String(req.user._id),
      value_c: cfg.frontendUrl,
    };

    if (isSslCommerzDebugEnabled()) {
      console.error("SSLCOMMERZ init payload:", {
        ...payload,
        store_passwd: cfg.storePass ? "***masked***" : "",
      });
    }

    const initResp = await postForm(cfg.initUrl, payload);
    const gatewayUrl = initResp?.GatewayPageURL || initResp?.gateway_url;

    if (!gatewayUrl) {
      const gatewayError = getSslCommerzErrorMessage(initResp);
      await session.abortTransaction();
      if (isSslCommerzDebugEnabled()) {
        console.error("SSLCOMMERZ init failed:", {
          orderNo,
          amount,
          response: initResp,
        });
      }
      return res.status(502).json({
        message: "Failed to init SSLCOMMERZ session",
        detail: gatewayError,
        raw: initResp,
      });
    }

    await session.commitTransaction();
    return res.json({ gatewayUrl, orderNo });
  } catch (e) {
    console.error("initSslCommerz:", e);
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    const statusCode = e.statusCode || 500;
    return res.status(statusCode).json({ message: e.message || "Failed to init SSLCOMMERZ" });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// POST /api/payments/sslcommerz/ipn
exports.sslCommerzIpn = async (req, res) => {
  try {
    const result = await syncSslCommerzOrder({ req, statusHint: "pending" });
    if (result.redirectStatus === "not-found") {
      return res.status(404).send("Order not found");
    }
    return res.status(200).send("OK");
  } catch (e) {
    console.error("sslCommerzIpn:", e);
    return res.status(500).send("IPN error");
  }
};

const redirectWithStatus = async (req, res, statusHint) => {
  const cfg = getGatewayConfig(req);
  const { orderNo, redirectStatus } = await syncSslCommerzOrder({ req, statusHint });
  const url = `${normalizeBaseUrl(cfg.frontendUrl)}/order-success/${encodeURIComponent(
    orderNo
  )}?payment=${encodeURIComponent(redirectStatus)}`;
  return res.redirect(url);
};

const redirectWithFallbackStatus = (req, res, statusHint) => {
  const cfg = getGatewayConfig(req);
  const orderNo = getRequestValue(req, "tran_id") || getRequestValue(req, "value_a") || "unknown";
  const url = `${normalizeBaseUrl(cfg.frontendUrl)}/order-success/${encodeURIComponent(
    orderNo
  )}?payment=${encodeURIComponent(statusHint || "pending")}`;
  return res.redirect(url);
};

// POST/GET /api/payments/sslcommerz/success
exports.sslCommerzSuccess = async (req, res) => {
  try {
    return await redirectWithStatus(req, res, "success");
  } catch (e) {
    console.error("sslCommerzSuccess:", e);
    return redirectWithFallbackStatus(req, res, "pending");
  }
};

// POST/GET /api/payments/sslcommerz/fail
exports.sslCommerzFail = async (req, res) => {
  try {
    return await redirectWithStatus(req, res, "failed");
  } catch (e) {
    console.error("sslCommerzFail:", e);
    return redirectWithFallbackStatus(req, res, "failed");
  }
};

// POST/GET /api/payments/sslcommerz/cancel
exports.sslCommerzCancel = async (req, res) => {
  try {
    return await redirectWithStatus(req, res, "cancelled");
  } catch (e) {
    console.error("sslCommerzCancel:", e);
    return redirectWithFallbackStatus(req, res, "cancelled");
  }
};
