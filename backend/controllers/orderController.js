// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const InventoryLedger = require("../models/InventoryLedger");
const ReturnRefund = require("../models/ReturnRefund");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const {
  createOrderFromCartForUser,
  getShippingQuote,
  validateCouponForItems,
} = require("../services/orderService");
const { validateShippingPayload } = require("../utils/shippingValidation");
const { getCourierProvider } = require("../services/courier");
const { getVisitorKey } = require("../utils/visitorKey");
const {
  COLLECTED_PAYMENT_STATUSES,
  buildCollectedRevenueExpr,
  buildRevenueExpr,
} = require("../utils/revenueRecognition");
const {
  PREPAID_METHODS,
  releaseExpiredReservations,
  releaseReservationForOrder,
  getReservedQtyMap,
  getAvailableStock,
} = require("../services/stockReservationService");

const canCancelByCustomer = (status) =>
  ["pending", "confirmed", "processing"].includes(String(status || "").toLowerCase());

const canConfirmDeliveryByCustomer = (status) =>
  String(status || "").toLowerCase() === "shipped";

const canRequestRefund = (status, paymentStatus) => {
  const st = String(status || "").toLowerCase();
  const pay = String(paymentStatus || "").toLowerCase();
  return (st === "cancelled" || st === "delivered") && pay === "paid";
};
const REFUND_TIME_OPTIONS = ["WITHIN_24_HOURS", "WITHIN_3_DAYS", "WITHIN_7_DAYS"];
const REFUND_ISSUE_TYPES = [
  "DAMAGED_PRODUCT",
  "DEFECTIVE_PRODUCT",
  "WRONG_ITEM",
  "MISSING_PARTS",
  "DIFFERENT_FROM_DESCRIPTION",
  "CHANGED_MIND",
  "OTHER",
];
const EVIDENCE_REQUIRED_ISSUE_TYPES = new Set([
  "DAMAGED_PRODUCT",
  "DEFECTIVE_PRODUCT",
  "WRONG_ITEM",
  "MISSING_PARTS",
  "DIFFERENT_FROM_DESCRIPTION",
]);
const REVENUE_RECOGNIZED_STATUSES = ["confirmed", "processing", "shipped", "delivered"];
const STOCK_DEDUCTION_STATUSES = ["shipped", "delivered"];
const COURIER_STATUSES = [
  "AWAITING_BOOKING",
  "BOOKED",
  "PICKED",
  "IN_TRANSIT",
  "AT_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURN_INITIATED",
  "RETURNED_TO_MERCHANT",
];
const COURIER_STATUS_META = {
  AWAITING_BOOKING: { label: "Awaiting booking", code: "COURIER_AWAITING_BOOKING" },
  BOOKED: { label: "Courier booked", code: "COURIER_BOOKED" },
  PICKED: { label: "Parcel picked up", code: "COURIER_PICKED" },
  IN_TRANSIT: { label: "In transit", code: "COURIER_IN_TRANSIT" },
  AT_HUB: { label: "Reached courier hub", code: "COURIER_AT_HUB" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", code: "COURIER_OUT_FOR_DELIVERY" },
  DELIVERED: { label: "Delivered by courier", code: "COURIER_DELIVERED" },
  DELIVERY_FAILED: { label: "Delivery attempt failed", code: "COURIER_DELIVERY_FAILED" },
  RETURN_INITIATED: { label: "Return initiated", code: "COURIER_RETURN_INITIATED" },
  RETURNED_TO_MERCHANT: { label: "Returned to merchant", code: "COURIER_RETURNED_TO_MERCHANT" },
};
const addDays = (dateLike, days) => {
  const base = new Date(dateLike || new Date());
  if (Number.isNaN(base.getTime())) return new Date();
  const out = new Date(base);
  out.setDate(out.getDate() + Number(days || 0));
  return out;
};

const uploadRefundEvidenceFromBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "refund-evidence" },
      (error, result) => (result ? resolve(result) : reject(error))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

const normalizeRefundIssueType = (value, fallback = "OTHER") => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return REFUND_ISSUE_TYPES.includes(normalized) ? normalized : fallback;
};

const uploadRefundEvidenceFiles = async (files = []) => {
  const uploaded = [];
  for (const file of Array.isArray(files) ? files : []) {
    const result = await uploadRefundEvidenceFromBuffer(file.buffer);
    uploaded.push({
      url: result.secure_url,
      public_id: result.public_id,
    });
  }
  return uploaded;
};

const validateCourierStatusForWorkflow = (orderStatus, courierStatus) => {
  const normalizedOrderStatus = String(orderStatus || "").trim().toLowerCase();
  const normalizedCourierStatus = String(courierStatus || "").trim().toUpperCase();
  if (!normalizedCourierStatus) return;

  if (
    ["pending", "confirmed", "processing", "cancelled"].includes(normalizedOrderStatus) &&
    !["AWAITING_BOOKING", "BOOKED"].includes(normalizedCourierStatus)
  ) {
    const err = new Error("Mark the order as shipped before using this courier status");
    err.statusCode = 400;
    throw err;
  }

  if (normalizedCourierStatus === "DELIVERED" && normalizedOrderStatus !== "delivered") {
    const err = new Error("Use the delivered workflow action before setting courier status to delivered");
    err.statusCode = 400;
    throw err;
  }

  if (normalizedCourierStatus === "RETURNED_TO_MERCHANT" && normalizedOrderStatus !== "returned") {
    const err = new Error("Use the returned workflow action before setting courier status to returned to merchant");
    err.statusCode = 400;
    throw err;
  }
};

