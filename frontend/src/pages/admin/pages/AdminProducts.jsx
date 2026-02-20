import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  Search,
  Tag,
  Shapes,
  Loader2,
} from "lucide-react";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const moneyBDT = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const DEFAULT_VARIANT_ATTRIBUTE_KEYS = ["color", "ram", "storage"];
const CATEGORY_ATTRIBUTE_PRESETS = {
  smartphone: ["color", "ram", "storage", "screen_size", "chipset", "battery"],
  smartphones: ["color", "ram", "storage", "screen_size", "chipset", "battery"],
  laptop: ["color", "ram", "storage", "processor", "screen_size", "gpu"],
  laptops: ["color", "ram", "storage", "processor", "screen_size", "gpu"],
  keyboard: ["color", "switch_type", "layout", "connectivity", "keycaps"],
  keyboards: ["color", "switch_type", "layout", "connectivity", "keycaps"],
  mouse: ["color", "dpi", "connectivity", "buttons", "weight"],
  mice: ["color", "dpi", "connectivity", "buttons", "weight"],
  headset: ["color", "connectivity", "driver_size", "microphone", "battery_life"],
  headsets: ["color", "connectivity", "driver_size", "microphone", "battery_life"],
  tab: ["color", "ram", "storage", "screen_size", "battery", "chipset"],
  tabs: ["color", "ram", "storage", "screen_size", "battery", "chipset"],
  tablet: ["color", "ram", "storage", "screen_size", "battery", "chipset"],
  tablets: ["color", "ram", "storage", "screen_size", "battery", "chipset"],
};

const toAttributeKey = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

const formatAttributeLabel = (key) =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const getKeyboardNavigableFields = (container) => {
  if (!container) return [];
  const selectors = [
    "input:not([type='hidden']):not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
  ].join(",");
  return Array.from(container.querySelectorAll(selectors)).filter(
    (el) => el.tabIndex !== -1 && el.offsetParent !== null
  );
};

const getPresetAttributeKeys = (categoryLike) => {
  const slugKey = toAttributeKey(categoryLike?.slug);
  if (slugKey && CATEGORY_ATTRIBUTE_PRESETS[slugKey]) {
    return CATEGORY_ATTRIBUTE_PRESETS[slugKey];
  }
  const nameKey = toAttributeKey(categoryLike?.name);
  if (nameKey && CATEGORY_ATTRIBUTE_PRESETS[nameKey]) {
    return CATEGORY_ATTRIBUTE_PRESETS[nameKey];
  }
  return [];
};

const emptyVariant = (isDefault = false) => ({
  _id: null,
  sku: "",
  price: "",
  countInStock: "",
  isDefault,
  attributes: {},
  images: [],
});

