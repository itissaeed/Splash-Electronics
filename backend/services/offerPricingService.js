const Offer = require("../models/Offer");

const normalizeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const toNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const isOfferActive = (offer, now = new Date()) => {
  if (!offer?.isActive) return false;
  const from = normalizeDate(offer.validFrom);
  const to = normalizeDate(offer.validTo);
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
};

const toPlainObject = (value) => (value?.toObject ? value.toObject() : value);

const setTransient = (target, key, value) => {
  if (!target || !key) return;
  if (target._doc) {
    target._doc[key] = value;
    return;
  }
  target[key] = value;
};

const buildOfferSummary = (offer) => ({
  _id: offer?._id,
  name: offer?.name || "",
  label: offer?.label || "",
  type: offer?.type || "PERCENT",
  value: toNum(offer?.value, 0),
  scopeType: offer?.scopeType || "ALL",
  audienceType: offer?.audienceType || "ALL",
  priority: toNum(offer?.priority, 0),
  validFrom: offer?.validFrom || null,
  validTo: offer?.validTo || null,
});

const calculateDiscountedPrice = ({ price, offer }) => {
  const basePrice = Math.max(0, toNum(price, 0));
  if (!offer || basePrice <= 0) {
    return {
      originalPrice: basePrice,
      effectivePrice: basePrice,
      saveAmount: 0,
      hasDiscount: false,
      activeOffer: null,
      label: "",
    };
  }

  let discounted = basePrice;
  if (String(offer.type).toUpperCase() === "PERCENT") {
    discounted = basePrice - (basePrice * toNum(offer.value, 0)) / 100;
  } else {
    discounted = basePrice - toNum(offer.value, 0);
  }

  discounted = Math.max(0, Math.round(discounted * 100) / 100);
  const saveAmount = Math.max(0, Math.round((basePrice - discounted) * 100) / 100);

  return {
    originalPrice: basePrice,
    effectivePrice: discounted,
    saveAmount,
    hasDiscount: saveAmount > 0,
    activeOffer: saveAmount > 0 ? buildOfferSummary(offer) : null,
    label: saveAmount > 0 ? String(offer?.label || "").trim() : "",
  };
};

const pickBestOffer = ({ offers, price }) => {
  let best = null;
  let bestPricing = calculateDiscountedPrice({ price, offer: null });

  for (const offer of offers || []) {
    const pricing = calculateDiscountedPrice({ price, offer });
    if (!pricing.hasDiscount) continue;

    const currentPriority = toNum(offer?.priority, 0);
    const bestPriority = toNum(best?.priority, 0);
    const pricingWins =
      !best ||
      pricing.effectivePrice < bestPricing.effectivePrice ||
      (pricing.effectivePrice === bestPricing.effectivePrice &&
        (currentPriority > bestPriority ||
          (currentPriority === bestPriority &&
            new Date(offer?.createdAt || 0).getTime() > new Date(best?.createdAt || 0).getTime())));

    if (pricingWins) {
      best = offer;
      bestPricing = pricing;
    }
  }

  return bestPricing;
};

const getApplicableOffersForProduct = ({ product, offers, userId = null }) => {
  const productId = String(product?._id || "");
  const categoryId = String(product?.category?._id || product?.category || "");
  return (offers || []).filter((offer) => {
    const audienceType = String(offer?.audienceType || "ALL").toUpperCase();
    if (audienceType === "SPECIFIC_USERS") {
      if (!userId) return false;
      const hasMatchingUser = (offer?.applicableUsers || []).some((id) => String(id) === String(userId));
      if (!hasMatchingUser) return false;
    }

    const scopeType = String(offer?.scopeType || "ALL").toUpperCase();
    if (scopeType === "ALL") return true;
    if (scopeType === "PRODUCTS") {
      return (offer?.applicableProducts || []).some((id) => String(id) === productId);
    }
    if (scopeType === "CATEGORIES") {
      return (offer?.applicableCategories || []).some((id) => String(id) === categoryId);
    }
    return false;
  });
};

const applyOfferPricingToProducts = async (products, opts = {}) => {
  const list = Array.isArray(products) ? products : [];
  if (!list.length) return list;

  const now = opts.now instanceof Date ? opts.now : new Date();
  const userId = opts.userId || null;
  const activeOffers = (opts.offers || (await Offer.find({ isActive: true }).lean()))
    .filter((offer) => isOfferActive(offer, now));

  for (const product of list) {
    const applicableOffers = getApplicableOffersForProduct({ product, offers: activeOffers, userId });
    const basePricing = pickBestOffer({
      offers: applicableOffers,
      price: product?.basePrice ?? 0,
    });
    setTransient(product, "offerPricing", basePricing);

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    for (const variant of variants) {
      const variantPricing = pickBestOffer({
        offers: applicableOffers,
        price: variant?.price ?? 0,
      });
      setTransient(variant, "offerPricing", variantPricing);
    }
  }

  return list;
};

module.exports = {
  applyOfferPricingToProducts,
  calculateDiscountedPrice,
  pickBestOffer,
};