const recomputeGrandTotal = (order) => {
  const itemsTotal = Number(order?.pricing?.itemsTotal || 0);
  const shippingFee = Number(order?.pricing?.shippingFee || 0);
  const discountTotal = Number(order?.pricing?.discountTotal || 0);
  order.pricing = order.pricing || {};
  order.pricing.grandTotal = itemsTotal + shippingFee - discountTotal;
};

const createShipmentEvent = ({
  code,
  label,
  details = "",
  source = "system",
  visibleToCustomer = true,
  createdAt = new Date(),
}) => ({
  code,
  label,
  details,
  source,
  visibleToCustomer,
  createdAt,
});

const pushShipmentEvent = (order, event) => {
  order.shipment = order.shipment || {};
  order.shipment.events = Array.isArray(order.shipment.events) ? order.shipment.events : [];
  const lastEvent = order.shipment.events[order.shipment.events.length - 1];
  if (
    lastEvent &&
    lastEvent.code === event.code &&
    String(lastEvent.details || "").trim() === String(event.details || "").trim()
  ) {
    return;
  }
  order.shipment.events.push(event);
};

const syncInternalShipmentEvent = (order, status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "confirmed") {
    pushShipmentEvent(order, createShipmentEvent({
      code: "ORDER_CONFIRMED",
      label: "Order confirmed",
      details: "The order has been reviewed and confirmed by the store.",
    }));
  }
  if (normalized === "processing") {
    pushShipmentEvent(order, createShipmentEvent({
      code: "ORDER_PROCESSING",
      label: "Preparing shipment",
      details: "The parcel is being packed and prepared for dispatch.",
    }));
  }
  if (normalized === "shipped") {
    pushShipmentEvent(order, createShipmentEvent({
      code: "ORDER_SHIPPED",
      label: "Handed to delivery partner",
      details: "The parcel has left the store and is now with the delivery partner.",
    }));
  }
  if (normalized === "delivered") {
    pushShipmentEvent(order, createShipmentEvent({
      code: "ORDER_DELIVERED",
      label: "Order delivered",
      details: "The order has been marked as delivered.",
    }));
  }
  if (normalized === "cancelled") {
    pushShipmentEvent(order, createShipmentEvent({
      code: "ORDER_CANCELLED",
      label: "Order cancelled",
      details: "The order was cancelled before delivery.",
    }));
  }
  if (normalized === "returned") {
    pushShipmentEvent(order, createShipmentEvent({
      code: "ORDER_RETURNED",
      label: "Order returned",
      details: "The shipment was returned after delivery handling.",
    }));
  }
};

const syncCourierStatus = (order, courierStatus, courierStatusNote, source = "admin") => {
  const normalized = String(courierStatus || "").trim().toUpperCase();
  if (!normalized) return;
  if (!COURIER_STATUSES.includes(normalized)) {
    const err = new Error("Invalid courier status");
    err.statusCode = 400;
    throw err;
  }

  order.shipment = order.shipment || {};
  order.shipment.courierStatus = normalized;
  order.shipment.courierStatusNote = String(courierStatusNote || "").trim();
  order.shipment.courierStatusUpdatedAt = new Date();

  const meta = COURIER_STATUS_META[normalized];
  pushShipmentEvent(order, createShipmentEvent({
    code: meta.code,
    label: meta.label,
    details: order.shipment.courierStatusNote,
    source,
  }));
};

const applyShipmentAdminFields = ({
  order,
  courier,
  trackingId,
  trackingUrl,
  bookingRef,
  pickupDate,
  fulfillmentMode,
  notes,
}) => {
  order.shipment = order.shipment || {};

  const nextCourier = String(courier ?? order.shipment?.courier ?? "").trim();
  const nextTrackingId = String(trackingId ?? order.shipment?.trackingId ?? "").trim();
  const nextTrackingUrl = String(trackingUrl ?? order.shipment?.trackingUrl ?? "").trim();
  const nextBookingRef = String(bookingRef ?? order.shipment?.bookingRef ?? "").trim();

  order.shipment.courier = nextCourier;
  order.shipment.trackingId = nextTrackingId;
  order.shipment.trackingUrl = nextTrackingUrl;
  order.shipment.bookingRef = nextBookingRef;

  if (fulfillmentMode) {
    const nextFulfillmentMode = String(fulfillmentMode).trim().toUpperCase();
    if (!["THIRD_PARTY_COURIER", "OWN_DELIVERY"].includes(nextFulfillmentMode)) {
      const err = new Error("Invalid fulfillment mode");
      err.statusCode = 400;
      throw err;
    }
    order.shipment.fulfillmentMode = nextFulfillmentMode;
  }

  if (typeof notes === "string") {
    order.notes = notes.trim();
  }

  order.shipment.courierCharge = Number(order?.pricing?.shippingFee || 0);

  if (pickupDate) {
    const dt = new Date(pickupDate);
    if (!Number.isNaN(dt.getTime())) {
      order.shipment.pickupDate = dt;
    }
  }

  return {
    nextCourier,
    nextTrackingId,
    nextTrackingUrl,
    nextBookingRef,
  };
};

const allowedAdminTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const parseAdminDate = (value, endOfDay = false) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return endOfDay
    ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999)
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
};

const buildDateRangeFilter = (from, to) => {
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return Object.keys(range).length ? range : null;
};

