const Order = require("../models/Order");
const User = require("../models/UserModel");
const ReturnRefund = require("../models/ReturnRefund");
const { COLLECTED_PAYMENT_STATUSES } = require("../utils/revenueRecognition");
const { customerUserQuery } = require("../utils/adminAccess");

exports.getAdminOverview = async (req, res) => {
  try {
    const collectedMatch = {
      "payment.status": { $in: COLLECTED_PAYMENT_STATUSES },
      "payment.paidAt": { $exists: true, $ne: null },
    };

    // totals
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments(customerUserQuery());

    const [salesAgg, refundAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: collectedMatch,
        },
        {
          $group: {
            _id: null,
            recognizedSales: {
              $sum: "$pricing.grandTotal",
            },
            cashCollected: {
              $sum: "$pricing.grandTotal",
            },
          },
        },
      ]),
      ReturnRefund.aggregate([
        { $match: { status: "refunded" } },
        {
          $group: {
            _id: null,
            refundsIssued: { $sum: { $ifNull: ["$refund.amount", 0] } },
          },
        },
      ]),
    ]);
    const salesSummary = salesAgg[0] || {};
    const refundsIssued = Number(refundAgg[0]?.refundsIssued || 0);
    const recognizedSales = Number(salesSummary.recognizedSales || 0);
    const cashCollected = Number(salesSummary.cashCollected || 0);
    const netRevenue = cashCollected - refundsIssued;

    // status counts
    const statusAgg = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusCounts = statusAgg.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    // best sellers (top 10 products)
    const bestSellers = await Order.aggregate([
      { $match: collectedMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          qtySold: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
          nameSnapshot: { $first: "$items.nameSnapshot" },
          imageSnapshot: { $first: "$items.imageSnapshot" },
        },
      },
      { $sort: { qtySold: -1 } },
      { $limit: 10 },
    ]);

    // sales by division
    const salesByDivision = await Order.aggregate([
      { $match: collectedMatch },
      {
        $group: {
          _id: "$shippingAddress.division",
          totalOrders: { $sum: 1 },
          revenue: { $sum: "$pricing.grandTotal" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // last 7 days sales
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesLast7Days = await Order.aggregate([
      { $match: { ...collectedMatch, "payment.paidAt": { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            y: { $year: "$payment.paidAt" },
            m: { $month: "$payment.paidAt" },
            d: { $dayOfMonth: "$payment.paidAt" },
          },
          revenue: { $sum: "$pricing.grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    res.json({
      totalOrders,
      totalCustomers,
      recognizedSales,
      cashCollected,
      refundsIssued,
      netRevenue,
      totalRevenue: recognizedSales,
      statusCounts,
      bestSellers,
      salesByDivision,
      salesLast7Days,
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};
