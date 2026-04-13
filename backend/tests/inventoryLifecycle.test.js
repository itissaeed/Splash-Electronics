const assert = require("node:assert/strict");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const asSessionQuery = (value) => ({
  session: async () => value,
});

const createResponse = () => {
  const res = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  return res;
};

const withFreshModule = ({ target, mocks }) => {
  const targetPath = path.resolve(ROOT, target);
  const previousTarget = require.cache[targetPath];
  delete require.cache[targetPath];

  const restores = Object.entries(mocks).map(([relPath, mockExports]) => {
    const absPath = path.resolve(ROOT, relPath);
    const previous = require.cache[absPath];
    require.cache[absPath] = {
      id: absPath,
      filename: absPath,
      loaded: true,
      exports: mockExports,
    };
    return () => {
      if (previous) require.cache[absPath] = previous;
      else delete require.cache[absPath];
    };
  });

  const loaded = require(targetPath);

  return {
    loaded,
    restore() {
      delete require.cache[targetPath];
      if (previousTarget) require.cache[targetPath] = previousTarget;
      restores.reverse().forEach((fn) => fn());
    },
  };
};

const testCases = [];

const test = (name, fn) => {
  testCases.push({ name, fn });
};

test("createOrderFromCartForUser reserves stock and records reservation activity", async () => {
  const reservationCalls = [];
  const fakeUser = {
    _id: "user-1",
    name: "Ava",
    email: "ava@example.com",
    number: "01700000000",
    addresses: [],
    async save() {
      return this;
    },
  };
  const fakeCart = {
    user: "user-1",
    items: [{ product: "prod-1", variantId: "var-1", qty: 2, priceAtAdd: 1200 }],
    async save() {
      return this;
    },
  };
  const fakeVariant = {
    _id: "var-1",
    sku: "PHONE-BLK-128",
    price: 1200,
    countInStock: 5,
    images: [],
  };
  const fakeProduct = {
    _id: "prod-1",
    name: "Phone",
    category: "cat-1",
    variants: {
      id: (variantId) => (String(variantId) === "var-1" ? fakeVariant : null),
    },
  };

  const { loaded: orderService, restore } = withFreshModule({
    target: "services/orderService.js",
    mocks: {
      "models/Cart.js": {
        findOne: () => asSessionQuery(fakeCart),
      },
      "models/Order.js": {
        create: async (docs) =>
          docs.map((doc) => ({
            ...doc,
            _id: "order-1",
            async save() {
              return this;
            },
          })),
      },
      "models/product.js": {
        findOne: () => asSessionQuery(fakeProduct),
      },
      "models/Coupon.js": {
        findOne: () => ({
          session: async () => null,
        }),
        findById: () => ({
          session: async () => null,
        }),
      },
      "models/userModel.js": {
        findById: () => asSessionQuery(fakeUser),
      },
      "models/Settings.js": {
        findOne: () => ({
          lean: async () => null,
        }),
      },
      "utils/orderNo.js": () => "ORD-RESERVE-1",
      "services/stockReservationService.js": {
        PREPAID_METHODS: ["BKASH", "NAGAD", "CARD", "BANK", "SSLCOMMERZ"],
        getReservedQtyMap: async () => new Map(),
        getAvailableStock: ({ physicalStock, reservedQty }) =>
          Math.max(0, Number(physicalStock || 0) - Number(reservedQty || 0)),
        getReservationUntil: () => new Date("2026-04-13T10:00:00.000Z"),
        createReservationLedgerEntries: async (payload) => {
          reservationCalls.push(payload);
        },
      },
    },
  });

  try {
    const createdOrder = await orderService.createOrderFromCartForUser({
      userId: "user-1",
      shippingAddress: {
        recipientName: "Ava",
        phone: "01700000000",
        division: "Dhaka",
        district: "Dhaka",
        addressLine1: "Road 1",
      },
      paymentMethod: "SSLCOMMERZ",
      deliveryOption: "STANDARD",
      clearCart: false,
    });

    assert.equal(createdOrder.orderNo, "ORD-RESERVE-1");
    assert.equal(createdOrder.inventory.reservationActive, true);
    assert.ok(createdOrder.inventory.reservedAt instanceof Date);
    assert.equal(
      createdOrder.inventory.reservedUntil.toISOString(),
      "2026-04-13T10:00:00.000Z"
    );
    assert.equal(reservationCalls.length, 1);
    assert.equal(reservationCalls[0].type, "RESERVE");
    assert.equal(reservationCalls[0].reason, "ORDER_PLACED_RESERVE");
    assert.equal(reservationCalls[0].order.orderNo, "ORD-RESERVE-1");
  } finally {
    restore();
  }
});