const buildAdminOrderFilter = (query = {}, options = {}) => {
  const filter = {};
  const scope = String(query.scope || "").trim().toLowerCase();
  const skipDate = options.skipDate === true;

  if (scope === "active") {
    filter.status = { $in: ["pending", "confirmed", "processing", "shipped"] };
  }

  if (query.status && query.status !== "all") {
    filter.status = String(query.status).toLowerCase().trim();
  }

  const paymentMethod = String(query.paymentMethod || "").trim().toUpperCase();
  if (paymentMethod && paymentMethod !== "ALL") {
    filter["payment.method"] = paymentMethod;
  }

  const from = parseAdminDate(query.from);
  const to = parseAdminDate(query.to, true);
  if (!skipDate && (from || to)) {
    filter.createdAt = buildDateRangeFilter(from, to);
  }

  const keyword = String(query.keyword || "").trim();
  if (keyword) {
    filter.$or = [
      { orderNo: { $regex: keyword, $options: "i" } },
      { "shippingAddress.phone": { $regex: keyword, $options: "i" } },
      { "shippingAddress.district": { $regex: keyword, $options: "i" } },
      { "shippingAddress.division": { $regex: keyword, $options: "i" } },
    ];
  }

  return filter;
};

const buildFinanceOrderFilter = async (query = {}) => {
  const baseFilter = buildAdminOrderFilter(query, { skipDate: true });
  const from = parseAdminDate(query.from);
  const to = parseAdminDate(query.to, true);
  const paidAtRange = buildDateRangeFilter(from, to);
  const refundMatch = { status: "refunded" };
  if (from || to) {
    refundMatch["refund.refundedAt"] = buildDateRangeFilter(from, to);
  }

  const refundedOrderIds = await ReturnRefund.find(refundMatch).distinct("order");
  const financeClauses = [];

  if (paidAtRange) {
    financeClauses.push({
      "payment.paidAt": paidAtRange,
      "payment.status": { $in: COLLECTED_PAYMENT_STATUSES },
    });
  } else {
    financeClauses.push({
      "payment.status": { $in: COLLECTED_PAYMENT_STATUSES },
    });
  }

  if (refundedOrderIds.length) {
    financeClauses.push({ _id: { $in: refundedOrderIds } });
  }

  if (!financeClauses.length) {
    return { _id: { $in: [] } };
  }

  if (Object.keys(baseFilter).length === 0) {
    return { $or: financeClauses };
  }

  return {
    $and: [baseFilter, { $or: financeClauses }],
  };
};

const prefixFilterPaths = (value, prefix) => {
  if (Array.isArray(value)) {
    return value.map((entry) => prefixFilterPaths(entry, prefix));
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, entry]) => {
    if (key.startsWith("$")) {
      acc[key] = prefixFilterPaths(entry, prefix);
      return acc;
    }

    acc[`${prefix}.${key}`] = prefixFilterPaths(entry, prefix);
    return acc;
  }, {});
};

const isWithinRange = (dateLike, from, to) => {
  const dt = dateLike ? new Date(dateLike) : null;
  if (!dt || Number.isNaN(dt.getTime())) return false;
  if (from && dt < from) return false;
  if (to && dt > to) return false;
  return true;
};

const deductOrderItems = async (order) => {
  if (order?.inventory?.deducted) return;
  const reservedMap = await getReservedQtyMap({
    pairs: (order?.items || []).map((it) => ({ productId: it.product, variantId: it.variantId })),
    now: new Date(),
  });

  for (const it of order.items) {
    const product = await Product.findById(it.product);
    const variant = product?.variants?.id(it.variantId);
    if (!variant) continue;

    if (variant.countInStock < it.qty) {
      const err = new Error(`Not enough stock to confirm order for ${it.skuSnapshot}`);
      err.statusCode = 400;
      throw err;
    }

    const oldOnHand = Number(variant.countInStock || 0);
    const oldReserved = Number(
      reservedMap.get(`${String(it.product)}|${String(it.variantId)}`) || 0
    );
    const newOnHand = oldOnHand - Number(it.qty || 0);
    const newReserved = Math.max(0, oldReserved - Number(it.qty || 0));
    variant.countInStock -= it.qty;
    await product.save();

    await InventoryLedger.create({
      product: it.product,
      variantId: it.variantId,
      sku: it.skuSnapshot || variant.sku || "",
      type: "OUT",
      reason: "FULFILLMENT_SHIPPED",
      qty: it.qty,
      deltaQty: -Number(it.qty || 0),
      oldOnHand,
      newOnHand,
      oldReserved,
      newReserved,
      oldAvailable: getAvailableStock({ physicalStock: oldOnHand, reservedQty: oldReserved }),
      newAvailable: getAvailableStock({ physicalStock: newOnHand, reservedQty: newReserved }),
      order: order._id,
      note: `Fulfillment shipped for order ${order.orderNo}`,
    });
  }

  order.inventory = order.inventory || {};
  order.inventory.deducted = true;
  order.inventory.deductedAt = new Date();
  order.inventory.restoredAt = undefined;
  await releaseReservationForOrder({
    order,
    releaseReason: "FULFILLMENT_SHIPPED",
    note: `Reservation consumed by fulfillment for order ${order.orderNo}`,
  });
};

