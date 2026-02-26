const https = require("https");
const { URL } = require("url");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { createOrderFromCartForUser } = require("../services/orderService");

const postForm = (urlString, payload) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = new URLSearchParams(payload).toString();

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
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });

const getEnv = (key, fallback) => process.env[key] || fallback;

const getGatewayConfig = () => {
  const backendUrl = getEnv("BACKEND_URL", "http://localhost:5000");
  const frontendUrl = getEnv("FRONTEND_URL", "http://localhost:3000");

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

// POST /api/payments/sslcommerz/init
// body: { shippingAddress, couponCode? }
exports.initSslCommerz = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shippingAddress, couponCode } = req.body;

    if (!shippingAddress?.division || !shippingAddress?.district || !shippingAddress?.addressLine1) {
      await session.abortTransaction();
      return res.status(400).json({ message: "shippingAddress (division, district, addressLine1) required" });
    }

    const cfg = getGatewayConfig();
    if (!cfg.storeId || !cfg.storePass) {
      await session.abortTransaction();
      return res.status(500).json({ message: "SSLCOMMERZ credentials not configured" });
    }

    const createdOrder = await createOrderFromCartForUser({
      userId: req.user._id,
      shippingAddress,
      paymentMethod: "SSLCOMMERZ",
      paymentProvider: "sslcommerz",
      couponCode,
      session,
    });

    await session.commitTransaction();

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
      cus_name: shippingAddress.recipientName || req.user.name || "Customer",
      cus_email: req.user.email || "customer@splashelectronics.com",
      cus_add1: shippingAddress.addressLine1 || "N/A",
      cus_add2: shippingAddress.addressLine2 || "",
      cus_city: shippingAddress.district || "",
      cus_state: shippingAddress.division || "",
      cus_postcode: shippingAddress.postalCode || "",
      cus_country: "Bangladesh",
      cus_phone: shippingAddress.phone || req.user.number || "N/A",
      shipping_method: "NO",
      num_of_item: createdOrder.items?.length || 1,
      product_name: "Splash Electronics Order",
      product_category: "Electronics",
      product_profile: "general",
      value_a: orderNo,
      value_b: String(req.user._id),
    };

    const initResp = await postForm(cfg.initUrl, payload);
    const gatewayUrl = initResp?.GatewayPageURL || initResp?.gateway_url;

    if (!gatewayUrl) {
      return res.status(502).json({ message: "Failed to init SSLCOMMERZ session", detail: initResp });
    }

    return res.json({ gatewayUrl, orderNo });
  } catch (e) {
    console.error("initSslCommerz:", e);
    await session.abortTransaction();
    const statusCode = e.statusCode || 500;
    return res.status(statusCode).json({ message: e.message || "Failed to init SSLCOMMERZ" });
  } finally {
    session.endSession();
  }
};

// POST /api/payments/sslcommerz/ipn
exports.sslCommerzIpn = async (req, res) => {
  try {
    const cfg = getGatewayConfig();
    const tranId = req.body?.tran_id || req.query?.tran_id;
    const valId = req.body?.val_id || req.query?.val_id;
    const status = req.body?.status || req.query?.status;

    if (!tranId || !valId) {
      return res.status(400).send("Missing tran_id or val_id");
    }

    const validationQuery = {
      val_id: valId,
      store_id: cfg.storeId,
      store_passwd: cfg.storePass,
      format: "json",
    };

    const validationResp = await postForm(cfg.validationUrl, validationQuery);
    const isValid =
      validationResp?.status === "VALID" ||
      validationResp?.status === "VALIDATED";

    const order = await Order.findOne({ orderNo: tranId });
    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (isValid) {
      if (order.payment?.status !== "paid") {
        order.payment.status = "paid";
        order.payment.provider = "sslcommerz";
        order.payment.transactionId = validationResp?.tran_id || valId;
        order.payment.paidAt = new Date();
        order.status = order.status === "pending" ? "confirmed" : order.status;
        await order.save();
      }
      return res.status(200).send("OK");
    }

    if (status === "FAILED" || status === "CANCELLED") {
      order.payment.status = "failed";
      order.payment.provider = "sslcommerz";
      order.payment.transactionId = validationResp?.tran_id || valId;
      await order.save();
    }

    return res.status(200).send("OK");
  } catch (e) {
    console.error("sslCommerzIpn:", e);
    return res.status(500).send("IPN error");
  }
};

const redirectWithStatus = (req, res, status) => {
  const cfg = getGatewayConfig();
  const tranId = req.body?.tran_id || req.query?.tran_id || req.body?.value_a || req.query?.value_a;
  const orderNo = tranId || "unknown";
  const url = `${cfg.frontendUrl}/order-success/${orderNo}?payment=${status}`;
  return res.redirect(url);
};

// POST/GET /api/payments/sslcommerz/success
exports.sslCommerzSuccess = (req, res) => redirectWithStatus(req, res, "success");

// POST/GET /api/payments/sslcommerz/fail
exports.sslCommerzFail = (req, res) => redirectWithStatus(req, res, "failed");

// POST/GET /api/payments/sslcommerz/cancel
exports.sslCommerzCancel = (req, res) => redirectWithStatus(req, res, "cancelled");
