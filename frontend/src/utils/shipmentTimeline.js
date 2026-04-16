const normalize = (value) => String(value || "").trim();

export const COURIER_STATUS_LABELS = {
  AWAITING_BOOKING: "Awaiting booking",
  BOOKED: "Courier booked",
  PICKED: "Picked up",
  IN_TRANSIT: "In transit",
  AT_HUB: "At hub",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery failed",
  RETURN_INITIATED: "Return initiated",
  RETURNED_TO_MERCHANT: "Returned to merchant",
};

export const FULFILLMENT_MODE_LABELS = {
  THIRD_PARTY_COURIER: "Third-party courier",
  OWN_DELIVERY: "Own delivery",
};

export const getShipmentTimeline = (order) => {
  const events = Array.isArray(order?.shipment?.events) ? order.shipment.events : [];
  return events
    .filter((event) => event?.visibleToCustomer !== false)
    .map((event) => ({
      id: normalize(event?._id) || `${normalize(event?.code)}-${normalize(event?.createdAt)}`,
      code: normalize(event?.code),
      label: normalize(event?.label) || "Shipment update",
      details: normalize(event?.details),
      source: normalize(event?.source) || "system",
      createdAt: event?.createdAt,
    }))
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
};