const restockOrderItems = async (order) => {
  if (order?.inventory?.deducted) {
    for (const it of order.items) {
      const product = await Product.findById(it.product);
      const variant = product?.variants?.id(it.variantId);
      const oldOnHand = Number(variant?.countInStock || 0);
      if (variant) {
        variant.countInStock += it.qty;
        await product.save();
      }
      await InventoryLedger.create({
        product: it.product,
        variantId: it.variantId,
        sku: it.skuSnapshot || variant?.sku || "",
        type: "IN",
        reason: "CANCELLED_ORDER_RESTOCK",
        qty: it.qty,
        deltaQty: Number(it.qty || 0),
        oldOnHand,
        newOnHand: oldOnHand + Number(it.qty || 0),
        oldReserved: 0,
        newReserved: 0,
        oldAvailable: oldOnHand,
        newAvailable: oldOnHand + Number(it.qty || 0),
        order: order._id,
        note: `Cancelled order ${order.orderNo}`,
      });
    }
  }

  order.inventory = order.inventory || {};
  order.inventory.deducted = false;
  order.inventory.restoredAt = new Date();
  await releaseReservationForOrder({
    order,
    releaseReason: "ORDER_CANCELLED",
    ledgerReason: "ORDER_CANCELLED_RELEASE",
    note: `Reservation released for cancelled order ${order.orderNo}`,
    actorId: order?.user,
  });
};

const buildReturnItemsFromOrder = (order, reason) =>
  (order.items || []).map((it) => ({
    product: it.product,
    variantId: it.variantId,
    qty: it.qty,
    reason,
  }));

const shouldAutoCreateRefundRequest = (order) => {
  const payMethod = String(order?.payment?.method || "").toUpperCase();
  const payStatus = String(order?.payment?.status || "").toLowerCase();
  return PREPAID_METHODS.includes(payMethod) && payStatus === "paid";
};

const ensureRefundRequestForCancelledPaidOrder = async (order, note) => {
  if (!shouldAutoCreateRefundRequest(order)) return;

  const existing = await ReturnRefund.findOne({
    order: order._id,
    status: { $in: ["requested", "approved", "picked", "received"] },
  });
  if (existing) return;

  await ReturnRefund.create({
    order: order._id,
    user: order.user,
    items: buildReturnItemsFromOrder(order, "order_cancelled_refund"),
    status: "requested",
    customerRefundPreference: {
      issueType: "OTHER",
      reason: "Order cancelled after online/prepaid payment",
      refundTimeOption: "WITHIN_7_DAYS",
    },
    notes: note || `Auto-created refund request for cancelled paid order ${order.orderNo}`,
  });
};