test("cancelMyOrder releases reserved stock without touching on-hand inventory", async () => {
  const inventoryCreates = [];
  let productSaveCalled = false;
  const order = {
    _id: "order-2",
    orderNo: "ORD-CANCEL-1",
    user: "user-1",
    status: "pending",
    items: [{ product: "prod-1", variantId: "var-1", qty: 2 }],
    payment: { method: "COD", status: "unpaid" },
    inventory: {
      deducted: false,
      reservationActive: true,
      reservedUntil: new Date("2026-04-13T11:00:00.000Z"),
    },
    notes: "",
    async save() {
      return this;
    },
  };

  const { loaded: orderController, restore } = withFreshModule({
    target: "controllers/orderController.js",
    mocks: {
      "models/Order.js": {
        findOne: async () => order,
        aggregate: async () => [
          {
            _id: { product: "prod-1", variantId: "var-1" },
            qty: 2,
          },
        ],
      },
      "models/product.js": {
        findById: async () => ({
          variants: {
            id: () => ({
              sku: "PHONE-BLK-128",
              countInStock: 5,
            }),
          },
          async save() {
            productSaveCalled = true;
            return this;
          },
        }),
      },
      "models/Cart.js": {},
      "models/InventoryLedger.js": {
        create: async (docs) => {
          inventoryCreates.push(docs);
          return docs;
        },
      },
      "models/ReturnRefund.js": {
        findOne: async () => null,
        create: async () => null,
      },
      "services/orderService.js": {
        createOrderFromCartForUser: async () => {
          throw new Error("not used");
        },
        getShippingQuote: async () => ({}),
        validateCouponForItems: async () => ({}),
      },
      "utils/shippingValidation.js": {
        validateShippingPayload: () => ({ ok: true }),
      },
      "services/courier.js": {
        getCourierProvider: () => ({
          createShipment: async () => ({}),
        }),
      },
      "utils/visitorKey.js": {
        getVisitorKey: () => "visitor-1",
      },
    },
  });

  try {
    const req = {
      params: { orderNo: "ORD-CANCEL-1" },
      user: { _id: "user-1" },
      body: {},
    };
    const res = createResponse();

    await orderController.cancelMyOrder(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(order.status, "cancelled");
    assert.equal(order.inventory.reservationActive, false);
    assert.equal(order.inventory.reservationReleaseReason, "ORDER_CANCELLED");
    assert.equal(order.inventory.deducted, false);
    assert.equal(productSaveCalled, false);
    assert.equal(inventoryCreates.length, 1);
    assert.equal(Array.isArray(inventoryCreates[0]), true);
    assert.equal(inventoryCreates[0][0].type, "RELEASE");
    assert.equal(inventoryCreates[0][0].reason, "ORDER_CANCELLED_RELEASE");
    assert.equal(inventoryCreates[0][0].qty, 2);
  } finally {
    restore();
  }
});

test("adminUpdateOrderStatus deducts on-hand stock when order is shipped from processing", async () => {
  const ledgerRows = [];
  const variant = { _id: "var-1", countInStock: 5 };
  const product = {
    variants: {
      id: (variantId) => (String(variantId) === "var-1" ? variant : null),
    },
    async save() {
      return this;
    },
  };
  const order = {
    _id: "order-3",
    orderNo: "ORD-SHIP-1",
    status: "processing",
    user: "user-1",
    items: [{ product: "prod-1", variantId: "var-1", qty: 2, skuSnapshot: "PHONE-BLK-128" }],
    payment: { method: "COD", status: "unpaid" },
    pricing: { shippingFee: 60, itemsTotal: 2400, discountTotal: 0, grandTotal: 2460 },
    inventory: { deducted: false, reservationActive: true },
    shipment: { estimatedDaysMax: 4 },
    async save() {
      return this;
    },
  };

  const { loaded: orderController, restore } = withFreshModule({
    target: "controllers/orderController.js",
    mocks: {
      "models/Order.js": {
        findOne: async () => order,
        aggregate: async () => [
          {
            _id: { product: "prod-1", variantId: "var-1" },
            qty: 2,
          },
        ],
      },
      "models/product.js": {
        findById: async () => product,
      },
      "models/Cart.js": {},
      "models/InventoryLedger.js": {
        create: async (doc) => {
          ledgerRows.push(doc);
          return doc;
        },
      },
      "models/ReturnRefund.js": {
        findOne: async () => null,
        create: async () => null,
      },
      "services/orderService.js": {
        createOrderFromCartForUser: async () => {
          throw new Error("not used");
        },
        getShippingQuote: async () => ({}),
        validateCouponForItems: async () => ({}),
      },
      "utils/shippingValidation.js": {
        validateShippingPayload: () => ({ ok: true }),
      },
      "services/courier.js": {
        getCourierProvider: () => ({
          createShipment: async () => ({
            courier: "Pathao",
            trackingId: "TRK-1",
          }),
        }),
      },
      "utils/visitorKey.js": {
        getVisitorKey: () => "visitor-1",
      },
    },
  });

  try {
    const req = {
      params: { orderNo: "ORD-SHIP-1" },
      user: { _id: "admin-1", isAdmin: true },
      body: {
        status: "shipped",
        courier: "Pathao",
        trackingId: "TRK-1",
      },
    };
    const res = createResponse();

    await orderController.adminUpdateOrderStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(order.status, "shipped");
    assert.equal(variant.countInStock, 3);
    assert.equal(order.inventory.deducted, true);
    assert.equal(order.inventory.reservationActive, false);
    assert.equal(order.inventory.reservationReleaseReason, "FULFILLMENT_SHIPPED");
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].type, "OUT");
    assert.equal(ledgerRows[0].reason, "FULFILLMENT_SHIPPED");
    assert.equal(ledgerRows[0].qty, 2);
  } finally {
    restore();
  }
});

