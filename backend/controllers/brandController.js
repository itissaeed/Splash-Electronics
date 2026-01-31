// controllers/brandController.js
const Brand = require("../models/Brand");

exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json(brands);
  } catch (e) {
    console.error("getBrands Error:", e);
    res.status(500).json({ message: "Failed to fetch brands" });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, slug, logoUrl, isActive } = req.body;
    if (!name || !slug) return res.status(400).json({ message: "name and slug are required" });

    const exists = await Brand.findOne({ slug: String(slug).toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Brand slug already exists" });

    const brand = await Brand.create({
      name: String(name).trim(),
      slug: String(slug).toLowerCase().trim(),
      logoUrl: logoUrl || "",
      isActive: isActive !== undefined ? !!isActive : true,
    });

    res.status(201).json(brand);
  } catch (e) {
    console.error("createBrand Error:", e);
    res.status(500).json({ message: "Failed to create brand" });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const up = req.body;
    if (up.name !== undefined) brand.name = String(up.name).trim();
    if (up.slug !== undefined) brand.slug = String(up.slug).toLowerCase().trim();
    if (up.logoUrl !== undefined) brand.logoUrl = up.logoUrl;
    if (up.isActive !== undefined) brand.isActive = !!up.isActive;

    const updated = await brand.save();
    res.json(updated);
  } catch (e) {
    console.error("updateBrand Error:", e);
    res.status(500).json({ message: "Failed to update brand" });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    await brand.deleteOne();
    res.json({ message: "Brand removed" });
  } catch (e) {
    console.error("deleteBrand Error:", e);
    res.status(500).json({ message: "Failed to delete brand" });
  }
};
