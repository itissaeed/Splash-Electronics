// controllers/categoryController.js
const Category = require("../models/Category");

exports.getCategories = async (req, res) => {
  try {
    const cats = await Category.find({}).sort({ name: 1 });
    res.json(cats);
  } catch (e) {
    console.error("getCategories Error:", e);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, slug, parent, attributes } = req.body;
    if (!name || !slug) return res.status(400).json({ message: "name and slug are required" });

    const exists = await Category.findOne({ slug: String(slug).toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Category slug already exists" });

    const cat = await Category.create({
      name: String(name).trim(),
      slug: String(slug).toLowerCase().trim(),
      parent: parent || null,
      attributes: Array.isArray(attributes) ? attributes : [],
    });

    res.status(201).json(cat);
  } catch (e) {
    console.error("createCategory Error:", e);
    res.status(500).json({ message: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    const up = req.body;
    if (up.name !== undefined) cat.name = String(up.name).trim();
    if (up.slug !== undefined) cat.slug = String(up.slug).toLowerCase().trim();
    if (up.parent !== undefined) cat.parent = up.parent || null;
    if (up.attributes !== undefined) cat.attributes = Array.isArray(up.attributes) ? up.attributes : cat.attributes;

    const updated = await cat.save();
    res.json(updated);
  } catch (e) {
    console.error("updateCategory Error:", e);
    res.status(500).json({ message: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    await cat.deleteOne();
    res.json({ message: "Category removed" });
  } catch (e) {
    console.error("deleteCategory Error:", e);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
