const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const User = require("../models/userModel");
const Settings = require("../models/Settings");
const generateOrderNo = require("../utils/orderNo");
const {
  PREPAID_METHODS,
  getReservedQtyMap,
  getAvailableStock,
  getReservationUntil,
} = require("./stockReservationService");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const getVariantImage = (variant) => {
  const first = Array.isArray(variant?.images) ? variant.images[0] : null;
  if (!first) return DEFAULT_IMAGE_URL;
  const url = typeof first === "string" ? first : first.url || "";
  return url || DEFAULT_IMAGE_URL;
};

const normalizeCouponType = (value) => {
  const type = String(value || "").toUpperCase().trim();
  return type === "FLAT" ? "FIXED" : type;
};

const getShippingConfig = async ({ session }) => {
  const defaultShipping = {
    insideDhaka: 60,
    outsideDhaka: 100,
    freeShippingThreshold: 0,
    expressExtraInsideDhaka: 80,
    expressExtraOutsideDhaka: 120,
    regionalOverrides: [],
  };

  const settingsQuery = Settings.findOne({ key: "default" }).lean();
  if (session) {
    settingsQuery.session(session);
  }
  const settingsDoc = await settingsQuery;

  const insideDhaka = Math.max(
    0,
    toNum(settingsDoc?.shipping?.insideDhaka, defaultShipping.insideDhaka)
  );
  const outsideDhaka = Math.max(
    0,
    toNum(settingsDoc?.shipping?.outsideDhaka, defaultShipping.outsideDhaka)
  );
  const freeShippingThreshold = Math.max(
    0,
    toNum(settingsDoc?.shipping?.freeShippingThreshold, defaultShipping.freeShippingThreshold)
  );
  const expressExtraInsideDhaka = Math.max(
    0,
    toNum(
      settingsDoc?.shipping?.expressExtraInsideDhaka,
      defaultShipping.expressExtraInsideDhaka
    )
  );
  const expressExtraOutsideDhaka = Math.max(
    0,
    toNum(
      settingsDoc?.shipping?.expressExtraOutsideDhaka,
      defaultShipping.expressExtraOutsideDhaka
    )
  );
  const regionalOverrides = Array.isArray(settingsDoc?.shipping?.regionalOverrides)
    ? settingsDoc.shipping.regionalOverrides
    : defaultShipping.regionalOverrides;

  return {
    insideDhaka,
    outsideDhaka,
    freeShippingThreshold,
    expressExtraInsideDhaka,
    expressExtraOutsideDhaka,
    regionalOverrides,
  };
};

const getShippingQuote = async ({
  division,
  district,
  itemsTotal = 0,
  deliveryOption = "STANDARD",
  session,
}) => {
  const config = await getShippingConfig({ session });
  const normalizedDivision = String(division || "").trim().toLowerCase();
  const normalizedDistrict = String(district || "").trim().toLowerCase();
  const isDhaka = normalizedDivision === "dhaka";
  const normalizedOption = String(deliveryOption || "STANDARD").toUpperCase();

  const override = (config.regionalOverrides || []).find((row) => {
    const rowDivision = String(row?.division || "").trim().toLowerCase();
    const rowDistrict = String(row?.district || "").trim().toLowerCase();
    if (!rowDivision) return false;
    if (rowDistrict) {
      return rowDivision === normalizedDivision && rowDistrict === normalizedDistrict;
    }
    return rowDivision === normalizedDivision;
  });
  const baseShippingFee = Number.isFinite(Number(override?.fee))
    ? Math.max(0, Number(override.fee))
    : isDhaka
    ? config.insideDhaka
    : config.outsideDhaka;
  const expressExtra = normalizedOption === "EXPRESS"
    ? (isDhaka ? config.expressExtraInsideDhaka : config.expressExtraOutsideDhaka)
    : 0;
  const shippingFee = baseShippingFee + expressExtra;

  let estimatedDaysMin = 2;
  let estimatedDaysMax = 4;
  if (!isDhaka) {
    estimatedDaysMin = 3;
    estimatedDaysMax = 6;
  }
  if (normalizedOption === "EXPRESS") {
    estimatedDaysMin = Math.max(1, estimatedDaysMin - 1);
    estimatedDaysMax = Math.max(2, estimatedDaysMax - 2);
  }

  return {
    serviceable: true,
    deliveryOption: normalizedOption === "EXPRESS" ? "EXPRESS" : "STANDARD",
    shippingFee,
    estimatedDaysMin,
    estimatedDaysMax,
    appliedFreeShipping: false,
    freeShippingThreshold: config.freeShippingThreshold,
  };
};

