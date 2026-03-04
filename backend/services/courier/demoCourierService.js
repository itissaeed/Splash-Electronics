const randomToken = (len = 8) =>
  Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, len);

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)] || items[0];

const DEMO_COURIERS = ["Pathao", "RedX", "Sundarban", "eCourier", "Steadfast"];
const courierFeeByDivision = (division) =>
  String(division || "").trim().toLowerCase() === "dhaka" ? 60 : 100;

const createDemoShipment = async ({ order }) => {
  const courier = randomFrom(DEMO_COURIERS);
  const trackingId = `${courier.slice(0, 2).toUpperCase()}-${Date.now()}-${randomToken(5)}`;
  const bookingRef = `BK-${order.orderNo}-${randomToken(4)}`;
  const trackingUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${courier} tracking ${trackingId}`
  )}`;

  return {
    provider: "demo",
    courier,
    trackingId,
    bookingRef,
    trackingUrl,
    pickupDate: new Date(),
    courierCharge: courierFeeByDivision(order?.shippingAddress?.division),
  };
};

module.exports = {
  createDemoShipment,
};
