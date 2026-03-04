const { getShippingQuote } = require("../services/orderService");
const { VALID_DELIVERY_OPTIONS } = require("../utils/shippingValidation");

exports.getShippingQuoteController = async (req, res) => {
  try {
    const division = String(req.body?.division || req.body?.shippingAddress?.division || "").trim();
    const district = String(req.body?.district || req.body?.shippingAddress?.district || "").trim();
    const itemsTotal = Number(req.body?.itemsTotal || 0);
    const deliveryOption = String(req.body?.deliveryOption || "STANDARD").trim().toUpperCase();

    if (!division) {
      return res.status(400).json({ message: "division is required" });
    }
    if (!VALID_DELIVERY_OPTIONS.includes(deliveryOption)) {
      return res.status(400).json({ message: "Invalid delivery option" });
    }

    const quote = await getShippingQuote({
      division,
      district,
      itemsTotal: Number.isFinite(itemsTotal) ? itemsTotal : 0,
      deliveryOption,
    });

    return res.json(quote);
  } catch (e) {
    console.error("getShippingQuoteController:", e);
    return res.status(500).json({ message: "Failed to get shipping quote" });
  }
};
