// controllers/adminCustomerController.js
const User = require("../models/userModel");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// GET /api/admin/customers?keyword=&page=&limit=
exports.adminGetCustomers = async (req, res) => {
  try {
    const pageSize = toNum(req.query.limit, 20);
    const page = toNum(req.query.page, 1);

    const keyword = req.query.keyword?.trim();
    const keywordFilter = keyword
      ? {
          $or: [
            { name: { $regex: keyword, $options: "i" } },
            { email: { $regex: keyword, $options: "i" } },
            { number: { $regex: keyword, $options: "i" } },
          ],
        }
      : {};

    // For the list we show "customers" (non-admins)
    const listFilter = { isAdmin: false, ...keywordFilter };

    const totalCustomers = await User.countDocuments(listFilter);

    const users = await User.find(listFilter)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .select("name email number isAdmin createdAt") // no password or tokens
      .lean();

    // Global metrics for header (not just this page)
    const totalUsers = await User.countDocuments({});
    const adminCount = await User.countDocuments({ isAdmin: true });
    const customerCount = await User.countDocuments({ isAdmin: false });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.json({
      users,
      page,
      pages: Math.ceil(totalCustomers / pageSize),
      totalCustomers,
      metrics: {
        totalUsers,
        adminCount,
        customerCount,
        newUsersLast30Days,
      },
    });
  } catch (err) {
    console.error("adminGetCustomers error:", err);
    res.status(500).json({ message: "Failed to load customers" });
  }
};
