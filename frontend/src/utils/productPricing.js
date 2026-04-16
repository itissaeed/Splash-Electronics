const toNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const getProductDisplayPricing = (product, variant = null) => {
  const source = variant || product || {};
  const offerPricing = source?.offerPricing || null;

  if (offerPricing?.hasDiscount) {
    return {
      price: toNum(offerPricing.effectivePrice, 0),
      originalPrice: toNum(offerPricing.originalPrice, 0),
      hasDiscount: true,
      saveAmount: toNum(offerPricing.saveAmount, 0),
      label: String(offerPricing.label || "").trim(),
      activeOffer: offerPricing.activeOffer || null,
    };
  }

  const fallbackPrice = variant
    ? toNum(variant?.price, toNum(product?.basePrice, 0))
    : toNum(product?.basePrice ?? product?.variants?.[0]?.price ?? product?.price, 0);

  return {
    price: fallbackPrice,
    originalPrice: fallbackPrice,
    hasDiscount: false,
    saveAmount: 0,
    label: "",
    activeOffer: null,
  };
};
