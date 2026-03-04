const Order = require("../models/Order");

const PREPAID_METHODS = ["BKASH", "NAGAD", "CARD", "BANK", "SSLCOMMERZ"];

const toKey = (productId, variantId) => `${String(productId)}|${String(variantId)}`;

const buildActiveReservationMatch = (now = new Date()) => ({
  status: "pending",
  "inventory.deducted": { $ne: true },
  "inventory.reservationActive": true,
  $or: [
    // Prepaid orders still waiting for payment, but hold is not expired.
    {
      "payment.method": { $in: PREPAID_METHODS },
      "payment.status": "unpaid",
      "inventory.reservedUntil": { $gt: now },
    },
    // Paid orders remain reserved until admin fulfills or cancels.
    {
      "payment.status": "paid",
    },
    // Non-prepaid (e.g. COD) pending orders are also reserved.
    {
      "payment.method": { $nin: PREPAID_METHODS },
    },
  ],
});

const releaseExpiredReservations = async () => {
  const now = new Date();
  const filter = {
    status: "pending",
    "inventory.deducted": { $ne: true },
    "inventory.reservationActive": true,
    "payment.method": { $in: PREPAID_METHODS },
    "payment.status": "unpaid",
    "inventory.reservedUntil": { $lte: now },
  };

  const result = await Order.updateMany(
    filter,
    {
      $set: {
        status: "cancelled",
        "payment.status": "failed",
        "inventory.reservationActive": false,
        "inventory.reservationReleasedAt": now,
        "inventory.reservationReleaseReason": "PAYMENT_TIMEOUT",
      },
    }
  );

  return {
    released: Number(result?.modifiedCount || 0),
  };
};

const getReservedQtyMap = async ({ pairs, now = new Date() }) => {
  const map = new Map();
  if (!Array.isArray(pairs) || pairs.length === 0) return map;

  const keySet = new Set(pairs.map((p) => toKey(p.productId, p.variantId)));

  const rows = await Order.aggregate([
    { $match: buildActiveReservationMatch(now) },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          product: "$items.product",
          variantId: "$items.variantId",
        },
        qty: { $sum: "$items.qty" },
      },
    },
  ]);

  for (const row of rows) {
    const key = toKey(row?._id?.product, row?._id?.variantId);
    if (keySet.has(key)) {
      map.set(key, Number(row?.qty || 0));
    }
  }
  return map;
};

const getAvailableStock = ({ physicalStock, reservedQty }) =>
  Math.max(0, Number(physicalStock || 0) - Number(reservedQty || 0));

const getReservationWindowMinutes = () => {
  const raw = Number(process.env.STOCK_RESERVATION_MINUTES || 15);
  if (!Number.isFinite(raw) || raw <= 0) return 15;
  return Math.floor(raw);
};

const getReservationUntil = () => {
  const now = new Date();
  const mins = getReservationWindowMinutes();
  now.setMinutes(now.getMinutes() + mins);
  return now;
};

module.exports = {
  PREPAID_METHODS,
  buildActiveReservationMatch,
  releaseExpiredReservations,
  getReservedQtyMap,
  getAvailableStock,
  getReservationUntil,
};
