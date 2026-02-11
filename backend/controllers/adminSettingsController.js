// controllers/adminSettingsController.js
const Settings = require("../models/Settings");

const ensureSettingsDoc = async () => {
  let doc = await Settings.findOne({ key: "default" });
  if (!doc) {
    doc = await Settings.create({ key: "default" });
  }
  return doc;
};

// GET /api/admin/settings
exports.getAdminSettings = async (req, res) => {
  try {
    const doc = await ensureSettingsDoc();
    res.json(doc);
  } catch (err) {
    console.error("getAdminSettings error:", err);
    res.status(500).json({ message: "Failed to load settings" });
  }
};

// PUT /api/admin/settings
exports.updateAdminSettings = async (req, res) => {
  try {
    const payload = req.body || {};
    const doc = await ensureSettingsDoc();

    if (payload.store) {
      doc.store = { ...(doc.store?.toObject?.() || {}), ...payload.store };
    }

    if (payload.order) {
      doc.order = { ...(doc.order?.toObject?.() || {}), ...payload.order };
    }

    if (payload.shipping) {
      doc.shipping = {
        ...(doc.shipping?.toObject?.() || {}),
        ...payload.shipping,
      };
    }

    if (payload.ui) {
      doc.ui = { ...(doc.ui?.toObject?.() || {}), ...payload.ui };
    }

    if (payload.maintenance) {
      doc.maintenance = {
        ...(doc.maintenance?.toObject?.() || {}),
        ...payload.maintenance,
      };
    }

    const updated = await doc.save();
    res.json(updated);
  } catch (err) {
    console.error("updateAdminSettings error:", err);
    res.status(500).json({ message: "Failed to update settings" });
  }
};
