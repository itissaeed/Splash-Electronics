const { PREPAID_METHODS } = require("../services/stockReservationService");

const REVENUE_RECOGNIZED_STATUSES = ["confirmed", "processing", "shipped", "delivered"];

const buildRevenueMatch = () => ({
  $or: [
    { status: { $in: REVENUE_RECOGNIZED_STATUSES } },
    {
      status: "pending",
      "payment.status": "paid",
      "payment.method": { $in: PREPAID_METHODS },
    },
  ],
});

const buildRevenueExpr = () => ({
  $or: [
    { $in: ["$status", REVENUE_RECOGNIZED_STATUSES] },
    {
      $and: [
        { $eq: ["$status", "pending"] },
        { $eq: ["$payment.status", "paid"] },
        { $in: ["$payment.method", PREPAID_METHODS] },
      ],
    },
  ],
});

module.exports = {
  REVENUE_RECOGNIZED_STATUSES,
  buildRevenueMatch,
  buildRevenueExpr,
};
