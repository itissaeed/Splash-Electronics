const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const InventoryLedger = require("../models/InventoryLedger");
const Coupon = require("../models/Coupon");
const User = require("../models/userModel");
const generateOrderNo = require("../utils/orderNo");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const createOrderFromCartForUser = async ({
  userId,
  shippingAddress,
  paymentMethod,
  couponCode,
  paymentProvider,
  session,
}) => {
  const user = await User.findById(userId).session(session);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const cart = await Cart.findOne({ user: userId }).session(session);
  if (!cart || cart.items.length === 0) {
    const err = new Error("Cart is empty");
    err.statusCode = 400;
    throw err;
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
      const err = new Error(`Not enough stock for ${product.name} (${variant.sku})`);
      err.statusCode = 400;
      throw err;
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
      const err = new Error("Invalid coupon");
      err.statusCode = 400;
      throw err;
    }

    const now = Date.now();
    if (coupon.validFrom && now < new Date(coupon.validFrom).getTime()) {
      const err = new Error("Coupon not active yet");
      err.statusCode = 400;
      throw err;
    }
    if (coupon.validTo && now > new Date(coupon.validTo).getTime()) {
      const err = new Error("Coupon expired");
      err.statusCode = 400;
      throw err;
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      const err = new Error("Coupon usage limit reached");
      err.statusCode = 400;
      throw err;
    }
    if (itemsTotal < (coupon.minCartTotal || 0)) {
      const err = new Error("Cart total too low for this coupon");
      err.statusCode = 400;
      throw err;
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
    user: userId,
    items: orderItems,
    shippingAddress,
    payment: {
      method: paymentMethod || "COD",
      status: "unpaid",
      provider: paymentProvider || undefined,
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

  const normalizedAddress = {
    label: "Default",
    recipientName: shippingAddress.recipientName || user.name || "Customer",
    phone: shippingAddress.phone || user.number,
    division: shippingAddress.division,
    district: shippingAddress.district,
    upazila: shippingAddress.upazila || "",
    area: shippingAddress.area || "",
    postalCode: shippingAddress.postalCode || "",
    addressLine1: shippingAddress.addressLine1,
    addressLine2: shippingAddress.addressLine2 || "",
    isDefault: true,
  };

  const addressKey = [
    normalizedAddress.division,
    normalizedAddress.district,
    normalizedAddress.upazila,
    normalizedAddress.area,
    normalizedAddress.postalCode,
    normalizedAddress.addressLine1,
  ]
    .map((v) => String(v || "").trim().toLowerCase())
    .join("|");

  const existingIndex = (user.addresses || []).findIndex((addr) => {
    const key = [
      addr.division,
      addr.district,
      addr.upazila,
      addr.area,
      addr.postalCode,
      addr.addressLine1,
    ]
      .map((v) => String(v || "").trim().toLowerCase())
      .join("|");
    return key === addressKey;
  });

  if (user.addresses?.length) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  if (existingIndex >= 0) {
    user.addresses[existingIndex] = {
      ...user.addresses[existingIndex].toObject?.() || user.addresses[existingIndex],
      ...normalizedAddress,
      isDefault: true,
    };
  } else {
    user.addresses = user.addresses || [];
    user.addresses.push(normalizedAddress);
  }

  await user.save({ session });

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

  return createdOrder;
};

module.exports = {
  createOrderFromCartForUser,
};
