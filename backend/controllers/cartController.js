// controllers/cartController.js
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
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
    const { productId, variantId, qty } = req.body;
    const Q = toNum(qty, 1);
    if (!productId || !variantId || Q < 1) {
      return res.status(400).json({ message: "productId, variantId, qty are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    if (variant.countInStock < Q) {
      return res.status(400).json({ message: "Not enough stock" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const existing = cart.items.find(
      (it) => String(it.product) === String(productId) && String(it.variantId) === String(variantId)
    );

    if (existing) {
      const newQty = existing.qty + Q;
      if (variant.countInStock < newQty) {
        return res.status(400).json({ message: "Not enough stock for requested quantity" });
      }
      existing.qty = newQty;
      existing.priceAtAdd = variant.price;
    } else {
      cart.items.push({
        product: productId,
        variantId,
        qty: Q,
        priceAtAdd: variant.price,
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
    const { qty } = req.body;
    const Q = toNum(qty, 1);
    if (Q < 1) return res.status(400).json({ message: "qty must be >= 1" });

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    const product = await Product.findById(item.product);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(item.variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    if (variant.countInStock < Q) return res.status(400).json({ message: "Not enough stock" });

    item.qty = Q;
    item.priceAtAdd = variant.price;

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

    cart.items = [];
    await cart.save();

    res.json({ message: "Cart cleared" });
  } catch (e) {
    console.error("clearMyCart:", e);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};
