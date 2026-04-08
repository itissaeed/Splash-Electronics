const Order = require("../models/Order");
const User = require("../models/userModel");

exports.getAdminOverview = async (req, res) => {
  try {
    const revenueStatuses = ["confirmed", "processing", "shipped", "delivered"];
    const revenueMatch = { status: { $in: revenueStatuses } };

    // totals
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ isAdmin: false });

    // revenue (only admin-confirmed order pipeline)
    const revenueAgg = await Order.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, revenue: { $sum: "$pricing.grandTotal" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.revenue || 0;

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
      { $match: revenueMatch },
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
      { $match: revenueMatch },
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
      { $match: { ...revenueMatch, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
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
      totalRevenue,
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
