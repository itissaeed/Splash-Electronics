// controllers/analyticsController.js
const Order = require("../models/Order");
const Product = require("../models/Product");

const parseDate = (str, fallback) => {
  if (!str) return fallback;
  const d = new Date(str);
  return isNaN(d.getTime()) ? fallback : d;
};

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// ------------------- OVERVIEW ANALYTICS -------------------
// GET /api/admin/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.adminAnalyticsOverview = async (req, res) => {
  try {
    const revenueStatuses = ["confirmed", "processing", "shipped", "delivered"];
    const now = new Date();

    // default: last 30 days
    const defaultTo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );
    const defaultFrom = new Date(
      defaultTo.getTime() - 29 * 24 * 60 * 60 * 1000
    );

    let from = parseDate(req.query.from, defaultFrom);
    let to = parseDate(req.query.to, defaultTo);

    // normalize to full days
    from = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
    to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);

    const matchStage = {
      createdAt: { $gte: from, $lte: to },
      status: { $in: revenueStatuses },
    };

    const [agg] = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$pricing.grandTotal" },
                totalOrders: { $sum: 1 },
                customersSet: { $addToSet: "$user" },
              },
            },
            {
              $project: {
                _id: 0,
                totalRevenue: 1,
                totalOrders: 1,
                uniqueCustomers: { $size: "$customersSet" },
                averageOrderValue: {
                  $cond: [
                    { $gt: ["$totalOrders", 0] },
                    { $divide: ["$totalRevenue", "$totalOrders"] },
                    0,
                  ],
                },
              },
            },
          ],

          daily: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                orders: { $sum: 1 },
                revenue: { $sum: "$pricing.grandTotal" },
              },
            },
            { $sort: { _id: 1 } },
          ],

          byDivision: [
            {
              $group: {
                _id: "$shippingAddress.division",
                orders: { $sum: 1 },
                revenue: { $sum: "$pricing.grandTotal" },
              },
            },
            { $sort: { revenue: -1 } },
          ],

          topProducts: [
            { $unwind: "$items" },
            {
              $group: {
                _id: { product: "$items.product", name: "$items.nameSnapshot" },
                qty: { $sum: "$items.qty" },
                revenue: {
                  $sum: { $multiply: ["$items.qty", "$items.price"] },
                },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
          ],

          paymentMethods: [
            {
              $group: {
                _id: "$payment.method",
                orders: { $sum: 1 },
                revenue: { $sum: "$pricing.grandTotal" },
                paidCount: {
                  $sum: {
                    $cond: [{ $eq: ["$payment.status", "paid"] }, 1, 0],
                  },
                },
              },
            },
            { $sort: { revenue: -1 } },
          ],
        },
      },
    ]);

    const overview =
      (agg?.overview && agg.overview[0]) || {
        totalRevenue: 0,
        totalOrders: 0,
        uniqueCustomers: 0,
        averageOrderValue: 0,
      };

    res.json({
      range: { from, to },
      overview,
      daily: agg?.daily || [],
      byDivision: agg?.byDivision || [],
      topProducts: agg?.topProducts || [],
      paymentMethods: agg?.paymentMethods || [],
    });
  } catch (err) {
    console.error("adminAnalyticsOverview error:", err);
    res.status(500).json({ message: "Failed to load analytics overview" });
  }
};

// ------------------- DEMAND FORECASTING -------------------
// GET /api/admin/analytics/forecasting?daysBack=90&horizonDays=30&top=30
exports.adminDemandForecast = async (req, res) => {
  try {
    const revenueStatuses = ["confirmed", "processing", "shipped", "delivered"];
    const now = new Date();

    const daysBack = Math.max(7, toNum(req.query.daysBack, 90)); // min 7 days
    const horizonDays = Math.max(1, toNum(req.query.horizonDays, 30));
    const top = Math.max(5, toNum(req.query.top, 30)); // number of products

    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const matchStage = {
      createdAt: { $gte: from, $lte: now },
      status: { $in: revenueStatuses },
    };

    // Aggregate per product from order items
    const perProduct = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: { product: "$items.product", name: "$items.nameSnapshot" },
          qtyTotal: { $sum: "$items.qty" },
          revenueTotal: {
            $sum: { $multiply: ["$items.qty", "$items.price"] },
          },
        },
      },
      { $sort: { qtyTotal: -1 } },
      { $limit: top },
    ]);

    if (!perProduct || perProduct.length === 0) {
      return res.json({
        range: { from, to: now, daysBack, horizonDays },
        productForecasts: [],
        categoryForecasts: [],
        summary: {
          totalForecastQty: 0,
          totalForecastRevenue: 0,
          productCount: 0,
          categoryCount: 0,
        },
      });
    }

    const productIds = perProduct.map((p) => p._id.product);
    const products = await Product.find({ _id: { $in: productIds } })
      .populate("category", "name")
      .populate("brand", "name")
      .lean();

    const productMap = {};
    for (const p of products) {
      productMap[p._id.toString()] = p;
    }

    const forecasts = [];
    const categoryMap = {};

    for (const row of perProduct) {
      const prodId = row._id.product;
      const prodIdStr = String(prodId);
      const prodDoc = productMap[prodIdStr];

      const qtyTotal = row.qtyTotal || 0;
      const revenueTotal = row.revenueTotal || 0;

      const avgDailyQty = qtyTotal / daysBack;
      const forecastQty = avgDailyQty * horizonDays;
      const avgPrice = qtyTotal > 0 ? revenueTotal / qtyTotal : 0;
      const forecastRevenue = forecastQty * avgPrice;

      const brandName = prodDoc?.brand?.name || null;
      const categoryId = prodDoc?.category?._id || null;
      const categoryName = prodDoc?.category?.name || "Unknown";

      const f = {
        productId: prodId,
        name: row._id.name || prodDoc?.name || "Unknown product",
        brand: brandName,
        categoryId,
        category: categoryName,
        qtyTotal,
        revenueTotal,
        avgDailyQty,
        forecastQty,
        forecastRevenue,
      };

      forecasts.push(f);

      // category aggregation
      const catKey = categoryId ? String(categoryId) : "unknown";
      if (!categoryMap[catKey]) {
        categoryMap[catKey] = {
          categoryId,
          categoryName,
          forecastQty: 0,
          forecastRevenue: 0,
        };
      }
      categoryMap[catKey].forecastQty += forecastQty;
      categoryMap[catKey].forecastRevenue += forecastRevenue;
    }

    const categoryForecasts = Object.values(categoryMap).sort(
      (a, b) => b.forecastRevenue - a.forecastRevenue
    );

    const summary = {
      totalForecastQty: forecasts.reduce(
        (sum, f) => sum + (f.forecastQty || 0),
        0
      ),
      totalForecastRevenue: forecasts.reduce(
        (sum, f) => sum + (f.forecastRevenue || 0),
        0
      ),
      productCount: forecasts.length,
      categoryCount: categoryForecasts.length,
    };

    res.json({
      range: { from, to: now, daysBack, horizonDays },
      productForecasts: forecasts,
      categoryForecasts,
      summary,
    });
  } catch (err) {
    console.error("adminDemandForecast error:", err);
    res.status(500).json({ message: "Failed to load demand forecast" });
  }
};