const validateCouponForItems = async ({
  couponCode,
  itemsTotal,
  productIds = [],
  categoryIds = [],
  session,
}) => {
  const code = String(couponCode || "").toUpperCase().trim();
  if (!code) return null;

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

  const applicableProducts = (coupon.applicableProducts || []).map((id) => String(id));
  const applicableCategories = (coupon.applicableCategories || []).map((id) => String(id));
  const hasProductScope = applicableProducts.length > 0;
  const hasCategoryScope = applicableCategories.length > 0;

  if (hasProductScope || hasCategoryScope) {
    const productMatch = productIds.some((id) => applicableProducts.includes(String(id)));
    const categoryMatch = categoryIds.some((id) => applicableCategories.includes(String(id)));
    if (!productMatch && !categoryMatch) {
      const err = new Error("Coupon is not applicable to the items in your cart");
      err.statusCode = 400;
      throw err;
    }
  }

  let discountTotal = 0;
  const couponType = normalizeCouponType(coupon.type);
  if (couponType === "PERCENT") {
    discountTotal = (itemsTotal * coupon.value) / 100;
    if (coupon.maxDiscount) {
      discountTotal = Math.min(discountTotal, coupon.maxDiscount);
    }
  } else {
    discountTotal = coupon.value;
  }

  discountTotal = Math.min(discountTotal, itemsTotal);

  return {
    coupon,
    discountTotal,
    couponApplied: {
      couponId: coupon._id,
      code: coupon.code,
      discountAmount: discountTotal,
    },
  };
};

const applyCouponUsageIfNeeded = async ({ order, session }) => {
  if (!order?.coupon?.couponId || order?.coupon?.usageCountedAt) return order;

  const coupon = await Coupon.findById(order.coupon.couponId).session(session);
  if (!coupon) return order;

  coupon.usedCount = (coupon.usedCount || 0) + 1;
  await coupon.save({ session });

  order.coupon.usageCountedAt = new Date();
  await order.save({ session });
  return order;
};

const createOrderFromCartForUser = async ({
  userId,
  shippingAddress,
  paymentMethod,
  couponCode,
  paymentProvider,
  deliveryOption,
  visitorKey,
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
  const productIds = [];
  const categoryIds = [];
  const requestedPairs = cart.items.map((ci) => ({
    productId: ci.product,
    variantId: ci.variantId,
  }));
  const reservedMap = await getReservedQtyMap({ pairs: requestedPairs, now: new Date() });

  for (const ci of cart.items) {
    const product = await Product.findById(ci.product).session(session);
    if (!product) throw new Error("Product not found during checkout");

    const variant = product.variants.id(ci.variantId);
    if (!variant) throw new Error("Variant not found during checkout");

    const key = `${String(product._id)}|${String(variant._id)}`;
    const reservedQty = Number(reservedMap.get(key) || 0);
    const availableStock = getAvailableStock({
      physicalStock: variant.countInStock,
      reservedQty,
    });

    if (availableStock < ci.qty) {
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
      imageSnapshot: getVariantImage(variant),
      qty: ci.qty,
      price: unitPrice,
    });

    productIds.push(product._id);
    if (product.category) {
      categoryIds.push(product.category);
    }
    itemsTotal += unitPrice * ci.qty;
  }

  let discountTotal = 0;
  let couponApplied = null;

  if (couponCode) {
    const couponResult = await validateCouponForItems({
      couponCode,
      itemsTotal,
      productIds,
      categoryIds,
      session,
    });
    discountTotal = couponResult.discountTotal;
    couponApplied = couponResult.couponApplied;
  }

  const shippingQuote = await getShippingQuote({
    division: shippingAddress?.division,
    district: shippingAddress?.district,
    itemsTotal,
    deliveryOption,
    session,
  });
  const shippingFee = shippingQuote.shippingFee;
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
    inventory: {
      reservationActive: true,
      reservedUntil: PREPAID_METHODS.includes(String(paymentMethod || "").toUpperCase())
        ? getReservationUntil()
        : undefined,
    },
    shipment: {
      deliveryOption: shippingQuote.deliveryOption,
      estimatedDaysMin: shippingQuote.estimatedDaysMin,
      estimatedDaysMax: shippingQuote.estimatedDaysMax,
      quote: {
        serviceable: shippingQuote.serviceable,
        appliedFreeShipping: shippingQuote.appliedFreeShipping,
        freeShippingThreshold: shippingQuote.freeShippingThreshold,
      },
    },
    analytics: {
      visitorKey: String(visitorKey || "").trim(),
    },
  }], { session });

  const createdOrder = order[0];

  if (!PREPAID_METHODS.includes(String(paymentMethod || "").toUpperCase())) {
    await applyCouponUsageIfNeeded({ order: createdOrder, session });
  }

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

  // Clear cart
  cart.items = [];
  await cart.save({ session });

  return createdOrder;
};

module.exports = {
  createOrderFromCartForUser,
  getShippingQuote,
  validateCouponForItems,
  applyCouponUsageIfNeeded,
};
