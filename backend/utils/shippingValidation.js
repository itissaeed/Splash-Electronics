const VALID_DELIVERY_OPTIONS = ["STANDARD", "EXPRESS"];

const PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

const normalizeString = (value) => String(value || "").trim();

const validateShippingPayload = ({ shippingAddress, deliveryOption }) => {
  const normalizedAddress = {
    recipientName: normalizeString(shippingAddress?.recipientName),
    phone: normalizeString(shippingAddress?.phone),
    division: normalizeString(shippingAddress?.division),
    district: normalizeString(shippingAddress?.district),
    upazila: normalizeString(shippingAddress?.upazila),
    area: normalizeString(shippingAddress?.area),
    postalCode: normalizeString(shippingAddress?.postalCode),
    addressLine1: normalizeString(shippingAddress?.addressLine1),
    addressLine2: normalizeString(shippingAddress?.addressLine2),
  };

  if (!normalizedAddress.recipientName) {
    return { ok: false, message: "Recipient name is required" };
  }
  if (!normalizedAddress.phone) {
    return { ok: false, message: "Phone is required" };
  }
  if (!PHONE_REGEX.test(normalizedAddress.phone)) {
    return {
      ok: false,
      message: "Invalid phone number. Use a valid Bangladeshi mobile number",
    };
  }
  if (!normalizedAddress.division || !normalizedAddress.district || !normalizedAddress.addressLine1) {
    return {
      ok: false,
      message: "shippingAddress (division, district, addressLine1) required",
    };
  }

  const normalizedOption = normalizeString(deliveryOption || "STANDARD").toUpperCase();
  if (!VALID_DELIVERY_OPTIONS.includes(normalizedOption)) {
    return { ok: false, message: "Invalid delivery option" };
  }

  return {
    ok: true,
    shippingAddress: normalizedAddress,
    deliveryOption: normalizedOption,
  };
};

module.exports = {
  VALID_DELIVERY_OPTIONS,
  validateShippingPayload,
};
