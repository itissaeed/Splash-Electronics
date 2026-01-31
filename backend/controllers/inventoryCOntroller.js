// controllers/inventoryController.js
const Product = require("../models/Product");
const InventoryLedger = require("../models/InventoryLedger");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// Admin: POST /api/admin/inventory/in
// body: { productId, variantId, qty, unitCost?, note? }
exports.stockIn = async (req, res) => {
  try {
    const { productId, variantId, qty, unitCost, note } = req.body;
    const Q = toNum(qty, 0);
    if (!productId || !variantId || Q <= 0) return res.status(400).json({ message: "productId, variantId, qty>0 required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    variant.countInStock += Q;
    await product.save();

    const ledger = await InventoryLedger.create({
      product: productId,
      variantId,
      type: "IN",
      reason: "PURCHASE",
      qty: Q,
      unitCost: unitCost !== undefined ? toNum(unitCost, undefined) : undefined,
      note: note || "Stock IN",
    });

    res.status(201).json({ message: "Stock updated", productId, variantId, newStock: variant.countInStock, ledger });
  } catch (e) {
    console.error("stockIn:", e);
    res.status(500).json({ message: "Failed to stock in" });
  }
};

// Admin: POST /api/admin/inventory/adjust
// body: { productId, variantId, newCount, note? }
exports.adjustStock = async (req, res) => {
  try {
    const { productId, variantId, newCount, note } = req.body;
    const N = toNum(newCount, -1);
    if (!productId || !variantId || N < 0) return res.status(400).json({ message: "productId, variantId, newCount>=0 required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const diff = N - variant.countInStock; // positive => IN, negative => OUT
    variant.countInStock = N;
    await product.save();

    const ledger = await InventoryLedger.create({
      product: productId,
      variantId,
      type: diff >= 0 ? "IN" : "OUT",
      reason: "MANUAL",
      qty: Math.abs(diff),
      note: note || "Manual stock adjustment",
    });

    res.json({ message: "Stock adjusted", newStock: N, ledger });
  } catch (e) {
    console.error("adjustStock:", e);
    res.status(500).json({ message: "Failed to adjust stock" });
  }
};

// Admin: GET /api/admin/inventory/ledger?productId=&variantId=
exports.getLedger = async (req, res) => {
  try {
    const filter = {};
    if (req.query.productId) filter.product = req.query.productId;
    if (req.query.variantId) filter.variantId = req.query.variantId;

    const rows = await InventoryLedger.find(filter).sort({ at: -1, createdAt: -1 }).limit(200).lean();
    res.json(rows);
  } catch (e) {
    console.error("getLedger:", e);
    res.status(500).json({ message: "Failed to fetch ledger" });
  }
};
