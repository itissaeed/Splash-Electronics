// controllers/orderController.js
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const InventoryLedger = require("../models/InventoryLedger");
const Coupon = require("../models/Coupon");
const generateOrderNo = require("../utils/orderNo");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

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

    const cart = await Cart.findOne({ user: req.user._id }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Build order items + stock validation
    const orderItems = [];
    let itemsTotal = 0;

    for (const ci of cart.items) {
      const product = await Product.findById(ci.product).session(session);
      if (!product) throw new Error("Product not found during checkout");

      const variant = product.variants.id(ci.variantId);
      if (!variant) throw new Error("Variant not found during checkout");

      if (variant.countInStock < ci.qty) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Not enough stock for ${product.name} (${variant.sku})` });
      }

      const unitPrice = toNum(variant.price, ci.priceAtAdd);

      orderItems.push({
        product: product._id,
        variantId: variant._id,
        nameSnapshot: product.name,
        skuSnapshot: variant.sku,
        imageSnapshot: variant.images?.[0]?.url || product.images?.[0]?.url || "",
        qty: ci.qty,
        price: unitPrice,
      });

      itemsTotal += unitPrice * ci.qty;
    }

    // Coupon apply (simple cart-level discount)
    let discountTotal = 0;
    let couponApplied = null;

    if (couponCode) {
      const code = String(couponCode).toUpperCase().trim();
      const coupon = await Coupon.findOne({ code, isActive: true }).session(session);

      if (!coupon) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid coupon" });
      }

      const now = Date.now();
      if (coupon.validFrom && now < new Date(coupon.validFrom).getTime()) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Coupon not active yet" });
      }
      if (coupon.validTo && now > new Date(coupon.validTo).getTime()) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Coupon expired" });
      }
      if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Coupon usage limit reached" });
      }
      if (itemsTotal < (coupon.minCartTotal || 0)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Cart total too low for this coupon" });
      }

      if (coupon.type === "PERCENT") {
        discountTotal = (itemsTotal * coupon.value) / 100;
        if (coupon.maxDiscount) discountTotal = Math.min(discountTotal, coupon.maxDiscount);
      } else {
        discountTotal = coupon.value;
      }

      discountTotal = Math.min(discountTotal, itemsTotal);
      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await coupon.save({ session });

      couponApplied = { code: coupon.code, discountAmount: discountTotal };
    }

    const shippingFee = 0; // you can calculate based on division/district later
    const grandTotal = itemsTotal + shippingFee - discountTotal;

    const orderNo = generateOrderNo();

    const order = await Order.create([{
      orderNo,
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      payment: {
        method: paymentMethod || "COD",
        status: paymentMethod === "COD" ? "unpaid" : "unpaid",
      },
      pricing: {
        itemsTotal,
        shippingFee,
        discountTotal,
        grandTotal,
      },
      coupon: couponApplied || undefined,
      status: "pending",
    }], { session });

    const createdOrder = order[0];

    // Stock OUT + Ledger entries
    for (const oi of orderItems) {
      const product = await Product.findById(oi.product).session(session);
      const variant = product.variants.id(oi.variantId);

      variant.countInStock -= oi.qty;
      await product.save({ session });

      await InventoryLedger.create([{
        product: oi.product,
        variantId: oi.variantId,
        type: "OUT",
        reason: "SALE",
        qty: oi.qty,
        order: createdOrder._id,
        note: `Order ${createdOrder.orderNo}`,
      }], { session });
    }

    // Clear cart
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    res.status(201).json(createdOrder);

  } catch (e) {
    console.error("createOrderFromCart:", e);
    await session.abortTransaction();
    res.status(500).json({ message: "Failed to create order" });
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

// Admin: GET /api/admin/orders?status=
exports.adminGetOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email number")
      .lean();

    res.json(orders);
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
