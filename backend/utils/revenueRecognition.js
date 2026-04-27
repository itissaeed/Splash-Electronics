const { PREPAID_METHODS } = require("../services/stockReservationService");

const REVENUE_RECOGNIZED_STATUSES = ["confirmed", "processing", "shipped", "delivered"];
const COLLECTED_PAYMENT_STATUSES = ["paid", "partial_refund", "refunded"];

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

const buildCollectedRevenueMatch = () => ({
  "payment.status": { $in: COLLECTED_PAYMENT_STATUSES },
});

const buildCollectedRevenueExpr = () => ({
  $in: ["$payment.status", COLLECTED_PAYMENT_STATUSES],
});

module.exports = {
  COLLECTED_PAYMENT_STATUSES,
  REVENUE_RECOGNIZED_STATUSES,
  buildCollectedRevenueExpr,
  buildCollectedRevenueMatch,
  buildRevenueMatch,
  buildRevenueExpr,
};
