// models/Settings.js
const mongoose = require("mongoose");

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "Splash Electronics" },
    logoUrl: String,
    supportEmail: String,
    supportPhone: String,
    supportHours: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    district: String,
    country: { type: String, default: "Bangladesh" },
  },
  { _id: false }
);

const orderSettingsSchema = new mongoose.Schema(
  {
    allowCOD: { type: Boolean, default: true },
    codMaxAmount: { type: Number, default: 50000 }, // BDT
    autoConfirmPaidOnline: { type: Boolean, default: true },
    orderPrefix: { type: String, default: "SPL" },
  },
  { _id: false }
);

const shippingSettingsSchema = new mongoose.Schema(
  {
    insideDhaka: { type: Number, default: 60 },
    outsideDhaka: { type: Number, default: 100 },
    freeShippingThreshold: { type: Number, default: 5000 },
    expressExtraInsideDhaka: { type: Number, default: 80 },
    expressExtraOutsideDhaka: { type: Number, default: 120 },
    regionalOverrides: [
      {
        division: String,
        district: String,
        fee: Number,
      },
    ],
  },
  { _id: false }
);

const uiSettingsSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: "#4F46E5" },
    secondaryColor: { type: String, default: "#EC4899" },
    homepageBannerText: { type: String, default: "" },
    announcementBarText: { type: String, default: "" },
  },
  { _id: false }
);

const maintenanceSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    message: {
      type: String,
      default:
        "We’re doing some maintenance. You may experience temporary issues.",
    },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    // Single-document config
    key: { type: String, required: true, unique: true, default: "default" },

    store: storeSettingsSchema,
    order: orderSettingsSchema,
    shipping: shippingSettingsSchema,
    ui: uiSettingsSchema,
    maintenance: maintenanceSettingsSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
