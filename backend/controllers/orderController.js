// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const InventoryLedger = require("../models/InventoryLedger");
const { createOrderFromCartForUser } = require("../services/orderService");

// POST /api/orders
// body: { shippingAddress, paymentMethod, couponCode? }
exports.createOrderFromCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;

    if (!shippingAddress?.division || !shippingAddress?.district || !shippingAddress?.addressLine1) {
      await session.abortTransaction();
      return res.status(400).json({ message: "shippingAddress (division, district, addressLine1) required" });
    }
    const createdOrder = await createOrderFromCartForUser({
      userId: req.user._id,
      shippingAddress,
      paymentMethod: paymentMethod || "COD",
      couponCode,
      session,
    });

    await session.commitTransaction();
    res.status(201).json(createdOrder);

  } catch (e) {
    console.error("createOrderFromCart:", e);
    await session.abortTransaction();
    const statusCode = e.statusCode || 500;
    res.status(statusCode).json({ message: e.message || "Failed to create order" });
  } finally {
    session.endSession();
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
    const limit = Number(req.query.limit) || 20;

    const filter = {};

    // Status filter
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Keyword filter (orderNo / phone / district / division / user email)
    const keyword = String(req.query.keyword || "").trim();
    if (keyword) {
      filter.$or = [
        { orderNo: { $regex: keyword, $options: "i" } },
        { "shippingAddress.phone": { $regex: keyword, $options: "i" } },
        { "shippingAddress.district": { $regex: keyword, $options: "i" } },
        { "shippingAddress.division": { $regex: keyword, $options: "i" } },
      ];
    }

    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email number")
      .skip(limit * (page - 1))
      .limit(limit)
      .lean();

    res.json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      total,
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
    const { status, courier, trackingId } = req.body;

    const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findOne({ orderNo: req.params.orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // If cancelling a not-yet-delivered order, restock it
    if (status === "cancelled" && order.status !== "cancelled") {
      // Restock
      for (const it of order.items) {
        const product = await Product.findById(it.product);
        const variant = product.variants.id(it.variantId);
        if (variant) {
          variant.countInStock += it.qty;
          await product.save();
        }
        await InventoryLedger.create({
          product: it.product,
          variantId: it.variantId,
          type: "IN",
          reason: "CANCELLED_ORDER",
          qty: it.qty,
          order: order._id,
          note: `Cancelled order ${order.orderNo}`,
        });
      }
    }

    order.status = status;

    if (status === "shipped") {
      order.shipment = order.shipment || {};
      order.shipment.courier = courier || order.shipment.courier;
      order.shipment.trackingId = trackingId || order.shipment.trackingId;
      order.shipment.shippedAt = new Date();
    }

    if (status === "delivered") {
      order.shipment = order.shipment || {};
      order.shipment.deliveredAt = new Date();
      if (order.payment?.method === "COD") {
        order.payment.status = "paid";
        order.payment.paidAt = new Date();
      }
    }

    const updated = await order.save();
    res.json(updated);
  } catch (e) {
    console.error("adminUpdateOrderStatus:", e);
    res.status(500).json({ message: "Failed to update order status" });
  }
};