function Modal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border overflow-hidden">
          <div className="p-5 border-b flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-gray-900">{title}</div>
              {subtitle && (
                <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  // data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState(null);

  // quick add modal (brand/category)
  const [createType, setCreateType] = useState(null); // "brand" | "category" | null
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createAttributes, setCreateAttributes] = useState("");

  // form
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    brand: "",
    category: "",
    description: "",
    basePrice: "",
    warrantyMonths: "",
    isFeatured: false,
    isActive: true,
  });

  // variants
  const [variants, setVariants] = useState([emptyVariant(true)]);

  // ✅ per-variant uploads: { [idx]: File[] }
  const [variantFiles, setVariantFiles] = useState({});
  const handleVariantFiles = (idx, filesList) => {
    const files = Array.from(filesList || []);
    setVariantFiles((prev) => ({ ...prev, [idx]: files }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      slug: "",
      brand: "",
      category: "",
      description: "",
      basePrice: "",
      warrantyMonths: "",
      isFeatured: false,
      isActive: true,
    });
    setVariants([emptyVariant(true)]);
    setVariantFiles({});
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSaving(false);
  };

  const openCreate = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);

      // IMPORTANT:
      // If your api baseURL already includes /api, keep "/products/admin"
      // If not, change to "/api/products/admin"
      const [pRes, cRes, bRes] = await Promise.all([
        api.get("/products/admin"),
        api.get("/categories"),
        api.get("/brands"),
      ]);

      setProducts(pRes.data?.products || []);
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
      setBrands(Array.isArray(bRes.data) ? bRes.data : []);
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
        "Failed to load admin data. Ensure GET /products/admin, /categories, /brands exist."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // auto slug while creating product
  useEffect(() => {
    if (!editingId) {
      setFormData((prev) => ({
        ...prev,
        slug: prev.slug ? prev.slug : slugify(prev.name),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === formData.category) || null,
    [categories, formData.category]
  );

  const variantAttributeKeys = useMemo(() => {
    const dbKeys = Array.isArray(selectedCategory?.attributes)
      ? selectedCategory.attributes.map(toAttributeKey).filter(Boolean)
      : [];
    if (dbKeys.length) return Array.from(new Set(dbKeys));

    const presetKeys = getPresetAttributeKeys(selectedCategory);
    if (presetKeys.length) return Array.from(new Set(presetKeys));

    return DEFAULT_VARIANT_ATTRIBUTE_KEYS;
  }, [selectedCategory]);

  useEffect(() => {
    if (!variantAttributeKeys.length) return;
    setVariants((prev) => {
      let changed = false;
      const next = prev.map((v) => {
        const attrs = { ...(v.attributes || {}) };
        let localChange = false;
        for (const key of variantAttributeKeys) {
          if (attrs[key] === undefined) {
            attrs[key] = "";
            localChange = true;
          }
        }
        if (!localChange) return v;
        changed = true;
        return { ...v, attributes: attrs };
      });
      return changed ? next : prev;
    });
  }, [variantAttributeKeys]);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const matchesText =
        !term ||
        p?.name?.toLowerCase().includes(term) ||
        p?.slug?.toLowerCase().includes(term) ||
        p?.brand?.name?.toLowerCase?.().includes(term) ||
        p?.category?.name?.toLowerCase?.().includes(term);

      const matchesBrand =
        !filterBrand || (p?.brand?._id || p?.brand) === filterBrand;

      const matchesCategory =
        !filterCategory || (p?.category?._id || p?.category) === filterCategory;

      const matchesFeatured = !onlyFeatured || !!p.isFeatured;
      const matchesActive = !onlyActive || !!p.isActive;

      return (
        matchesText &&
        matchesBrand &&
        matchesCategory &&
        matchesFeatured &&
        matchesActive
      );
    });
  }, [products, q, filterBrand, filterCategory, onlyFeatured, onlyActive]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const focusByOffset = (container, fromEl, offset) => {
    const fields = getKeyboardNavigableFields(container);
    const idx = fields.indexOf(fromEl);
    if (idx < 0) return;
    const nextIdx = idx + offset;
    if (nextIdx < 0 || nextIdx >= fields.length) return;
    fields[nextIdx].focus();
  };

  const handleFormKeyboardNav = (e) => {
    const target = e.target;
    if (!target || !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName)) {
      return;
    }

    const formEl = e.currentTarget;
    const isTextarea = target.tagName === "TEXTAREA";
    const isButton = target.tagName === "BUTTON";

    // Enter moves to next field (Shift+Enter previous). Keep textarea line-break behavior.
    if (e.key === "Enter" && !isTextarea && !isButton) {
      e.preventDefault();
      focusByOffset(formEl, target, e.shiftKey ? -1 : 1);
      return;
    }

    // Alt + Arrow keys navigate between form controls.
    if (e.altKey && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
      focusByOffset(formEl, target, forward ? 1 : -1);
    }
  };

  const handleVariantChange = (idx, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const handleVariantAttr = (idx, key, value) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, attributes: { ...v.attributes, [key]: value } } : v
      )
    );
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, emptyVariant(false)]);
  };

  // ✅ fixed: remove variant + reindex variantFiles
  const removeVariant = (idx) => {
    setVariants((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Ensure exactly one default after remove
      const hasDefault = next.some((x) => x.isDefault);
      if (!hasDefault && next.length) next[0] = { ...next[0], isDefault: true };
      return next;
    });

    setVariantFiles((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, files]) => {
        const i = Number(k);
        if (i === idx) return;
        next[i > idx ? i - 1 : i] = files;
      });
      return next;
    });
  };

  // ✅ enforce single default instantly
  const setDefaultVariant = (idx) => {
    setVariants((prev) => prev.map((v, i) => ({ ...v, isDefault: i === idx })));
  };

  // ✅ upload helper (single upload endpoint, loops files)
  const uploadImagesToVariant = async (productId, variantId, files = []) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append("image", file);

      await api.post(`/products/${productId}/images?variantId=${variantId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setFormData({
      name: p.name || "",
      slug: p.slug || "",
      brand: p.brand?._id || p.brand || "",
      category: p.category?._id || p.category || "",
      description: p.description || "",
      basePrice: p.basePrice ?? "",
      warrantyMonths: p.warrantyMonths ?? "",
      isFeatured: !!p.isFeatured,
      isActive: p.isActive !== false,
    });

    const mapped = (p.variants || []).map((x) => ({
      _id: x._id,
      sku: x.sku || "",
      price: x.price ?? "",
      countInStock: x.countInStock ?? "",
      isDefault: !!x.isDefault,
      attributes: { ...(x.attributes || {}) },
      images: Array.isArray(x.images) ? x.images : [],
    }));

    // ✅ ensure there is exactly 1 default (server data might be messy)
    if (mapped.length) {
      const defaults = mapped.filter((x) => x.isDefault).length;
      if (defaults === 0) mapped[0].isDefault = true;
      if (defaults > 1) {
        let first = true;
        for (const v of mapped) {
          if (v.isDefault && first) first = false;
          else if (v.isDefault && !first) v.isDefault = false;
        }
      }
    }

    setVariants(mapped.length ? mapped : variants);
    setVariantFiles({});
    setDrawerOpen(true);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete product.");
    }
  };

  const deleteVariantImage = async (productId, variantId, public_id) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await api.delete(`/products/${productId}/images`, {
        data: { variantId, public_id },
      });

      setVariants((prev) =>
        prev.map((v) =>
          v._id === variantId
            ? { ...v, images: v.images.filter((img) => img.public_id !== public_id) }
            : v
        )
      );
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete image.");
    }
  };

  const findVariantIdBySku = (prod, sku) => {
    const s = String(sku || "").trim();
    const v = (prod?.variants || []).find((x) => String(x?.sku || "").trim() === s);
    return v?._id || null;
  };

  const validateBeforeSave = () => {
    // If you selected files for a variant, SKU must exist
    for (const [idxStr, files] of Object.entries(variantFiles)) {
      const idx = Number(idxStr);
      if (!files?.length) continue;
      const sku = String(variants?.[idx]?.sku || "").trim();
      if (!sku) {
        alert(`Variant #${idx + 1}: SKU is required because you selected images for it.`);
        return false;
      }
    }

    // Prevent duplicate SKUs (important for mapping on create)
    const skus = variants
      .map((v) => String(v.sku || "").trim())
      .filter(Boolean);

    const set = new Set();
    for (const s of skus) {
      const key = s.toLowerCase();
      if (set.has(key)) {
        alert(`Duplicate SKU found: "${s}". Please make SKUs unique.`);
        return false;
      }
      set.add(key);
    }

    return true;
  };

  const saveProduct = async (e) => {
    e.preventDefault();

    if (brands.length === 0 || categories.length === 0) {
      alert("Please create at least one Brand and one Category first.");
      return;
    }

    if (
      !formData.name ||
      !formData.slug ||
      !formData.brand ||
      !formData.category ||
      !formData.description
    ) {
      alert("Please fill: name, slug, brand, category, description.");
      return;
    }

    if (!validateBeforeSave()) return;

    const cleanedVariants = variants.map((v) => {
      const normalized = {
        sku: String(v.sku || "").trim(),
        price: Number(v.price || 0),
        countInStock: Number(v.countInStock || 0),
        isDefault: !!v.isDefault,
        attributes: Object.entries(v.attributes || {}).reduce((acc, [rawKey, rawVal]) => {
          const key = toAttributeKey(rawKey);
          if (!key) return acc;
          const value = String(rawVal || "").trim();
          if (value) acc[key] = value;
          return acc;
        }, {}),
      };

      // Keep existing variant identity and gallery when editing.
      if (v?._id) normalized._id = v._id;
      if (Array.isArray(v?.images)) normalized.images = v.images;

      return normalized;
    });

    // Ensure exactly one default
    if (cleanedVariants.length > 0) {
      let defaultCount = cleanedVariants.filter((x) => x.isDefault).length;
      if (defaultCount === 0) cleanedVariants[0].isDefault = true;
      if (defaultCount > 1) {
        let first = true;
        for (const v of cleanedVariants) {
          if (v.isDefault && first) first = false;
          else if (v.isDefault && !first) v.isDefault = false;
        }
      }
    }

    const payload = {
      name: formData.name.trim(),
      slug: slugify(formData.slug),
      brand: formData.brand,
      category: formData.category,
      description: formData.description,
      basePrice: Number(formData.basePrice || 0),
      warrantyMonths: Number(formData.warrantyMonths || 0),
      isFeatured: !!formData.isFeatured,
      isActive: !!formData.isActive,
      variants: cleanedVariants,
    };

    try {
      setSaving(true);

      let productId = editingId;

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        const { data } = await api.post("/products", payload);
        productId = data?._id;
      }

      // ✅ Upload images for EACH variant after save
      const hasAnyUploads = Object.values(variantFiles).some(
        (arr) => (arr?.length || 0) > 0
      );

      if (hasAnyUploads) {
        // Always refetch product after save (important!)
        const fresh = await api.get(`/products/id/${productId}`);
        const prod = fresh.data;

        for (const [idxStr, files] of Object.entries(variantFiles)) {
          const idx = Number(idxStr);
          if (!files || files.length === 0) continue;

          // Always map using SKU
          const sku = cleanedVariants?.[idx]?.sku;
          if (!sku) continue;

          const variantId = findVariantIdBySku(prod, sku);

          if (!variantId) {
            console.warn("Variant not found for upload:", { idx, sku });
            continue;
          }

          await uploadImagesToVariant(productId, variantId, files);
        }
      }


      await fetchAll();
      closeDrawer();
      resetForm();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  // ---- QUICK ADD (brand/category) ----
  const openQuickAdd = (type) => {
    setCreateType(type);
    setCreateErr("");
    setCreateName("");
    setCreateSlug("");
    setCreateAttributes("");
  };

  useEffect(() => {
    if (!createType) return;
    setCreateSlug(slugify(createName));
  }, [createName, createType]);

  const submitQuickAdd = async () => {
    try {
      setCreating(true);
      setCreateErr("");

      const name = createName.trim();
      const slug = slugify(createSlug || createName);

      if (!name) {
        setCreateErr("Name is required.");
        return;
      }

      if (createType === "brand") {
        const { data } = await api.post("/brands", { name, slug });
        await fetchAll();
        setFormData((p) => ({ ...p, brand: data?._id || p.brand }));
      } else {
        const manualAttributes = Array.from(
          new Set(
            String(createAttributes || "")
              .split(",")
              .map((x) => toAttributeKey(x))
              .filter(Boolean)
          )
        );
        const attributes = manualAttributes.length
          ? manualAttributes
          : getPresetAttributeKeys({ name, slug });
        const { data } = await api.post("/categories", { name, slug, attributes });
        await fetchAll();
        setFormData((p) => ({ ...p, category: data?._id || p.category }));
      }

      setCreateType(null);
    } catch (e) {
      console.error(e);
      setCreateErr(
        e?.response?.data?.message || "Failed to create. Check backend POST route."
      );
    } finally {
      setCreating(false);
    }
  };

  const priceFromProduct = (p) => p?.basePrice ?? p?.variants?.[0]?.price ?? 0;
  const stockFromProduct = (p) =>
    p?.variants?.reduce((sum, v) => sum + (v.countInStock || 0), 0) ?? 0;
  const imageFromProduct = (p) => p?.variants?.[0]?.images?.[0]?.url || fallbackImg;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">
            Manage products, variants, images, featured & active status.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Helpful warning if missing base data */}
      {(brands.length === 0 || categories.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
          <div className="font-extrabold text-amber-900">Setup required</div>
          <div className="text-amber-800 mt-1">
            You must create at least <span className="font-semibold">1 Brand</span> and{" "}
            <span className="font-semibold">1 Category</span> before adding products.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {brands.length === 0 && (
              <button
                onClick={() => {
                  openCreate();
                  openQuickAdd("brand");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3 py-2 text-xs font-semibold hover:bg-amber-500"
              >
                <Tag size={14} /> Create Brand
              </button>
            )}
            {categories.length === 0 && (
              <button
                onClick={() => {
                  openCreate();
                  openQuickAdd("category");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3 py-2 text-xs font-semibold hover:bg-amber-500"
              >
                <Shapes size={14} /> Create Category
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          <div className="md:col-span-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, slug, brand, category…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(e) => setOnlyFeatured(e.target.checked)}
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              Active only
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredProducts.length}</span> of{" "}
            <span className="font-semibold">{products.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">Brand</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Price</th>
                <th className="text-left px-4 py-3 font-semibold">Stock</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const img = imageFromProduct(p);
                  const price = priceFromProduct(p);
                  const stock = stockFromProduct(p);

                  return (
                    <tr key={p._id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[260px]">
                          <img
                            src={img}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover border"
                            onError={(e) => (e.currentTarget.src = fallbackImg)}
                          />
                          <div>
                            <div className="font-semibold text-gray-900 line-clamp-1">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500">{p.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">{p.brand?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{p.category?.name || "—"}</td>

                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {moneyBDT(price)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${stock <= 5 ? "text-red-600" : "text-gray-900"
                            }`}
                        >
                          {stock}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${p.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </span>

                          {p.isFeatured && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-lg border hover:bg-gray-50"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => deleteProduct(p._id)}
                            className="p-2 rounded-lg border hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => {
            if (!saving) {
              closeDrawer();
              resetForm();
            }
          }}
        />

        <div
          className={`absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transition-transform duration-300
            ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="h-full flex flex-col">
            <div className="p-5 border-b flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-gray-900">
                  {editingId ? "Edit Product" : "Add Product"}
                </div>
                <div className="text-sm text-gray-500">Manage base info, variants & images.</div>
              </div>

              <button
                onClick={() => {
                  if (!saving) {
                    closeDrawer();
                    resetForm();
                  }
                }}
                className="p-2 rounded-xl hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={saveProduct}
              onKeyDown={handleFormKeyboardNav}
              className="flex-1 overflow-y-auto p-5 space-y-6"
            >
              {/* toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                  />
                  Featured
                </label>

                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  Active
                </label>
              </div>

              {/* base fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={(e) => {
                      handleChange(e);
                      if (!editingId) {
                        setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Slug</label>
                  <input
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                </div>

                {/* Brand row with Quick Add */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">Brand</label>
                    <button
                      type="button"
                      onClick={() => openQuickAdd("brand")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      + Create
                    </button>
                  </div>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                    required
                  >
                    <option value="">{brands.length ? "Select brand" : "No brands yet"}</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category row with Quick Add */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">Category</label>
                    <button
                      type="button"
                      onClick={() => openQuickAdd("category")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      + Create
                    </button>
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                    required
                  >
                    <option value="">
                      {categories.length ? "Select category" : "No categories yet"}
                    </option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Base Price (৳)</label>
                  <input
                    name="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Warranty (months)</label>
                  <input
                    name="warrantyMonths"
                    type="number"
                    value={formData.warrantyMonths}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 min-h-[110px]"
                    required
                  />
                </div>
              </div>

              {/* Variants */}
              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">Variants</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Fields: {variantAttributeKeys.map(formatAttributeLabel).join(", ")}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Keyboard: Enter next, Shift+Enter previous, Alt+Arrow navigate.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-semibold hover:bg-indigo-500"
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {variants.map((v, idx) => (
                    <div key={v._id || idx} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-gray-900">
                          Variant #{idx + 1}{" "}
                          {v.isDefault && (
                            <span className="ml-2 text-xs rounded-full bg-indigo-600 text-white px-2 py-1">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDefaultVariant(idx)}
                            className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                          >
                            Set Default
                          </button>

                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600">SKU</label>
                          <input
                            value={v.sku}
                            onChange={(e) => handleVariantChange(idx, "sku", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="IP15PM-256-BLK"
                          />
                          <div className="mt-1 text-[11px] text-gray-500">
                            SKU must be unique (used to map images on create).
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Price</label>
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleVariantChange(idx, "price", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Stock</label>
                          <input
                            type="number"
                            value={v.countInStock}
                            onChange={(e) =>
                              handleVariantChange(idx, "countInStock", e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {variantAttributeKeys.map((attrKey) => (
                          <div key={`${v._id || idx}-${attrKey}`}>
                            <label className="text-xs font-semibold text-gray-600">
                              {formatAttributeLabel(attrKey)}
                            </label>
                            <input
                              value={v.attributes?.[attrKey] || ""}
                              onChange={(e) => handleVariantAttr(idx, attrKey, e.target.value)}
                              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder={`Enter ${formatAttributeLabel(attrKey)}`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* existing images (edit mode) */}
                      {editingId && Array.isArray(v.images) && v.images.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-gray-600 mb-2">
                            Variant Images
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {v.images.map((img) => (
                              <div key={img.public_id} className="relative group">
                                <img
                                  src={img.url || fallbackImg}
                                  alt="variant"
                                  className="h-20 w-20 object-cover rounded-xl border"
                                  onError={(e) => (e.currentTarget.src = fallbackImg)}
                                />
                                <button
                                  type="button"
                                  onClick={() => deleteVariantImage(editingId, v._id, img.public_id)}
                                  className="absolute top-1 right-1 rounded-full bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100"
                                  title="Delete image"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload images per variant */}
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2 font-extrabold text-gray-900">
                  <ImageIcon size={18} /> Upload Variant Images
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Upload images for each variant separately. Upload happens on Save.
                </p>

                <div className="mt-4 space-y-3">
                  {variants.map((v, idx) => (
                    <div key={v._id || idx} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-extrabold text-gray-900">
                            Variant #{idx + 1} {v.isDefault ? "(Default)" : ""}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            SKU: <span className="font-semibold">{v.sku || "—"}</span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 font-semibold">
                          Selected: {variantFiles?.[idx]?.length || 0}
                        </div>
                      </div>

                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleVariantFiles(idx, e.target.files)}
                        className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      closeDrawer();
                      resetForm();
                    }
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
                  disabled={saving}
                >
                  <Check size={18} />
                  {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <Modal
        open={!!createType}
        title={createType === "brand" ? "Create Brand" : "Create Category"}
        subtitle="Add instantly without leaving product form."
        onClose={() => {
          if (!creating) setCreateType(null);
        }}
      >
        {createErr && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {createErr}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Name</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder={createType === "brand" ? "Apple" : "Phones"}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Slug</label>
            <input
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="auto-generated"
            />
            <div className="mt-1 text-xs text-gray-500">Used in URLs and filters.</div>
          </div>

          {createType === "category" && (
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Variant Attributes (optional)
              </label>
              <input
                value={createAttributes}
                onChange={(e) => setCreateAttributes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="color, ram, storage"
              />
              <div className="mt-1 text-xs text-gray-500">
                Comma separated. Example: switch_type, layout, connectivity.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => !creating && setCreateType(null)}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              disabled={creating}
            >
              Cancel
            </button>

            <button
              onClick={submitQuickAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
              disabled={creating}
            >
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