test("adminUpdateOrderStatus rejects skipping directly from pending to shipped", async () => {
  const order = {
    _id: "order-4",
    orderNo: "ORD-SHIP-2",
    status: "pending",
    user: "user-1",
    items: [],
    payment: { method: "COD", status: "unpaid" },
    pricing: { shippingFee: 60, itemsTotal: 2400, discountTotal: 0, grandTotal: 2460 },
    inventory: { deducted: false, reservationActive: true },
    shipment: {},
    async save() {
      return this;
    },
  };

  const { loaded: orderController, restore } = withFreshModule({
    target: "controllers/orderController.js",
    mocks: {
      "models/Order.js": {
        findOne: async () => order,
        aggregate: async () => [],
      },
      "models/product.js": {
        findById: async () => null,
      },
      "models/Cart.js": {},
      "models/InventoryLedger.js": {
        create: async () => null,
      },
      "models/ReturnRefund.js": {
        findOne: async () => null,
        create: async () => null,
      },
      "services/orderService.js": {
        createOrderFromCartForUser: async () => {
          throw new Error("not used");
        },
        getShippingQuote: async () => ({}),
        validateCouponForItems: async () => ({}),
      },
      "utils/shippingValidation.js": {
        validateShippingPayload: () => ({ ok: true }),
      },
      "services/courier.js": {
        getCourierProvider: () => ({
          createShipment: async () => ({
            courier: "Pathao",
            trackingId: "TRK-1",
          }),
        }),
      },
      "utils/visitorKey.js": {
        getVisitorKey: () => "visitor-1",
      },
    },
  });

  try {
    const req = {
      params: { orderNo: "ORD-SHIP-2" },
      user: { _id: "admin-1", isAdmin: true },
      body: {
        status: "shipped",
        courier: "Pathao",
        trackingId: "TRK-1",
      },
    };
    const res = createResponse();

    await orderController.adminUpdateOrderStatus(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.payload.message, /Invalid status transition/i);
    assert.equal(order.status, "pending");
    assert.equal(order.inventory.deducted, false);
  } finally {
    restore();
  }
});

const run = async () => {
  let failed = 0;

  for (const { name, fn } of testCases) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`All ${testCases.length} inventory lifecycle tests passed.`);
};

if (require.main === module) {
  run();
}
