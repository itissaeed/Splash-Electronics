// controllers/analyticsController.js
const Order = require("../models/Order");

const parseDate = (s, fallback) => {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
};

// Admin: GET /api/admin/analytics/best-sellers?from=2026-01-01&to=2026-01-31&limit=20
exports.bestSellers = async (req, res) => {
  try {
    const from = parseDate(req.query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const to = parseDate(req.query.to, new Date());
    const limit = Math.min(Number(req.query.limit || 20), 100);

    const rows = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          qtySold: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
        },
      },
      { $sort: { qtySold: -1 } },
      { $limit: limit },
    ]);

    res.json({ from, to, rows });
  } catch (e) {
    console.error("bestSellers:", e);
    res.status(500).json({ message: "Failed to compute best sellers" });
  }
};

// Admin: GET /api/admin/analytics/region-sales?from=&to=&level=division|district
exports.regionSales = async (req, res) => {
  try {
    const from = parseDate(req.query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const to = parseDate(req.query.to, new Date());
    const level = (req.query.level || "division").toLowerCase();

    const regionField =
      level === "district" ? "$shippingAddress.district" : "$shippingAddress.division";

    const rows = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            region: regionField,
            product: "$items.product",
          },
          qty: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 200 },
    ]);

    res.json({ from, to, level, rows });
  } catch (e) {
    console.error("regionSales:", e);
    res.status(500).json({ message: "Failed to compute region sales" });
  }
};

// Admin: GET /api/admin/analytics/sales-timeseries?productId=...&from=&to=&bucket=day|week
exports.salesTimeseries = async (req, res) => {
  try {
    const { productId } = req.query;
    if (!productId) return res.status(400).json({ message: "productId is required" });

    const from = parseDate(req.query.from, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = parseDate(req.query.to, new Date());
    const bucket = (req.query.bucket || "day").toLowerCase();

    // group key by day or week
    const dateExpr =
      bucket === "week"
        ? { $dateToString: { format: "%G-%V", date: "$createdAt" } }
        : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

    const rows = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      { $match: { "items.product": require("mongoose").Types.ObjectId(productId) } },
      {
        $group: {
          _id: dateExpr,
          qty: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ from, to, bucket, rows });
  } catch (e) {
    console.error("salesTimeseries:", e);
    res.status(500).json({ message: "Failed to compute sales timeseries" });
  }
};
