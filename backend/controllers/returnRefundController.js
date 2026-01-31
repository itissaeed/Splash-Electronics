// controllers/returnRefundController.js
const ReturnRefund = require("../models/ReturnRefund");
const Order = require("../models/Order");
const Product = require("../models/Product");
const InventoryLedger = require("../models/InventoryLedger");

// User: POST /api/returns
// body: { orderNo, items: [{product, variantId, qty, reason}], notes? }
exports.requestReturn = async (req, res) => {
  try {
    const { orderNo, items, notes } = req.body;
    if (!orderNo || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "orderNo and items are required" });
    }

    const order = await Order.findOne({ orderNo });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.user) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Basic validation: user cannot return more qty than ordered
    for (const it of items) {
      const ordered = order.items.find(
        (oi) => String(oi.product) === String(it.product) && String(oi.variantId) === String(it.variantId)
      );
      if (!ordered || it.qty > ordered.qty) {
        return res.status(400).json({ message: "Invalid return items/qty" });
      }
    }

    const rr = await ReturnRefund.create({
      order: order._id,
      user: req.user._id,
      items,
      status: "requested",
      notes: notes || "",
    });

    res.status(201).json(rr);
  } catch (e) {
    console.error("requestReturn:", e);
    res.status(500).json({ message: "Failed to request return" });
  }
};

// Admin: PUT /api/admin/returns/:id/status
// body: { status, refund?: {amount, method, transactionId} }
exports.adminUpdateReturnStatus = async (req, res) => {
  try {
    const { status, refund } = req.body;
    const allowed = ["requested", "approved", "rejected", "picked", "received", "refunded"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const rr = await ReturnRefund.findById(req.params.id).populate("order");
    if (!rr) return res.status(404).json({ message: "Return request not found" });

    // When admin marks "received", restock items + ledger IN
    if (status === "received" && rr.status !== "received") {
      for (const it of rr.items) {
        const product = await Product.findById(it.product);
        const variant = product?.variants?.id(it.variantId);
        if (variant) {
          variant.countInStock += it.qty;
          await product.save();
        }

        await InventoryLedger.create({
          product: it.product,
          variantId: it.variantId,
          type: "IN",
          reason: "RETURN",
          qty: it.qty,
          order: rr.order?._id,
          note: `Return received (RR ${rr._id})`,
        });
      }
    }

    rr.status = status;

    if (refund) {
      rr.refund = rr.refund || {};
      if (refund.amount !== undefined) rr.refund.amount = refund.amount;
      if (refund.method !== undefined) rr.refund.method = refund.method;
      if (refund.transactionId !== undefined) rr.refund.transactionId = refund.transactionId;
      if (status === "refunded") rr.refund.refundedAt = new Date();
    }

    const updated = await rr.save();
    res.json(updated);
  } catch (e) {
    console.error("adminUpdateReturnStatus:", e);
    res.status(500).json({ message: "Failed to update return status" });
  }
};

// User/Admin: GET /api/returns/my
exports.getMyReturns = async (req, res) => {
  try {
    const filter = req.user.isAdmin ? {} : { user: req.user._id };
    const rows = await ReturnRefund.find(filter).sort({ createdAt: -1 }).populate("order").lean();
    res.json(rows);
  } catch (e) {
    console.error("getMyReturns:", e);
    res.status(500).json({ message: "Failed to fetch returns" });
  }
};
