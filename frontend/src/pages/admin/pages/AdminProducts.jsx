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

export default function AdminProducts() {
  // data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // [{_id,name,slug}]
  const [brands, setBrands] = useState([]); // [{_id,name,slug}]
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
  const [variants, setVariants] = useState([
    {
      _id: null,
      sku: "",
      price: "",
      countInStock: "",
      isDefault: true,
      attributes: { color: "", ram: "", storage: "" },
      images: [],
    },
  ]);

  // upload
  const [uploadVariantIndex, setUploadVariantIndex] = useState(0);
  const [uploadFiles, setUploadFiles] = useState([]);

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
    setVariants([
      {
        _id: null,
        sku: "",
        price: "",
        countInStock: "",
        isDefault: true,
        attributes: { color: "", ram: "", storage: "" },
        images: [],
      },
    ]);
    setUploadVariantIndex(0);
    setUploadFiles([]);
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
          "Failed to load admin data. Ensure /products/admin, /categories, /brands exist."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // auto slug while creating
  useEffect(() => {
    if (!editingId) {
      setFormData((prev) => ({
        ...prev,
        slug: prev.slug ? prev.slug : slugify(prev.name),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name]);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const matchesText =
        !term ||
        p?.name?.toLowerCase().includes(term) ||
        p?.slug?.toLowerCase().includes(term) ||
        p?.brand?.name?.toLowerCase?.().includes(term) ||
        p?.category?.name?.toLowerCase?.().includes(term);

      const matchesBrand = !filterBrand || (p?.brand?._id || p?.brand) === filterBrand;
      const matchesCategory =
        !filterCategory || (p?.category?._id || p?.category) === filterCategory;

      const matchesFeatured = !onlyFeatured || !!p.isFeatured;
      const matchesActive = !onlyActive || !!p.isActive;

      return matchesText && matchesBrand && matchesCategory && matchesFeatured && matchesActive;
    });
  }, [products, q, filterBrand, filterCategory, onlyFeatured, onlyActive]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleVariantChange = (idx, field, value) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const handleVariantAttr = (idx, key, value) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, attributes: { ...v.attributes, [key]: value } } : v
      )
    );
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        _id: null,
        sku: "",
        price: "",
        countInStock: "",
        isDefault: false,
        attributes: { color: "", ram: "", storage: "" },
        images: [],
      },
    ]);
  };

  const removeVariant = (idx) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    setUploadVariantIndex((prev) => (prev >= idx ? 0 : prev));
  };

  const setDefaultVariant = (idx) => {
    setVariants((prev) => prev.map((v, i) => ({ ...v, isDefault: i === idx })));
  };

  const handleFiles = (e) => {
    setUploadFiles(Array.from(e.target.files || []));
  };

  const uploadImagesToVariant = async (productId, variantId) => {
    for (const file of uploadFiles) {
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
      attributes: {
        color: x.attributes?.color || "",
        ram: x.attributes?.ram || "",
        storage: x.attributes?.storage || "",
      },
      images: Array.isArray(x.images) ? x.images : [],
    }));

    setVariants(mapped.length ? mapped : variants);
    setUploadVariantIndex(0);
    setUploadFiles([]);
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

  const saveProduct = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.brand || !formData.category || !formData.description) {
      alert("Please fill: name, slug, brand, category, description.");
      return;
    }

    const cleanedVariants = variants.map((v) => ({
      sku: String(v.sku || "").trim(),
      price: Number(v.price || 0),
      countInStock: Number(v.countInStock || 0),
      isDefault: !!v.isDefault,
      attributes: {
        color: String(v.attributes?.color || "").trim(),
        ram: String(v.attributes?.ram || "").trim(),
        storage: String(v.attributes?.storage || "").trim(),
      },
    }));

    // ensure there is exactly one default variant if variants exist
    if (cleanedVariants.length > 0) {
      const hasDefault = cleanedVariants.some((v) => v.isDefault);
      if (!hasDefault) cleanedVariants[0].isDefault = true;
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

      // Upload images to selected variant (need variantId)
      if (uploadFiles.length > 0) {
        // fetch product fresh to get variant ids
        const fresh = await api.get(`/products/id/${productId}`);
        const prod = fresh.data;
        const variantId = prod?.variants?.[uploadVariantIndex]?._id;

        if (!variantId) {
          alert("Variant not found for image upload. Check /products/id/:id route.");
        } else {
          await uploadImagesToVariant(productId, variantId);
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

  const priceFromProduct = (p) => p?.basePrice ?? p?.variants?.[0]?.price ?? 0;
  const stockFromProduct = (p) => p?.variants?.reduce((sum, v) => sum + (v.countInStock || 0), 0) ?? 0;
  const imageFromProduct = (p) => p?.variants?.[0]?.images?.[0]?.url || fallbackImg;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage products, variants, images, featured & active status.</p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

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
            Showing <span className="font-semibold">{filteredProducts.length}</span>{" "}
            of <span className="font-semibold">{products.length}</span>
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
                          />
                          <div>
                            <div className="font-semibold text-gray-900 line-clamp-1">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500">{p.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {p.brand?.name || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {p.category?.name || "—"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {moneyBDT(price)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`font-semibold ${stock <= 5 ? "text-red-600" : "text-gray-900"}`}>
                          {stock}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full
                              ${p.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}`}
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
      <div
        className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        {/* overlay */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => {
            if (!saving) {
              closeDrawer();
              resetForm();
            }
          }}
        />

        {/* panel */}
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
                <div className="text-sm text-gray-500">
                  Manage base info, variants & images.
                </div>
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

            <form onSubmit={saveProduct} className="flex-1 overflow-y-auto p-5 space-y-6">
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

                <div>
                  <label className="text-xs font-semibold text-gray-600">Brand</label>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                    required
                  >
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                    required
                  >
                    <option value="">Select category</option>
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
                  <div className="font-extrabold text-gray-900">Variants</div>
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
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Price</label>
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleVariantChange(idx, "price", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="৳"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Stock</label>
                          <input
                            type="number"
                            value={v.countInStock}
                            onChange={(e) => handleVariantChange(idx, "countInStock", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600">Color</label>
                          <input
                            value={v.attributes?.color || ""}
                            onChange={(e) => handleVariantAttr(idx, "color", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Black"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">RAM</label>
                          <input
                            value={v.attributes?.ram || ""}
                            onChange={(e) => handleVariantAttr(idx, "ram", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="8GB"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Storage</label>
                          <input
                            value={v.attributes?.storage || ""}
                            onChange={(e) => handleVariantAttr(idx, "storage", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="256GB"
                          />
                        </div>
                      </div>

                      {/* Existing images */}
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

              {/* Upload images */}
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2 font-extrabold text-gray-900">
                  <ImageIcon size={18} /> Upload Variant Images
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Select which variant to upload images for. Upload happens on save.
                </p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <select
                    value={uploadVariantIndex}
                    onChange={(e) => setUploadVariantIndex(Number(e.target.value))}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                  >
                    {variants.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Variant #{idx + 1}
                      </option>
                    ))}
                  </select>

                  <input
                    type="file"
                    multiple
                    onChange={handleFiles}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  />
                </div>

                {uploadFiles.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-semibold">{uploadFiles.length}</span> files
                  </div>
                )}
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
    </div>
  );
}
