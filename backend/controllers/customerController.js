// controllers/adminCustomerController.js
const User = require("../models/UserModel");
const {
  buildRoleState,
  isUserAdmin,
  adminUserQuery,
  customerUserQuery,
} = require("../utils/adminAccess");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// GET /api/admin/customers?keyword=&page=&limit=
exports.adminGetCustomers = async (req, res) => {
  try {
    const pageSize = toNum(req.query.limit, 20);
    const page = toNum(req.query.page, 1);
    const role = String(req.query.role || "all").trim().toLowerCase();

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

    const listFilter = { ...keywordFilter };
    if (role === "admin") {
      Object.assign(listFilter, adminUserQuery());
    } else if (role === "customer") {
      Object.assign(listFilter, customerUserQuery());
    }

    const totalUsersForFilter = await User.countDocuments(listFilter);

    const users = await User.find(listFilter)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .select("name email number isAdmin roles createdAt lastLoginAt") // no password or tokens
      .lean();

    // Global metrics for header (not just this page)
    const totalUsers = await User.countDocuments({});
    const adminCount = await User.countDocuments(adminUserQuery());
    const customerCount = await User.countDocuments(customerUserQuery());

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.json({
      users,
      page,
      pages: Math.max(1, Math.ceil(totalUsersForFilter / pageSize)),
      totalUsersForFilter,
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

exports.adminUpdateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetRole = String(req.body?.role || "").trim().toLowerCase();

    if (!["admin", "customer"].includes(targetRole)) {
      return res.status(400).json({
        status: "fail",
        message: "Role must be either admin or customer.",
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ status: "fail", message: "User not found." });
    }

    const nextIsAdmin = targetRole === "admin";
    if (nextIsAdmin === isUserAdmin(targetUser)) {
      return res.status(200).json({
        status: "success",
        message: `User already has ${targetRole} access.`,
        user: targetUser,
      });
    }

    if (!nextIsAdmin) {
      if (String(req.user?._id) === String(targetUser._id)) {
        return res.status(400).json({
          status: "fail",
          message: "You cannot remove your own admin access here.",
        });
      }

      const adminCount = await User.countDocuments(adminUserQuery());
      if (adminCount <= 1 && isUserAdmin(targetUser)) {
        return res.status(400).json({
          status: "fail",
          message: "You cannot remove the last admin account.",
        });
      }
    }

    Object.assign(targetUser, buildRoleState(nextIsAdmin));
    await targetUser.save({ validateBeforeSave: false });

    return res.status(200).json({
      status: "success",
      message: nextIsAdmin ? "User promoted to admin." : "User moved back to customer.",
      user: targetUser,
    });
  } catch (err) {
    console.error("adminUpdateUserRole error:", err);
    return res.status(500).json({ status: "error", message: "Failed to update user role." });
  }
};
