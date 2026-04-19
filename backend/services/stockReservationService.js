const Order = require("../models/Order");
const InventoryLedger = require("../models/InventoryLedger");
const Product = require("../models/Product");

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

  const orders = await Order.find(filter);
  for (const order of orders) {
    order.status = "cancelled";
    order.payment = order.payment || {};
    order.payment.status = "failed";
    await releaseReservationForOrder({
      order,
      releaseReason: "PAYMENT_TIMEOUT",
      ledgerReason: "PAYMENT_TIMEOUT_RELEASE",
      note: `Reservation expired before payment for order ${order.orderNo}`,
      when: now,
    });
    await order.save();
  }

  return {
    released: orders.length,
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

const enrichProductsWithInventory = async (products = [], now = new Date()) => {
  if (!Array.isArray(products) || products.length === 0) return products;

  const pairs = [];
  for (const product of products) {
    for (const variant of product?.variants || []) {
      if (variant?._id && product?._id) {
        pairs.push({ productId: product._id, variantId: variant._id });
      }
    }
  }

  const reservedMap = await getReservedQtyMap({ pairs, now });

  for (const product of products) {
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalAvailable = 0;

    product.variants = (product?.variants || []).map((variant) => {
      const key = toKey(product._id, variant?._id);
      const onHand = Number(variant?.countInStock || 0);
      const reservedQty = Number(reservedMap.get(key) || 0);
      const availableStock = getAvailableStock({
        physicalStock: onHand,
        reservedQty,
      });

      totalOnHand += onHand;
      totalReserved += reservedQty;
      totalAvailable += availableStock;

      const nextVariant =
        typeof variant?.toObject === "function" ? variant.toObject() : { ...variant };

      nextVariant.countInStock = onHand;
      nextVariant.reservedQty = reservedQty;
      nextVariant.availableStock = availableStock;
      return nextVariant;
    });

    product.inventorySummary = {
      onHand: totalOnHand,
      reserved: totalReserved,
      available: totalAvailable,
    };
  }

  return products;
};

const createReservationLedgerEntries = async ({ order, reason, type, note, session, items }) => {
  const sourceItems = Array.isArray(items) && items.length ? items : order?.items || [];
  const docs = sourceItems
    .filter((item) => item?.product && item?.variantId && Number(item?.qty || 0) > 0)
    .map((item) => ({
      product: item.product,
      variantId: item.variantId,
      sku: String(item?.sku || item?.skuSnapshot || "").trim(),
      type,
      reason,
      qty: Number(item.qty || 0),
      deltaQty:
        item?.deltaQty !== undefined
          ? Number(item.deltaQty || 0)
          : type === "RELEASE"
          ? Number(item.qty || 0)
          : -Number(item.qty || 0),
      oldOnHand: Number(item.oldOnHand || 0),
      newOnHand: Number(item.newOnHand || 0),
      oldReserved: Number(item.oldReserved || 0),
      newReserved: Number(item.newReserved || 0),
      oldAvailable: Number(item.oldAvailable || 0),
      newAvailable: Number(item.newAvailable || 0),
      order: order._id,
      actor: item?.actor || undefined,
      note,
    }));

  if (!docs.length) return;
  await InventoryLedger.create(docs, session ? { session, ordered: true } : undefined);
};

const releaseReservationForOrder = async ({
  order,
  releaseReason,
  ledgerReason,
  note,
  session,
  when = new Date(),
  actorId,
}) => {
  if (!order?.inventory?.reservationActive) return false;

  if (ledgerReason) {
    const items = [];
    const pairs = (order?.items || []).map((item) => ({
      productId: item.product,
      variantId: item.variantId,
    }));
    const reservedMap = await getReservedQtyMap({ pairs, now: when });

    for (const item of order?.items || []) {
      const product = await Product.findById(item.product);
      const variant = product?.variants?.id(item.variantId);
      if (!variant) continue;

      const oldOnHand = Number(variant.countInStock || 0);
      const oldReserved = Number(reservedMap.get(toKey(item.product, item.variantId)) || 0);
      const newReserved = Math.max(0, oldReserved - Number(item.qty || 0));

      items.push({
        product: item.product,
        variantId: item.variantId,
        sku: item.skuSnapshot || variant.sku || "",
        qty: Number(item.qty || 0),
        deltaQty: Number(item.qty || 0),
        oldOnHand,
        newOnHand: oldOnHand,
        oldReserved,
        newReserved,
        oldAvailable: getAvailableStock({ physicalStock: oldOnHand, reservedQty: oldReserved }),
        newAvailable: getAvailableStock({ physicalStock: oldOnHand, reservedQty: newReserved }),
        actor: actorId,
      });
    }

    await createReservationLedgerEntries({
      order,
      reason: ledgerReason,
      type: "RELEASE",
      note,
      session,
      items,
    });
  }

  order.inventory = order.inventory || {};
  order.inventory.reservationActive = false;
  order.inventory.reservationReleasedAt = when;
  order.inventory.reservationReleaseReason = releaseReason;
  order.inventory.reservedUntil = undefined;

  return true;
};

module.exports = {
  PREPAID_METHODS,
  buildActiveReservationMatch,
  releaseExpiredReservations,
  getReservedQtyMap,
  getAvailableStock,
  getReservationUntil,
  enrichProductsWithInventory,
  createReservationLedgerEntries,
  releaseReservationForOrder,
};