// POST /api/orders
// body: { shippingAddress, paymentMethod, couponCode? }
exports.createOrderFromCart = async (req, res) => {
  let session;

  try {
    await releaseExpiredReservations();
    session = await mongoose.startSession();
    session.startTransaction();

    const { shippingAddress, paymentMethod, couponCode, deliveryOption } = req.body;
    const validation = validateShippingPayload({ shippingAddress, deliveryOption });
    if (!validation.ok) {
      await session.abortTransaction();
      return res.status(400).json({ message: validation.message });
    }
    const createdOrder = await createOrderFromCartForUser({
      userId: req.user._id,
      shippingAddress: validation.shippingAddress,
      paymentMethod: paymentMethod || "COD",
      couponCode,
      deliveryOption: validation.deliveryOption,
      visitorKey: getVisitorKey(req),
      session,
    });

    await session.commitTransaction();
    res.status(201).json(createdOrder);

  } catch (e) {
    console.error("createOrderFromCart:", e);
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    const statusCode = e.statusCode || 500;
    res.status(statusCode).json({ message: e.message || "Failed to create order" });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// POST /api/orders/validate-coupon
// body: { couponCode, shippingAddress?, deliveryOption? }
exports.validateCoupon = async (req, res) => {
  try {
    await releaseExpiredReservations();

    const cart = await Cart.findOne({ user: req.user._id }).lean();
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let itemsTotal = 0;
    const couponItems = [];

    for (const item of cart.items) {
      const product = await Product.findOne({
        _id: item.product,
        isActive: true,
        isDeleted: { $ne: true },
      }).select("category variants name");
      if (!product) {
        return res.status(400).json({ message: "A cart item is no longer available" });
      }

      const variant = product.variants.id(item.variantId);
      if (!variant) {
        return res.status(400).json({ message: `A variant for ${product.name} is no longer available` });
      }

      const unitPrice = Number(variant.price ?? item.priceAtAdd ?? 0);
      const lineTotal = unitPrice * Number(item.qty || 0);
      itemsTotal += lineTotal;
      couponItems.push({
        productId: product._id,
        categoryId: product.category || null,
        qty: Number(item.qty || 0),
        lineTotal,
      });
    }

    const shippingAddress = req.body?.shippingAddress || {};
    const deliveryOption = req.body?.deliveryOption || "STANDARD";
    const couponCode = String(req.body?.couponCode || "").trim();

    const couponResult = couponCode
      ? await validateCouponForItems({
          couponCode,
          itemsTotal,
          couponItems,
          userId: req.user._id,
        })
      : null;

    const shippingQuote =
      shippingAddress?.division
        ? await getShippingQuote({
            division: shippingAddress.division,
            district: shippingAddress.district,
            itemsTotal,
            deliveryOption,
          })
        : null;

    const shippingFee = Number(shippingQuote?.shippingFee || 0);
    const discountTotal = Number(couponResult?.discountTotal || 0);

    return res.json({
      valid: true,
      coupon: couponResult
        ? {
            code: couponResult.couponApplied.code,
            discountAmount: discountTotal,
            type: couponResult.coupon.type,
            value: couponResult.coupon.value,
            minCartTotal: couponResult.coupon.minCartTotal || 0,
            maxDiscount: couponResult.coupon.maxDiscount || null,
            qualifyingSubtotal: Number(couponResult.qualifyingSubtotal || 0),
            discountBase: Number(couponResult.discountBase || 0),
            customerEligibility: couponResult.coupon.customerEligibility || "ALL",
            discountAppliesTo: couponResult.coupon.discountAppliesTo || "ELIGIBLE_ITEMS",
            perCustomerUsageLimit: Number(couponResult.coupon.perCustomerUsageLimit || 0),
          }
        : null,
      totals: {
        itemsTotal,
        shippingFee,
        discountTotal,
        grandTotal: itemsTotal + shippingFee - discountTotal,
      },
      shippingQuote,
    });
  } catch (e) {
    console.error("validateCoupon:", e);
    return res.status(e.statusCode || 500).json({
      valid: false,
      message: e.message || "Failed to validate coupon",
    });
  }
};

// GET /api/orders/my
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (e) {
    console.error("getMyOrders:", e);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// GET /api/orders/:orderNo
exports.getOrderByOrderNo = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo })
      .populate("user", "name email number")
      .populate("items.product", "slug name")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only owner or admin should see (assumes req.user.isAdmin)
    if (String(order.user?._id || order.user) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(order);
  } catch (e) {
    console.error("getOrderByOrderNo:", e);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};


// Admin: GET /api/admin/orders?status=all&page=1&limit=20&keyword=ORD
exports.adminGetOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 5000);
    const scope = String(req.query.scope || "").trim().toLowerCase();
    const from = parseAdminDate(req.query.from);
    const to = parseAdminDate(req.query.to, true);
    const dateRange = buildDateRangeFilter(from, to);
    const baseFilter = buildAdminOrderFilter(req.query, { skipDate: scope === "finance" });
    const filter = scope === "finance" ? await buildFinanceOrderFilter(req.query) : baseFilter;

    const financePaymentMatch =
      scope === "finance"
        ? {
            ...buildAdminOrderFilter(req.query, { skipDate: true }),
            ...(dateRange ? { "payment.paidAt": dateRange } : {}),
            "payment.status": { $in: COLLECTED_PAYMENT_STATUSES },
          }
        : null;

    const financeRefundMatch =
      scope === "finance"
        ? {
            status: "refunded",
            ...(dateRange ? { "refund.refundedAt": dateRange } : {}),
          }
        : null;

    const financeRefundOrderMatch =
      scope === "finance"
        ? prefixFilterPaths(buildAdminOrderFilter(req.query, { skipDate: true }), "orderDoc")
        : null;

    const [total, orders, summaryAgg, refundAgg, statusCountsAgg] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .populate("user", "name email number")
        .skip(limit * (page - 1))
        .limit(limit)
        .lean(),
      scope === "finance"
        ? Order.aggregate([
            { $match: financePaymentMatch },
            {
              $group: {
                _id: null,
                grossOrderValue: { $sum: "$pricing.grandTotal" },
                recognizedOrderCount: { $sum: 1 },
                recognizedSales: { $sum: "$pricing.grandTotal" },
                collectedOrderCount: { $sum: 1 },
                cashCollected: { $sum: "$pricing.grandTotal" },
                paidOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$payment.status", "paid"] }, 1, 0],
                  },
                },
                paidRevenue: {
                  $sum: {
                    $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.grandTotal", 0],
                  },
                },
              },
            },
          ])
        : Order.aggregate([
            { $match: filter },
            {
              $group: {
                _id: null,
                grossOrderValue: { $sum: "$pricing.grandTotal" },
                recognizedOrderCount: {
                  $sum: {
                    $cond: [buildRevenueExpr(), 1, 0],
                  },
                },
                recognizedSales: {
                  $sum: {
                    $cond: [buildRevenueExpr(), "$pricing.grandTotal", 0],
                  },
                },
                collectedOrderCount: {
                  $sum: {
                    $cond: [buildCollectedRevenueExpr(), 1, 0],
                  },
                },
                cashCollected: {
                  $sum: {
                    $cond: [buildCollectedRevenueExpr(), "$pricing.grandTotal", 0],
                  },
                },
                paidOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$payment.status", "paid"] }, 1, 0],
                  },
                },
                paidRevenue: {
                  $sum: {
                    $cond: [{ $eq: ["$payment.status", "paid"] }, "$pricing.grandTotal", 0],
                  },
                },
              },
            },
          ]),
      scope === "finance"
        ? ReturnRefund.aggregate([
            { $match: financeRefundMatch },
            {
              $lookup: {
                from: "orders",
                localField: "order",
                foreignField: "_id",
                as: "orderDoc",
              },
            },
            { $unwind: "$orderDoc" },
            ...(Object.keys(financeRefundOrderMatch || {}).length
              ? [{ $match: financeRefundOrderMatch }]
              : []),
            {
              $group: {
                _id: null,
                refundsIssued: {
                  $sum: { $ifNull: ["$refund.amount", 0] },
                },
              },
            },
          ])
        : Order.aggregate([
            { $match: filter },
            {
              $lookup: {
                from: "returnrefunds",
                localField: "_id",
                foreignField: "order",
                as: "refundRows",
              },
            },
            { $unwind: "$refundRows" },
            { $match: { "refundRows.status": "refunded" } },
            {
              $group: {
                _id: null,
                refundsIssued: {
                  $sum: { $ifNull: ["$refundRows.refund.amount", 0] },
                },
              },
            },
          ]),
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summaryRow = summaryAgg[0] || {};
    const refundsIssued = Number(refundAgg[0]?.refundsIssued || 0);
    const recognizedSales = Number(summaryRow.recognizedSales || 0);
    const cashCollected = Number(summaryRow.cashCollected || 0);
    const recognizedOrderCount = Number(summaryRow.recognizedOrderCount || 0);
    const statusCounts = statusCountsAgg.reduce((acc, row) => {
      acc[row._id || "unknown"] = Number(row.count || 0);
      return acc;
    }, {});

    let orderRefundRows = [];
    if (orders.length) {
      const orderIds = orders.map((row) => row._id);
      const refundFilter = {
        order: { $in: orderIds },
        status: "refunded",
      };
      if (scope === "finance" && dateRange) {
        refundFilter["refund.refundedAt"] = dateRange;
      }
      orderRefundRows = await ReturnRefund.find(refundFilter)
        .select("order refund.amount refund.refundedAt")
        .lean();
    }

    const refundsByOrder = orderRefundRows.reduce((acc, row) => {
      const key = String(row.order);
      const next = acc[key] || {
        refundsIssued: 0,
        refundEvents: 0,
        latestRefundedAt: null,
      };
      next.refundsIssued += Number(row?.refund?.amount || 0);
      next.refundEvents += 1;
      const refundedAt = row?.refund?.refundedAt ? new Date(row.refund.refundedAt) : null;
      if (refundedAt && !Number.isNaN(refundedAt.getTime())) {
        if (!next.latestRefundedAt || refundedAt > new Date(next.latestRefundedAt)) {
          next.latestRefundedAt = refundedAt.toISOString();
        }
      }
      acc[key] = next;
      return acc;
    }, {});

    const rows = orders.map((order) => {
      const refundMeta = refundsByOrder[String(order._id)] || {
        refundsIssued: 0,
        refundEvents: 0,
        latestRefundedAt: null,
      };
      const collectedAmount =
        String(order?.payment?.status || "").toLowerCase() === "failed"
          ? 0
          : scope === "finance"
          ? isWithinRange(order?.payment?.paidAt, from, to)
            ? Number(order?.pricing?.grandTotal || 0)
            : 0
          : ["paid", "partial_refund", "refunded"].includes(
              String(order?.payment?.status || "").toLowerCase()
            )
          ? Number(order?.pricing?.grandTotal || 0)
          : 0;

      return {
        ...order,
        finance: {
          collectedAt: order?.payment?.paidAt || null,
          collectedAmount,
          refundsIssued: refundMeta.refundsIssued,
          refundEvents: refundMeta.refundEvents,
          latestRefundedAt: refundMeta.latestRefundedAt,
          netRevenue: collectedAmount - refundMeta.refundsIssued,
        },
      };
    });

    res.json({
      orders: rows,
      page,
      pages: Math.ceil(total / limit),
      total,
      summary: {
        grossOrderValue: Number(summaryRow.grossOrderValue || 0),
        recognizedSales,
        cashCollected,
        refundsIssued,
        netRevenue: cashCollected - refundsIssued,
        averageRecognizedOrderValue:
          recognizedOrderCount > 0 ? recognizedSales / recognizedOrderCount : 0,
        paidOrders: Number(summaryRow.paidOrders || 0),
        paidRevenue: Number(summaryRow.paidRevenue || 0),
        totalRevenue: recognizedSales,
        averageOrderValue:
          recognizedOrderCount > 0 ? recognizedSales / recognizedOrderCount : 0,
        statusCounts,
      },
    });
  } catch (e) {
    console.error("adminGetOrders:", e);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// Admin: PUT /api/admin/orders/:orderNo/status
// body: { status, courier?, trackingId? }
exports.adminUpdateOrderStatus = async (req, res) => {
  try {
    const {
      status,
      courier,
      trackingId,
      trackingUrl,
      bookingRef,
      pickupDate,
      fulfillmentMode,
      courierStatus,
      courierStatusNote,
      notes,
    } = req.body;

    const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
    const nextStatus = String(status || "").toLowerCase().trim();
    if (!allowed.includes(nextStatus)) return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const current = String(order.status || "").toLowerCase();
    const nextList = allowedAdminTransitions[current] || [];
    if (nextStatus !== current && !nextList.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid status transition from ${current} to ${nextStatus}`,
      });
    }

    const payMethod = String(order?.payment?.method || "").toUpperCase();
    const payStatus = String(order?.payment?.status || "").toLowerCase();
    if (REVENUE_RECOGNIZED_STATUSES.includes(nextStatus) && PREPAID_METHODS.includes(payMethod) && payStatus !== "paid") {
      return res.status(400).json({
        message: "Prepaid order must be paid before confirmation/fulfillment",
      });
    }

    if (nextStatus === "processing" && current !== "confirmed") {
      return res.status(400).json({
        message: "Order must be confirmed before it can move to processing",
      });
    }

    if (STOCK_DEDUCTION_STATUSES.includes(nextStatus) && !order?.inventory?.deducted) {
      await deductOrderItems(order);
    }

    // If cancelling a not-yet-delivered order, restock it
    if (nextStatus === "cancelled" && current !== "cancelled") {
      await restockOrderItems(order);
      await ensureRefundRequestForCancelledPaidOrder(
        order,
        `Auto-created refund request after admin cancelled order ${order.orderNo}`
      );
    }

    order.status = nextStatus;

    const { nextCourier, nextTrackingId } = applyShipmentAdminFields({
      order,
      courier,
      trackingId,
      trackingUrl,
      bookingRef,
      pickupDate,
      fulfillmentMode,
      notes,
    });

    if (nextStatus === "shipped" && (!nextCourier || !nextTrackingId)) {
      return res.status(400).json({
        message: "Courier and tracking ID are required before marking as shipped",
      });
    }

    if (nextStatus === "shipped" && !order.shipment.shippedAt) {
      order.shipment.shippedAt = new Date();
    }
    if (nextStatus === "shipped") {
      order.shipment.pickupDate = order.shipment.shippedAt || new Date();
      if (!courierStatus) {
        syncCourierStatus(order, "BOOKED", "", "system");
      }
    }
    if (nextStatus === "shipped" && !order.shipment.expectedDeliveryDate) {
      const fallbackDays = Number(order.shipment?.estimatedDaysMax || 4);
      order.shipment.expectedDeliveryDate = addDays(
        order.shipment.shippedAt || new Date(),
        fallbackDays
      );
    }

    if (courierStatus) {
      validateCourierStatusForWorkflow(nextStatus, courierStatus);
    }

    if (nextStatus === "delivered") {
      order.shipment.deliveredAt = new Date();
      syncCourierStatus(order, courierStatus || "DELIVERED", courierStatusNote, courierStatus ? "admin" : "system");
      if (order.payment?.method === "COD") {
        order.payment.status = "paid";
        order.payment.paidAt = new Date();
      }
    }

    if (courierStatus && nextStatus !== "delivered") {
      syncCourierStatus(order, courierStatus, courierStatusNote, "admin");
    }

    syncInternalShipmentEvent(order, nextStatus);

    if (nextStatus === "returned") {
      const returnReason = "admin_marked_returned_in_orders";
      const rr = await ReturnRefund.findOne({ order: order._id });

      if (!rr) {
        await ReturnRefund.create({
          order: order._id,
          user: order.user,
          items: buildReturnItemsFromOrder(order, returnReason),
          status: "requested",
          customerRefundPreference: {
            issueType: "OTHER",
            reason: "Marked returned by admin from orders section",
            refundTimeOption: "WITHIN_7_DAYS",
          },
          notes: `Auto-created from order status update by admin ${req.user?._id || ""}`.trim(),
        });
      }
    }

    recomputeGrandTotal(order);
    const updated = await order.save();
    res.json(updated);
  } catch (e) {
    console.error("adminUpdateOrderStatus:", e);
    res.status(e.statusCode || 500).json({ message: e.message || "Failed to update order status" });
  }
};

// Admin: PATCH /api/admin/orders/:orderNo/shipment
// body: { courierStatus?, courierStatusNote?, courier?, trackingId?, ... }
exports.adminUpdateShipment = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const {
      courier,
      trackingId,
      trackingUrl,
      bookingRef,
      pickupDate,
      fulfillmentMode,
      courierStatus,
      courierStatusNote,
      notes,
    } = req.body;

    applyShipmentAdminFields({
      order,
      courier,
      trackingId,
      trackingUrl,
      bookingRef,
      pickupDate,
      fulfillmentMode,
      notes,
    });

    if (courierStatus) {
      validateCourierStatusForWorkflow(order.status, courierStatus);
    }

    if (courierStatus) {
      syncCourierStatus(order, courierStatus, courierStatusNote, "admin");
    } else if (typeof courierStatusNote === "string" && order.shipment?.courierStatus) {
      order.shipment.courierStatusNote = courierStatusNote.trim();
      order.shipment.courierStatusUpdatedAt = new Date();
    }

    const updated = await order.save();
    return res.json(updated);
  } catch (e) {
    console.error("adminUpdateShipment:", e);
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to update shipment" });
  }
};

// Admin: POST /api/admin/orders/:orderNo/dispatch
// body: { courierProvider?: "demo" }
exports.adminDispatchOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const st = String(order.status || "").toLowerCase();
    if (st !== "processing") {
      return res.status(400).json({
        message: "Only processing orders can be dispatched",
      });
    }
    const payMethod = String(order?.payment?.method || "").toUpperCase();
    const payStatus = String(order?.payment?.status || "").toLowerCase();
    if (PREPAID_METHODS.includes(payMethod) && payStatus !== "paid") {
      return res.status(400).json({
        message: "Prepaid order must be paid before dispatch",
      });
    }

    const provider = getCourierProvider(req.body?.courierProvider);
    const shipment = await provider.createShipment({ order });
    if (!shipment?.courier || !shipment?.trackingId) {
      return res.status(502).json({ message: "Courier provider failed to generate shipment" });
    }

    if (!order?.inventory?.deducted) {
      await deductOrderItems(order);
    }

    order.shipment = order.shipment || {};
    order.shipment.courier = String(shipment.courier || "").trim();
    order.shipment.trackingId = String(shipment.trackingId || "").trim();
    order.shipment.trackingUrl = String(shipment.trackingUrl || "").trim();
    order.shipment.bookingRef = String(shipment.bookingRef || "").trim();
    order.shipment.fulfillmentMode = "THIRD_PARTY_COURIER";
    order.shipment.courierCharge = Number(order?.pricing?.shippingFee || 0);
    const now = new Date();
    order.shipment.shippedAt = now;
    order.shipment.pickupDate = now; // dispatch pickup and shipped timestamp are aligned
    const etaDays = Number(order.shipment?.estimatedDaysMax || 4);
    order.shipment.expectedDeliveryDate = addDays(now, etaDays);
    syncCourierStatus(order, "BOOKED", `${provider.name} shipment booked`, "courier");

    order.status = "shipped";
    syncInternalShipmentEvent(order, "shipped");
    recomputeGrandTotal(order);
    const updated = await order.save();
    return res.json({
      provider: provider.name,
      shipment: updated.shipment,
      order: updated,
    });
  } catch (e) {
    console.error("adminDispatchOrder:", e);
    return res.status(500).json({ message: "Failed to dispatch order" });
  }
};

// Admin: DELETE /api/admin/orders/:orderNo
exports.adminDeleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const st = String(order.status || "").toLowerCase();
    if (!["cancelled", "returned"].includes(st)) {
      return res.status(400).json({
        message: "Only cancelled or returned orders can be deleted",
      });
    }

    await ReturnRefund.deleteMany({ order: order._id });
    await InventoryLedger.deleteMany({ order: order._id });
    await Order.deleteOne({ _id: order._id });

    return res.json({ message: `Order ${order.orderNo} deleted` });
  } catch (e) {
    console.error("adminDeleteOrder:", e);
    return res.status(500).json({ message: "Failed to delete order" });
  }
};

// User: POST /api/orders/:orderNo/cancel
exports.cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!canCancelByCustomer(order.status)) {
      return res.status(400).json({
        message: "Order can only be cancelled before shipping",
      });
    }

    await restockOrderItems(order);
    order.status = "cancelled";
    order.notes = [order.notes, "Cancelled by customer"].filter(Boolean).join(" | ");
    syncInternalShipmentEvent(order, "cancelled");
    await ensureRefundRequestForCancelledPaidOrder(
      order,
      `Auto-created refund request after customer cancelled order ${order.orderNo}`
    );
    await order.save();

    return res.json(order);
  } catch (e) {
    console.error("cancelMyOrder:", e);
    return res.status(500).json({ message: "Failed to cancel order" });
  }
};

// User: POST /api/orders/:orderNo/confirm-delivery
exports.confirmMyDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!canConfirmDeliveryByCustomer(order.status)) {
      return res.status(400).json({
        message: "Only shipped orders can be marked delivered by customer",
      });
    }

    order.status = "delivered";
    order.shipment = order.shipment || {};
    order.shipment.deliveredAt = new Date();
    syncCourierStatus(order, "DELIVERED", "Delivery confirmed by customer", "customer");
    syncInternalShipmentEvent(order, "delivered");
    if (order.payment?.method === "COD" && order.payment?.status !== "paid") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
    }
    await order.save();
    return res.json(order);
  } catch (e) {
    console.error("confirmMyDelivery:", e);
    return res.status(500).json({ message: "Failed to confirm delivery" });
  }
};

// User: POST /api/orders/:orderNo/refund
// body/form-data: { issueType, reason, refundTimeOption, notes?, evidenceImages[]? }
exports.requestMyRefund = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!canRequestRefund(order.status, order.payment?.status)) {
      return res.status(400).json({
        message: "Refund request is only allowed for paid delivered/cancelled orders",
      });
    }

    const existing = await ReturnRefund.findOne({
      order: order._id,
      user: req.user._id,
      status: { $in: ["requested", "approved", "picked", "received"] },
    });
    if (existing) {
      return res.status(400).json({ message: "A refund request already exists for this order" });
    }

    const issueType = normalizeRefundIssueType(req.body?.issueType, "");
    if (!issueType) {
      return res.status(400).json({ message: "Please choose a valid refund issue type" });
    }

    const reason = String(req.body?.reason || "").trim();
    const refundTimeOption = String(req.body?.refundTimeOption || "")
      .trim()
      .toUpperCase();
    if (!reason) {
      return res.status(400).json({ message: "Refund reason is required" });
    }
    if (!REFUND_TIME_OPTIONS.includes(refundTimeOption)) {
      return res.status(400).json({
        message: "Please choose a valid refund time option",
      });
    }
    if (
      EVIDENCE_REQUIRED_ISSUE_TYPES.has(issueType) &&
      (!Array.isArray(req.files) || req.files.length === 0)
    ) {
      return res.status(400).json({
        message: "Photo evidence is required for this refund issue type",
      });
    }
    const notes = String(req.body?.notes || "").trim();
    const evidenceImages = await uploadRefundEvidenceFiles(req.files);
    const items = (order.items || []).map((it) => ({
      product: it.product,
      variantId: it.variantId,
      qty: it.qty,
      reason,
    }));

    const rr = await ReturnRefund.create({
      order: order._id,
      user: req.user._id,
      items,
      status: "requested",
      evidenceImages,
      customerRefundPreference: {
        issueType,
        reason,
        refundTimeOption,
      },
      notes: notes || `Refund requested by customer for ${order.orderNo}`,
    });

    return res.status(201).json(rr);
  } catch (e) {
    console.error("requestMyRefund:", e);
    return res.status(500).json({ message: "Failed to request refund" });
  }
};

// Admin: GET /api/admin/orders/notifications?since=ISO_DATE&limit=10
exports.adminGetOrderNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const sinceRaw = req.query.since;

    const filter = {};
    if (sinceRaw) {
      const sinceDate = new Date(sinceRaw);
      if (!Number.isNaN(sinceDate.getTime())) {
        filter.createdAt = { $gt: sinceDate };
      }
    }

    const newOrders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .select("orderNo createdAt pricing.grandTotal shippingAddress status")
      .limit(limit)
      .lean();

    res.json({
      count: newOrders.length,
      orders: newOrders,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    console.error("adminGetOrderNotifications:", e);
    res.status(500).json({ message: "Failed to fetch order notifications" });
  }
};
