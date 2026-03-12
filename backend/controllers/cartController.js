// controllers/cartController.js
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const {
  releaseExpiredReservations,
  getReservedQtyMap,
  getAvailableStock,
} = require("../services/stockReservationService");
const { getVisitorKey } = require("../utils/visitorKey");

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

const buildSnapshots = (product, variant) => ({
  nameSnapshot: product?.name || "",
  skuSnapshot: variant?.sku || "",
  imageSnapshot: getVariantImage(variant),
});

const applyCartVisitorKey = (cart, req) => {
  const visitorKey = getVisitorKey(req);
  if (!visitorKey || !cart) return;
  cart.analytics = cart.analytics || {};
  cart.analytics.visitorKey = visitorKey;
};

exports.getMyCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product", "name slug basePrice variants brand category")
      .lean();

    return res.json(cart || { user: req.user._id, items: [] });
  } catch (e) {
    console.error("getMyCart:", e);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

// body: { productId, variantId, qty }
exports.addToCart = async (req, res) => {
  try {
    await releaseExpiredReservations();

    const { productId, variantId, qty } = req.body;
    const Q = toNum(qty, 1);
    if (!productId || !variantId || Q < 1) {
      return res.status(400).json({ message: "productId, variantId, qty are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const reservedMap = await getReservedQtyMap({
      pairs: [{ productId, variantId }],
      now: new Date(),
    });
    const key = `${String(product._id)}|${String(variant._id)}`;
    const reservedQty = Number(reservedMap.get(key) || 0);
    const availableStock = getAvailableStock({
      physicalStock: variant.countInStock,
      reservedQty,
    });

    if (availableStock < Q) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
    applyCartVisitorKey(cart, req);

    const existing = cart.items.find(
      (it) => String(it.product) === String(productId) && String(it.variantId) === String(variantId)
    );

    if (existing) {
      const newQty = existing.qty + Q;
      if (availableStock < newQty) {
        return res.status(400).json({ message: "Not enough stock for requested quantity" });
      }
      existing.qty = newQty;
      existing.priceAtAdd = variant.price;
      const snapshots = buildSnapshots(product, variant);
      existing.nameSnapshot = snapshots.nameSnapshot;
      existing.skuSnapshot = snapshots.skuSnapshot;
      existing.imageSnapshot = snapshots.imageSnapshot;
    } else {
      const snapshots = buildSnapshots(product, variant);
      cart.items.push({
        product: productId,
        variantId,
        qty: Q,
        priceAtAdd: variant.price,
        ...snapshots,
      });
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (e) {
    console.error("addToCart:", e);
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// body: { qty }
exports.updateCartItemQty = async (req, res) => {
  try {
    await releaseExpiredReservations();

    const { qty } = req.body;
    const Q = toNum(qty, 1);
    if (Q < 1) return res.status(400).json({ message: "qty must be >= 1" });

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    applyCartVisitorKey(cart, req);

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    const product = await Product.findById(item.product);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(item.variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const reservedMap = await getReservedQtyMap({
      pairs: [{ productId: item.product, variantId: item.variantId }],
      now: new Date(),
    });
    const key = `${String(product._id)}|${String(variant._id)}`;
    const reservedQty = Number(reservedMap.get(key) || 0);
    const availableStock = getAvailableStock({
      physicalStock: variant.countInStock,
      reservedQty,
    });
    if (availableStock < Q) return res.status(400).json({ message: "Not enough stock" });

    item.qty = Q;
    item.priceAtAdd = variant.price;
    const snapshots = buildSnapshots(product, variant);
    item.nameSnapshot = snapshots.nameSnapshot;
    item.skuSnapshot = snapshots.skuSnapshot;
    item.imageSnapshot = snapshots.imageSnapshot;

    await cart.save();
    res.json(cart);
  } catch (e) {
    console.error("updateCartItemQty:", e);
    res.status(500).json({ message: "Failed to update cart item" });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    applyCartVisitorKey(cart, req);

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    item.deleteOne();
    await cart.save();

    res.json(cart);
  } catch (e) {
    console.error("removeCartItem:", e);
    res.status(500).json({ message: "Failed to remove cart item" });
  }
};

exports.clearMyCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.json({ message: "Cart already empty" });
    applyCartVisitorKey(cart, req);

    cart.items = [];
    await cart.save();

    res.json({ message: "Cart cleared" });
  } catch (e) {
    console.error("clearMyCart:", e);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};
