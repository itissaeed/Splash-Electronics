// controllers/inventoryController.js
const Product = require("../models/Product");
const InventoryLedger = require("../models/InventoryLedger");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// GET /api/admin/inventory/overview?threshold=5
exports.getInventoryOverview = async (req, res) => {
  try {
    const threshold = toNum(req.query.threshold, 5);

    // Load all active products with brand + category
    const products = await Product.find({ isActive: true })
      .populate("brand", "name slug")
      .populate("category", "name slug")
      .lean();

    let totalSkus = 0;
    let totalUnitsInStock = 0;
    let totalStockValue = 0;

    const lowStock = [];

    for (const p of products) {
      const variants = p.variants || [];

      totalSkus += variants.length;

      for (const v of variants) {
        const stock = toNum(v.countInStock, 0);
        totalUnitsInStock += stock;

        const price = toNum(v.price ?? p.basePrice ?? 0, 0);
        totalStockValue += price * stock;

        if (stock <= threshold) {
          lowStock.push({
            productId: p._id,
            variantId: v._id,
            name: p.name,
            sku: v.sku,
            stock,
            price,
            brand: p.brand?.name || null,
            category: p.category?.name || null,
          });
        }
      }
    }

    // recent inventory movements from ledger
    const recentMovements = await InventoryLedger.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("product", "name")
      .lean();

    res.json({
      metrics: {
        totalSkus,
        totalUnitsInStock,
        lowStockCount: lowStock.length,
        totalStockValue,
      },
      lowStock,
      recentMovements,
    });
  } catch (err) {
    console.error("getInventoryOverview error:", err);
    res.status(500).json({ message: "Failed to load inventory overview" });
  }
};

// POST /api/admin/inventory/adjust
// body: { productId, variantId, delta, reason?, note? }
exports.adjustInventory = async (req, res) => {
  try {
    const { productId, variantId, delta, reason, note } = req.body;

    const qtyChange = Number(delta);
    if (!productId || !variantId || !Number.isFinite(qtyChange) || qtyChange === 0) {
      return res
        .status(400)
        .json({ message: "productId, variantId and non-zero delta are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const current = Number(variant.countInStock || 0);
    const next = current + qtyChange;

    if (next < 0) {
      return res
        .status(400)
        .json({ message: "Resulting stock cannot be negative" });
    }

    variant.countInStock = next;
    await product.save();

    const type = qtyChange > 0 ? "IN" : "OUT";

    await InventoryLedger.create({
      product: product._id,
      variantId: variant._id,
      type,
      reason: reason || "MANUAL_ADJUST",
      qty: Math.abs(qtyChange),
      note: note || `Manual stock adjust from ${current} to ${next}`,
    });

    res.json({
      message: "Inventory updated",
      productId: product._id,
      variantId: variant._id,
      newStock: next,
    });
  } catch (err) {
    console.error("adjustInventory error:", err);
    res.status(500).json({ message: "Failed to adjust inventory" });
  }
};
