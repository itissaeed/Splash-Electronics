const Settings = require("../models/Settings");

// Ensure single settings doc exists
async function getOrCreateDefaultSettings() {
  let doc = await Settings.findOne({ key: "default" });
  if (!doc) {
    doc = await Settings.create({ key: "default" }); // uses schema defaults
  }
  return doc;
}

// GET /api/settings/public
exports.getPublicSettings = async (req, res) => {
  try {
    const doc = await getOrCreateDefaultSettings();

    // Only expose what frontend needs (safe)
    return res.json({
      storeName: doc.store?.storeName || "Splash Electronics",
      logoUrl: doc.store?.logoUrl || "",
      supportEmail: doc.store?.supportEmail || "",
      supportPhone: doc.store?.supportPhone || "",
      supportHours: doc.store?.supportHours || "",
      addressLine1: doc.store?.addressLine1 || "",
      addressLine2: doc.store?.addressLine2 || "",
      city: doc.store?.city || "",
      district: doc.store?.district || "",
      country: doc.store?.country || "Bangladesh",

      // UI
      primaryColor: doc.ui?.primaryColor || "#4F46E5",
      secondaryColor: doc.ui?.secondaryColor || "#EC4899",
      homepageBannerText: doc.ui?.homepageBannerText || "",
      announcementBarText: doc.ui?.announcementBarText || "",

      // Maintenance
      maintenanceEnabled: !!doc.maintenance?.enabled,
      maintenanceMessage:
        doc.maintenance?.message ||
        "We’re doing some maintenance. You may experience temporary issues.",
    });
  } catch (err) {
    console.error("getPublicSettings:", err);
    res.status(500).json({ message: "Failed to load public settings" });
  }
};
