// controllers/analyticsController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const ProductView = require("../models/ProductView");
const Cart = require("../models/Cart");
const ReturnRefund = require("../models/ReturnRefund");
const {
  COLLECTED_PAYMENT_STATUSES,
  buildCollectedRevenueExpr,
  REVENUE_RECOGNIZED_STATUSES,
  buildRevenueMatch,
  buildRevenueExpr,
} = require("../utils/revenueRecognition");

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
    };
    const paymentMatchStage = {
      "payment.status": { $in: COLLECTED_PAYMENT_STATUSES },
      "payment.paidAt": { $gte: from, $lte: to },
    };
    const refundMatchStage = {
      status: "refunded",
      "refund.refundedAt": { $gte: from, $lte: to },
    };

    const [collectionTotalOrders, matchedOrderCount, latestOrder] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments(matchStage),
      Order.findOne({})
        .sort({ createdAt: -1 })
        .select("orderNo createdAt status")
        .lean(),
    ]);

    const [overviewAgg, financeAgg, dailyAgg, byDivisionAgg, byDivisionProductOrdersAgg, topProductsAgg, paymentMethodsAgg, peakOrderHoursAgg, topViewedProducts, uniqueViewers, orderingVisitors, abandonedCartAgg, refundAgg] = await Promise.all([
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            customersSet: { $addToSet: "$user" },
          },
        },
        {
          $project: {
            _id: 0,
            totalOrders: 1,
            uniqueCustomers: { $size: "$customersSet" },
          },
        },
      ]),
      Order.aggregate([
        { $match: paymentMatchStage },
        {
          $group: {
            _id: null,
            grossSales: { $sum: "$pricing.grandTotal" },
            cashCollected: { $sum: "$pricing.grandTotal" },
            paidOrderCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: paymentMatchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$payment.paidAt" },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.grandTotal" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: paymentMatchStage },
        {
          $addFields: {
            divisionName: {
              $let: {
                vars: {
                  d: {
                    $trim: {
                      input: { $ifNull: ["$shippingAddress.division", ""] },
                    },
                  },
                },
                in: { $cond: [{ $eq: ["$$d", ""] }, "Unknown", "$$d"] },
              },
            },
          },
        },
        {
          $group: {
            _id: "$divisionName",
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.grandTotal" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        { $match: paymentMatchStage },
        {
          $addFields: {
            divisionName: {
              $let: {
                vars: {
                  d: {
                    $trim: {
                      input: { $ifNull: ["$shippingAddress.division", ""] },
                    },
                  },
                },
                in: { $cond: [{ $eq: ["$$d", ""] }, "Unknown", "$$d"] },
              },
            },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$divisionName",
            qty: { $sum: "$items.qty" },
            orderCount: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            _id: 1,
            qty: 1,
            orderCount: { $size: "$orderCount" },
          },
        },
        { $sort: { qty: -1 } },
      ]),
      Order.aggregate([
        { $match: paymentMatchStage },
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
      ]),
      Order.aggregate([
        { $match: paymentMatchStage },
        {
          $group: {
            _id: "$payment.method",
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.grandTotal" },
            recognizedSales: { $sum: "$pricing.grandTotal" },
            cashCollected: { $sum: "$pricing.grandTotal" },
            paidCount: { $sum: 1 },
          },
        },
        { $sort: { cashCollected: -1, revenue: -1 } },
      ]),
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { orders: -1, _id: 1 } },
      ]),
      ProductView.aggregate([
        { $match: { viewedAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: "$product",
            views: { $sum: 1 },
            visitorSet: { $addToSet: "$visitorKey" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDoc",
          },
        },
        {
          $project: {
            _id: 1,
            views: 1,
            uniqueViewers: { $size: "$visitorSet" },
            name: {
              $ifNull: [
                { $arrayElemAt: ["$productDoc.name", 0] },
                "Unknown product",
              ],
            },
            slug: {
              $ifNull: [{ $arrayElemAt: ["$productDoc.slug", 0] }, ""],
            },
          },
        },
        { $sort: { views: -1, uniqueViewers: -1 } },
        { $limit: 10 },
      ]),
      ProductView.distinct("visitorKey", {
        viewedAt: { $gte: from, $lte: to },
        visitorKey: { $nin: ["", null] },
      }),
      Order.distinct("analytics.visitorKey", {
        createdAt: { $gte: from, $lte: to },
        "analytics.visitorKey": { $nin: ["", null] },
      }),
      Cart.aggregate([
        {
          $match: {
            updatedAt: {
              $gte: from,
              $lte: new Date(Math.min(to.getTime(), now.getTime()) - 24 * 60 * 60 * 1000),
            },
            "items.0": { $exists: true },
          },
        },
        {
          $lookup: {
            from: "orders",
            let: { userId: "$user", cartUpdatedAt: "$updatedAt" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$user", "$$userId"] },
                      { $gt: ["$createdAt", "$$cartUpdatedAt"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "followUpOrders",
          },
        },
        {
          $match: {
            $expr: { $eq: [{ $size: "$followUpOrders" }, 0] },
          },
        },
        {
          $group: {
            _id: null,
            abandonedCarts: { $sum: 1 },
            abandonedItems: { $sum: { $size: "$items" } },
          },
        },
      ]),
      ReturnRefund.aggregate([
        {
          $match: refundMatchStage,
        },
        {
          $group: {
            _id: null,
            refundsIssued: { $sum: { $ifNull: ["$refund.amount", 0] } },
          },
        },
      ]),
    ]);

    const overviewBase = overviewAgg?.[0] || {
      totalOrders: 0,
      uniqueCustomers: 0,
    };
    const financeBase = financeAgg?.[0] || {
      grossSales: 0,
      cashCollected: 0,
      paidOrderCount: 0,
    };

    const peakOrderHour = Array.isArray(agg?.peakOrderHours) && agg.peakOrderHours.length
      ? agg.peakOrderHours[0]
      : null;
    const uniqueViewerCount = uniqueViewers.length;
    const orderingVisitorCount = orderingVisitors.length;
    const conversionRate = uniqueViewerCount > 0
      ? (orderingVisitorCount / uniqueViewerCount) * 100
      : 0;
    const abandonedCartSummary = abandonedCartAgg?.[0] || {
      abandonedCarts: 0,
      abandonedItems: 0,
    };
    const refundsIssued = Number(refundAgg?.[0]?.refundsIssued || 0);
    const grossSales = Number(financeBase.grossSales || 0);
    const cashCollected = Number(financeBase.cashCollected || 0);
    const paidOrderCount = Number(financeBase.paidOrderCount || 0);

    res.json({
      range: { from, to },
      overview: {
        ...overviewBase,
        grossSales,
        recognizedSales: grossSales,
        cashCollected,
        refundsIssued,
        netRevenue: cashCollected - refundsIssued,
        totalRevenue: cashCollected - refundsIssued,
        averageRecognizedOrderValue: paidOrderCount > 0 ? grossSales / paidOrderCount : 0,
        averageOrderValue: paidOrderCount > 0 ? grossSales / paidOrderCount : 0,
        uniqueViewers: uniqueViewerCount,
        orderingVisitors: orderingVisitorCount,
        conversionRate,
        abandonedCarts: abandonedCartSummary.abandonedCarts || 0,
        abandonedItems: abandonedCartSummary.abandonedItems || 0,
        peakOrderTime: peakOrderHour
          ? {
              hour: peakOrderHour._id,
              orders: peakOrderHour.orders,
              label: `${String(peakOrderHour._id).padStart(2, "0")}:00 - ${String((peakOrderHour._id + 1) % 24).padStart(2, "0")}:00`,
            }
          : null,
      },
      daily: dailyAgg || [],
      byDivision: byDivisionAgg || [],
      byDivisionProductOrders: byDivisionProductOrdersAgg || [],
      topProducts: topProductsAgg || [],
      paymentMethods: paymentMethodsAgg || [],
      mostViewedProducts: topViewedProducts || [],
      peakOrderHours: peakOrderHoursAgg || [],
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
    const now = new Date();
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const daysBack = Math.max(7, toNum(req.query.daysBack, 90));
    const horizonDays = Math.max(1, toNum(req.query.horizonDays, 30));
    const top = Math.max(5, toNum(req.query.top, 30));
    const sourceLimit = Math.max(top * 4, 60);

    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const momentumWindowDays = Math.max(3, Math.min(14, Math.floor(daysBack / 3)));
    const recentWindowStart = new Date(now.getTime() - momentumWindowDays * 24 * 60 * 60 * 1000);
    const priorWindowStart = new Date(recentWindowStart.getTime() - momentumWindowDays * 24 * 60 * 60 * 1000);
    const safetyStockDays = 7;

    const orderMatchStage = {
      createdAt: { $gte: from, $lte: now },
      ...buildRevenueMatch(),
    };

    const [orderAgg, viewAgg] = await Promise.all([
      Order.aggregate([
        { $match: orderMatchStage },
        { $unwind: "$items" },
        {
          $group: {
            _id: { product: "$items.product", name: "$items.nameSnapshot" },
            qtyTotal: { $sum: "$items.qty" },
            revenueTotal: {
              $sum: { $multiply: ["$items.qty", "$items.price"] },
            },
            recentQty: {
              $sum: {
                $cond: [{ $gte: ["$createdAt", recentWindowStart] }, "$items.qty", 0],
              },
            },
            priorQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", priorWindowStart] },
                      { $lt: ["$createdAt", recentWindowStart] },
                    ],
                  },
                  "$items.qty",
                  0,
                ],
              },
            },
            buyerSet: {
              $addToSet: {
                $cond: [
                  { $in: ["$analytics.visitorKey", ["", null]] },
                  null,
                  "$analytics.visitorKey",
                ],
              },
            },
            activeOrderDays: {
              $addToSet: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
            },
          },
        },
        { $sort: { qtyTotal: -1, revenueTotal: -1 } },
        { $limit: sourceLimit },
      ]),
      ProductView.aggregate([
        { $match: { viewedAt: { $gte: from, $lte: now } } },
        {
          $group: {
            _id: "$product",
            pageViews: { $sum: 1 },
            uniqueViewerSet: { $addToSet: "$visitorKey" },
            recentViews: {
              $sum: {
                $cond: [{ $gte: ["$viewedAt", recentWindowStart] }, 1, 0],
              },
            },
            priorViews: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$viewedAt", priorWindowStart] },
                      { $lt: ["$viewedAt", recentWindowStart] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            pageViews: 1,
            recentViews: 1,
            priorViews: 1,
            uniqueViewers: {
              $size: {
                $filter: {
                  input: "$uniqueViewerSet",
                  as: "viewer",
                  cond: { $not: [{ $in: ["$$viewer", ["", null]] }] },
                },
              },
            },
          },
        },
        { $sort: { pageViews: -1, uniqueViewers: -1 } },
        { $limit: sourceLimit },
      ]),
    ]);

    const orderMap = {};
    for (const row of orderAgg || []) {
      const productId = row?._id?.product ? String(row._id.product) : "";
      if (!productId) continue;
      orderMap[productId] = row;
    }

    const viewMap = {};
    for (const row of viewAgg || []) {
      const productId = row?._id ? String(row._id) : "";
      if (!productId) continue;
      viewMap[productId] = row;
    }

    const productIds = Array.from(
      new Set([...Object.keys(orderMap), ...Object.keys(viewMap)])
    );

    if (!productIds.length) {
      return res.json({
        range: { from, to: now, daysBack, horizonDays },
        model: {
          version: "traffic-weighted-v2",
          momentumWindowDays,
          safetyStockDays,
          orderWeightDefault: 0.65,
          trafficWeightDefault: 0.35,
        },
        productForecasts: [],
        categoryForecasts: [],
        summary: {
          totalForecastQty: 0,
          totalForecastRevenue: 0,
          productCount: 0,
          categoryCount: 0,
          totalPageViews: 0,
          totalUniqueViewers: 0,
          avgConversionRate: 0,
          avgConfidenceScore: 0,
          trendingUpCount: 0,
          highIntentSkuCount: 0,
          stockoutRiskCount: 0,
          projectedStockoutCount: 0,
          totalSuggestedReorderQty: 0,
        },
      });
    }

    const products = await Product.find({ _id: { $in: productIds } })
      .populate("category", "name")
      .populate("brand", "name")
      .lean();

    const productMap = {};
    for (const p of products) {
      productMap[String(p._id)] = p;
    }

    let totalQtySignals = 0;
    let totalBuyerSignals = 0;
    let totalUniqueViewerSignals = 0;

    for (const productId of productIds) {
      const orderRow = orderMap[productId];
      const viewRow = viewMap[productId];
      const qtyTotal = Number(orderRow?.qtyTotal || 0);
      const buyerCount = (orderRow?.buyerSet || []).filter(Boolean).length;
      const uniqueViewers = Number(viewRow?.uniqueViewers || 0);

      totalQtySignals += qtyTotal;
      totalBuyerSignals += buyerCount;
      totalUniqueViewerSignals += uniqueViewers;
    }

    const globalConversionRate =
      totalUniqueViewerSignals > 0 ? totalBuyerSignals / totalUniqueViewerSignals : 0.025;
    const globalUnitsPerBuyer =
      totalBuyerSignals > 0 ? totalQtySignals / totalBuyerSignals : 1;

    const categoryMap = {};
    const forecasts = [];
    let stockoutRiskCount = 0;
    let projectedStockoutCount = 0;
    let trendingUpCount = 0;
    let highIntentSkuCount = 0;

    for (const productId of productIds) {
      const orderRow = orderMap[productId];
      const viewRow = viewMap[productId];
      const prodDoc = productMap[productId];
      if (!prodDoc) continue;

      const qtyTotal = Number(orderRow?.qtyTotal || 0);
      const revenueTotal = Number(orderRow?.revenueTotal || 0);
      const recentQty = Number(orderRow?.recentQty || 0);
      const priorQty = Number(orderRow?.priorQty || 0);
      const pageViews = Number(viewRow?.pageViews || 0);
      const uniqueViewers = Number(viewRow?.uniqueViewers || 0);
      const recentViews = Number(viewRow?.recentViews || 0);
      const priorViews = Number(viewRow?.priorViews || 0);
      const buyerCount = (orderRow?.buyerSet || []).filter(Boolean).length;
      const activeOrderDays = (orderRow?.activeOrderDays || []).filter(Boolean).length;

      const avgDailyQty = qtyTotal / daysBack;
      const avgPrice =
        qtyTotal > 0
          ? revenueTotal / qtyTotal
          : Number(prodDoc?.basePrice || prodDoc?.variants?.[0]?.price || 0);
      const unitsPerBuyer =
        buyerCount > 0
          ? qtyTotal / buyerCount
          : Math.max(1, globalUnitsPerBuyer);
      const conversionRate =
        uniqueViewers > 0 ? buyerCount / uniqueViewers : 0;
      const effectiveConversionRate =
        conversionRate > 0
          ? conversionRate
          : clamp(globalConversionRate * (pageViews >= 30 ? 1 : 0.7), 0.005, 0.3);

      const orderTrendFactor = clamp(
        priorQty > 0 ? recentQty / priorQty : recentQty > 0 ? 1.18 : 1,
        0.65,
        1.8
      );
      const trafficTrendFactor = clamp(
        priorViews > 0 ? recentViews / priorViews : recentViews > 0 ? 1.15 : 1,
        0.7,
        1.8
      );
      const momentumFactor = clamp(
        orderTrendFactor * 0.6 + trafficTrendFactor * 0.4,
        0.75,
        1.6
      );

      const baselineForecastQty = avgDailyQty * horizonDays * momentumFactor;
      const projectedDailyViews = (pageViews / daysBack) * (0.55 + trafficTrendFactor * 0.45);
      const trafficDrivenForecastQty =
        projectedDailyViews * horizonDays * effectiveConversionRate * unitsPerBuyer;

      let trafficWeight = 0;
      if (qtyTotal > 0 && pageViews > 0) trafficWeight = 0.35;
      else if (qtyTotal > 0) trafficWeight = 0.1;
      else if (pageViews > 0) trafficWeight = 0.75;
      const orderWeight = 1 - trafficWeight;

      const forecastQty = baselineForecastQty * orderWeight + trafficDrivenForecastQty * trafficWeight;
      const forecastRevenue = forecastQty * avgPrice;

      const brandName = prodDoc?.brand?.name || null;
      const categoryId = prodDoc?.category?._id || null;
      const categoryName = prodDoc?.category?.name || "Unknown";
      const currentStock = (prodDoc?.variants || []).reduce(
        (sum, variant) => sum + Number(variant?.countInStock || 0),
        0
      );
      const daysOfCover = avgDailyQty > 0 ? currentStock / avgDailyQty : null;
      const projectedStockAtHorizon = currentStock - forecastQty;
      const safetyStockUnits = (forecastQty / Math.max(horizonDays, 1)) * safetyStockDays;
      const targetStockLevel = forecastQty + safetyStockUnits;
      const suggestedReorderQty = Math.max(0, targetStockLevel - currentStock);
      const riskLevel =
        forecastQty <= 0
          ? "stable"
          : currentStock <= 0
          ? "stockout"
          : projectedStockAtHorizon < 0
          ? "at_risk"
          : "stable";

      if (riskLevel === "stockout") stockoutRiskCount += 1;
      if (riskLevel === "stockout" || riskLevel === "at_risk") projectedStockoutCount += 1;
      if (trafficTrendFactor >= 1.12 || orderTrendFactor >= 1.12) trendingUpCount += 1;
      if (pageViews >= 40 && effectiveConversionRate >= Math.max(globalConversionRate * 0.9, 0.015)) {
        highIntentSkuCount += 1;
      }

      const confidenceScore = Math.round(
        clamp(
          Math.min(30, qtyTotal * 1.6) +
            Math.min(20, buyerCount * 4) +
            Math.min(20, uniqueViewers * 0.45) +
            Math.min(15, activeOrderDays * 2.4) +
            Math.min(15, (recentViews + recentQty * 4) * 0.35),
          15,
          98
        )
      );
      const confidenceLabel =
        confidenceScore >= 75 ? "High" : confidenceScore >= 50 ? "Medium" : "Emerging";
      const demandScore = Math.round(
        clamp(
          forecastQty * 5 +
            pageViews * 0.18 +
            uniqueViewers * 0.35 +
            effectiveConversionRate * 100,
          1,
          999
        )
      );

      const forecast = {
        productId: prodDoc._id,
        slug: prodDoc.slug || "",
        name: orderRow?._id?.name || prodDoc.name || "Unknown product",
        brand: brandName,
        categoryId,
        category: categoryName,
        qtyTotal,
        revenueTotal,
        avgDailyQty,
        avgPrice,
        baselineForecastQty,
        trafficDrivenForecastQty,
        forecastQty,
        forecastRevenue,
        currentStock,
        daysOfCover,
        projectedStockAtHorizon,
        safetyStockUnits,
        suggestedReorderQty,
        riskLevel,
        pageViews,
        uniqueViewers,
        buyerCount,
        conversionRate,
        effectiveConversionRate,
        unitsPerBuyer,
        projectedDailyViews,
        recentQty,
        priorQty,
        recentViews,
        priorViews,
        orderTrendFactor,
        trafficTrendFactor,
        momentumFactor,
        activeOrderDays,
        orderWeight,
        trafficWeight,
        confidenceScore,
        confidenceLabel,
        demandScore,
      };

      forecasts.push(forecast);

      const categoryKey = categoryId ? String(categoryId) : "unknown";
      if (!categoryMap[categoryKey]) {
        categoryMap[categoryKey] = {
          categoryId,
          categoryName,
          forecastQty: 0,
          forecastRevenue: 0,
          pageViews: 0,
          uniqueViewers: 0,
          buyerCount: 0,
          confidenceScoreTotal: 0,
          skuCount: 0,
        };
      }

      categoryMap[categoryKey].forecastQty += forecastQty;
      categoryMap[categoryKey].forecastRevenue += forecastRevenue;
      categoryMap[categoryKey].pageViews += pageViews;
      categoryMap[categoryKey].uniqueViewers += uniqueViewers;
      categoryMap[categoryKey].buyerCount += buyerCount;
      categoryMap[categoryKey].confidenceScoreTotal += confidenceScore;
      categoryMap[categoryKey].skuCount += 1;
    }

    const rankedForecasts = forecasts
      .sort((a, b) => {
        if (b.demandScore !== a.demandScore) return b.demandScore - a.demandScore;
        return b.forecastRevenue - a.forecastRevenue;
      })
      .slice(0, top);

    const categoryForecasts = Object.values(categoryMap)
      .map((row) => ({
        ...row,
        avgConfidenceScore:
          row.skuCount > 0 ? Math.round(row.confidenceScoreTotal / row.skuCount) : 0,
        conversionRate:
          row.uniqueViewers > 0 ? row.buyerCount / row.uniqueViewers : 0,
      }))
      .sort((a, b) => b.forecastRevenue - a.forecastRevenue);

    const summary = {
      totalForecastQty: rankedForecasts.reduce((sum, row) => sum + (row.forecastQty || 0), 0),
      totalForecastRevenue: rankedForecasts.reduce(
        (sum, row) => sum + (row.forecastRevenue || 0),
        0
      ),
      productCount: rankedForecasts.length,
      categoryCount: categoryForecasts.length,
      totalPageViews: rankedForecasts.reduce((sum, row) => sum + (row.pageViews || 0), 0),
      totalUniqueViewers: rankedForecasts.reduce(
        (sum, row) => sum + (row.uniqueViewers || 0),
        0
      ),
      avgConversionRate:
        rankedForecasts.length > 0
          ? rankedForecasts.reduce(
              (sum, row) => sum + Number(row.effectiveConversionRate || 0),
              0
            ) / rankedForecasts.length
          : 0,
      avgConfidenceScore:
        rankedForecasts.length > 0
          ? rankedForecasts.reduce((sum, row) => sum + (row.confidenceScore || 0), 0) /
            rankedForecasts.length
          : 0,
      trendingUpCount,
      highIntentSkuCount,
      stockoutRiskCount,
      projectedStockoutCount,
      totalSuggestedReorderQty: rankedForecasts.reduce(
        (sum, row) => sum + (row.suggestedReorderQty || 0),
        0
      ),
    };

    res.json({
      range: { from, to: now, daysBack, horizonDays },
      model: {
        version: "traffic-weighted-v2",
        momentumWindowDays,
        safetyStockDays,
        orderWeightDefault: 0.65,
        trafficWeightDefault: 0.35,
      },
      productForecasts: rankedForecasts,
      categoryForecasts,
      summary,
    });
  } catch (err) {
    console.error("adminDemandForecast error:", err);
    res.status(500).json({ message: "Failed to load demand forecast" });
  }
};
