// controllers/inventoryController.js
const Product = require("../models/product");
const InventoryLedger = require("../models/InventoryLedger");
const {
  getReservedQtyMap,
  getAvailableStock,
} = require("../services/stockReservationService");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// GET /api/admin/inventory/overview?threshold=5
exports.getInventoryOverview = async (req, res) => {
  try {
    const threshold = toNum(req.query.threshold, 5);

    // Load all active products with brand + category
    const products = await Product.find({ isActive: true, isDeleted: { $ne: true } })
      .populate("brand", "name slug")
      .populate("category", "name slug")
      .lean();

    let totalSkus = 0;
    let totalUnitsOnHand = 0;
    let totalUnitsReserved = 0;
    let totalUnitsAvailable = 0;
    let totalStockValue = 0;

    const lowStock = [];
    const allStock = [];
    const pairs = [];

    for (const p of products) {
      for (const v of p.variants || []) {
        if (p?._id && v?._id) {
          pairs.push({ productId: p._id, variantId: v._id });
        }
      }
    }

    const reservedMap = await getReservedQtyMap({ pairs, now: new Date() });

    for (const p of products) {
      const variants = p.variants || [];

      totalSkus += variants.length;

      for (const v of variants) {
        const onHand = toNum(v.countInStock, 0);
        const reserved = toNum(reservedMap.get(`${String(p._id)}|${String(v._id)}`), 0);
        const available = getAvailableStock({ physicalStock: onHand, reservedQty: reserved });
        const rowThreshold = Math.max(0, toNum(v.lowStockThreshold, threshold));
        totalUnitsOnHand += onHand;
        totalUnitsReserved += reserved;
        totalUnitsAvailable += available;

        const price = toNum(v.price ?? p.basePrice ?? 0, 0);
        totalStockValue += price * onHand;
        const row = {
          productId: p._id,
          variantId: v._id,
          name: p.name,
          sku: v.sku,
          stock: available,
          available,
          reserved,
          onHand,
          threshold: rowThreshold,
          price,
          brand: p.brand?.name || null,
          category: p.category?.name || null,
        };
        allStock.push(row);

        if (available <= rowThreshold) {
          lowStock.push(row);
        }
      }
    }

    // recent inventory movements from ledger
    const recentMovements = await InventoryLedger.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("product", "name")
      .populate("actor", "name email")
      .lean();

    res.json({
      metrics: {
        totalSkus,
        totalUnitsOnHand,
        totalUnitsReserved,
        totalUnitsAvailable,
        lowStockCount: lowStock.length,
        totalStockValue,
      },
      lowStock,
      allStock,
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
    const reservedMap = await getReservedQtyMap({
      pairs: [{ productId: product._id, variantId: variant._id }],
      now: new Date(),
    });
    const reservedQty = Number(
      reservedMap.get(`${String(product._id)}|${String(variant._id)}`) || 0
    );
    const next = current + qtyChange;

    if (next < 0) {
      return res
        .status(400)
        .json({ message: "Resulting stock cannot be negative" });
    }
    if (next < reservedQty) {
      return res.status(400).json({
        message: `On-hand stock cannot be lower than reserved stock (${reservedQty})`,
      });
    }

    const oldAvailable = getAvailableStock({ physicalStock: current, reservedQty });
    variant.countInStock = next;
    await product.save();

    const normalizedReason = String(reason || "MANUAL_ADJUST").trim().toUpperCase();
    const reasonMap = {
      PURCHASE: { type: "IN", reason: "PURCHASE" },
      RETURN: { type: "IN", reason: "RETURN" },
      DAMAGE: { type: "OUT", reason: "DAMAGE" },
      MANUAL: { type: "ADJUST", reason: "MANUAL" },
      MANUAL_ADJUST: { type: "ADJUST", reason: "MANUAL_ADJUST" },
    };
    const ledgerMeta =
      reasonMap[normalizedReason] ||
      (qtyChange > 0
        ? { type: "IN", reason: "MANUAL_ADJUST" }
        : { type: "OUT", reason: "MANUAL_ADJUST" });

    await InventoryLedger.create({
      product: product._id,
      variantId: variant._id,
      sku: variant.sku || "",
      type: ledgerMeta.type,
      reason: ledgerMeta.reason,
      qty: Math.abs(qtyChange),
      deltaQty: qtyChange,
      oldOnHand: current,
      newOnHand: next,
      oldReserved: reservedQty,
      newReserved: reservedQty,
      oldAvailable,
      newAvailable: getAvailableStock({ physicalStock: next, reservedQty }),
      actor: req.user?._id,
      note:
        note ||
        `Inventory updated from ${current} to ${next} (reserved ${reservedQty}, available ${getAvailableStock({
          physicalStock: next,
          reservedQty,
        })})`,
    });

    res.json({
      message: "Inventory updated",
      productId: product._id,
      variantId: variant._id,
      newStock: next,
      reservedQty,
      availableStock: getAvailableStock({ physicalStock: next, reservedQty }),
    });
  } catch (err) {
    console.error("adjustInventory error:", err);
    res.status(500).json({ message: "Failed to adjust inventory" });
  }
};
