const mongoose = require("mongoose");
const Offer = require("../models/Offer");

const toNum = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normalizeIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter((entry) => mongoose.Types.ObjectId.isValid(entry));
};

const normalizeOfferType = (value) => {
  const normalized = String(value || "").toUpperCase().trim();
  return ["PERCENT", "FIXED_AMOUNT"].includes(normalized) ? normalized : "PERCENT";
};

const normalizeScopeType = (value) => {
  const normalized = String(value || "").toUpperCase().trim();
  return ["ALL", "PRODUCTS", "CATEGORIES"].includes(normalized) ? normalized : "ALL";
};

exports.adminListOffers = async (req, res) => {
  try {
    const pageSize = toNum(req.query.limit, 20);
    const page = toNum(req.query.page, 1);
    const keyword = String(req.query.keyword || "").trim();
    const status = String(req.query.status || "").trim();
    const filter = {};

    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { label: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    const now = new Date();
    if (status === "active") {
      filter.isActive = true;
      filter.$and = [
        { $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validTo: { $exists: false } }, { validTo: null }, { validTo: { $gte: now } }] },
      ];
    } else if (status === "upcoming") {
      filter.isActive = true;
      filter.validFrom = { $gt: now };
    } else if (status === "expired") {
      filter.isActive = true;
      filter.validTo = { $lt: now };
    } else if (status === "disabled") {
      filter.isActive = false;
    }

    const totalOffers = await Offer.countDocuments(filter);
    const offers = await Offer.find(filter)
      .populate("applicableProducts", "name slug")
      .populate("applicableCategories", "name slug")
      .sort({ priority: -1, createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .lean();

    const totalAll = await Offer.countDocuments({});
    const activeFlag = await Offer.countDocuments({ isActive: true });
    const upcomingCount = await Offer.countDocuments({ isActive: true, validFrom: { $gt: now } });
    const expiredCount = await Offer.countDocuments({ isActive: true, validTo: { $lt: now } });

    res.json({
      offers,
      page,
      pages: Math.max(1, Math.ceil(totalOffers / pageSize)),
      totalOffers,
      metrics: { totalAll, activeFlag, upcomingCount, expiredCount },
    });
  } catch (error) {
    console.error("adminListOffers error:", error);
    res.status(500).json({ message: "Failed to load offers" });
  }
};

exports.adminCreateOffer = async (req, res) => {
  try {
    const {
      name,
      description,
      label,
      type,
      value,
      priority,
      scopeType,
      applicableProducts,
      applicableCategories,
      validFrom,
      validTo,
      isActive,
    } = req.body;

    if (!String(name || "").trim() || value === undefined) {
      return res.status(400).json({ message: "name and value are required" });
    }

    const payload = {
      name: String(name).trim(),
      description: String(description || "").trim(),
      label: String(label || "").trim(),
      type: normalizeOfferType(type),
      value: Math.max(0, toNum(value, 0)),
      priority: toNum(priority, 0),
      scopeType: normalizeScopeType(scopeType),
      applicableProducts: normalizeIdArray(applicableProducts),
      applicableCategories: normalizeIdArray(applicableCategories),
      isActive: !!isActive,
    };
    if (validFrom) payload.validFrom = new Date(validFrom);
    if (validTo) payload.validTo = new Date(validTo);

    const offer = await Offer.create(payload);
    res.status(201).json(offer);
  } catch (error) {
    console.error("adminCreateOffer error:", error);
    res.status(500).json({ message: "Failed to create offer" });
  }
};

exports.adminUpdateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const {
      name,
      description,
      label,
      type,
      value,
      priority,
      scopeType,
      applicableProducts,
      applicableCategories,
      validFrom,
      validTo,
      isActive,
    } = req.body;

    if (name !== undefined) offer.name = String(name || "").trim();
    if (description !== undefined) offer.description = String(description || "").trim();
    if (label !== undefined) offer.label = String(label || "").trim();
    if (type !== undefined) offer.type = normalizeOfferType(type);
    if (value !== undefined) offer.value = Math.max(0, toNum(value, offer.value));
    if (priority !== undefined) offer.priority = toNum(priority, offer.priority);
    if (scopeType !== undefined) offer.scopeType = normalizeScopeType(scopeType);
    if (applicableProducts !== undefined) offer.applicableProducts = normalizeIdArray(applicableProducts);
    if (applicableCategories !== undefined) offer.applicableCategories = normalizeIdArray(applicableCategories);
    if (validFrom !== undefined) offer.validFrom = validFrom ? new Date(validFrom) : undefined;
    if (validTo !== undefined) offer.validTo = validTo ? new Date(validTo) : undefined;
    if (isActive !== undefined) offer.isActive = !!isActive;

    const updated = await offer.save();
    res.json(updated);
  } catch (error) {
    console.error("adminUpdateOffer error:", error);
    res.status(500).json({ message: "Failed to update offer" });
  }
};

exports.adminDeleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    offer.isActive = false;
    const updated = await offer.save();
    res.json({ message: "Offer deactivated", offer: updated });
  } catch (error) {
    console.error("adminDeleteOffer error:", error);
    res.status(500).json({ message: "Failed to deactivate offer" });
  }
};
