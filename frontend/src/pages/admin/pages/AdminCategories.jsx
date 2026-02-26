import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toKey = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

const listToText = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join("\n");

const specsToText = (specs) => {
  if (!specs || typeof specs !== "object") return "";
  const entries = specs instanceof Map ? Array.from(specs.entries()) : Object.entries(specs);
  return entries
    .map(([k, v]) => `${toKey(k)}: ${String(v || "").trim()}`)
    .filter((line) => !line.endsWith(":"))
    .join("\n");
};

const textToList = (text, keyMode = false) =>
  Array.from(
    new Set(
      String(text || "")
        .split("\n")
        .map((x) => (keyMode ? toKey(x) : String(x || "").trim()))
        .filter(Boolean)
    )
  );

const textToSpecs = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const idx = line.indexOf(":");
      if (idx < 0) return acc;
      const k = toKey(line.slice(0, idx).trim());
      const v = line.slice(idx + 1).trim();
      if (!k || !v) return acc;
      acc[k] = v;
      return acc;
    }, {});

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    attributesText: "",
    highlightsTemplateText: "",
    specsTemplateText: "",
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      attributesText: "",
      highlightsTemplateText: "",
      specsTemplateText: "",
    });
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/categories");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) =>
      [c?.name, c?.slug, ...(Array.isArray(c?.attributes) ? c.attributes : [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [items, q]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Category name is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      attributes: textToList(form.attributesText, true),
      highlightsTemplate: textToList(form.highlightsTemplateText, false),
      specsTemplate: textToSpecs(form.specsTemplateText),
    };

    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload, { headers: tokenHeader() });
      } else {
        await api.post("/categories", payload, { headers: tokenHeader() });
      }
      await fetchCategories();
      resetForm();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (c) => {
    setEditingId(c._id);
    setForm({
      name: c?.name || "",
      slug: c?.slug || "",
      attributesText: listToText(c?.attributes),
      highlightsTemplateText: listToText(c?.highlightsTemplate),
      specsTemplateText: specsToText(c?.specsTemplate),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`, { headers: tokenHeader() });
      await fetchCategories();
      if (editingId === id) resetForm();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete category.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">
            Manage category attributes and product info templates.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, slug, attributes..."
          className="w-full sm:w-80 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="bg-white border rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-extrabold text-gray-900">
            {editingId ? "Edit Category" : "Create Category"}
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-3 py-1 text-xs font-semibold hover:bg-gray-50"
            >
              Cancel Editing
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Slug</label>
            <input
              name="slug"
              value={form.slug}
              onChange={onChange}
              placeholder="auto-generated if empty"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">
              Variant Attributes (one per line)
            </label>
            <textarea
              name="attributesText"
              value={form.attributesText}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[96px]"
              placeholder={"color\nram\nstorage\ndisplay_size"}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">
              Highlights Template (one per line)
            </label>
            <textarea
              name="highlightsTemplateText"
              value={form.highlightsTemplateText}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[100px]"
              placeholder={"Powerful performance for daily use\nLong battery backup"}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">
              Specs Template (key: value per line)
            </label>
            <textarea
              name="specsTemplateText"
              value={form.specsTemplateText}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[120px]"
              placeholder={"display: AMOLED 120Hz\nchipset: Snapdragon\nbattery: 5000 mAh"}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-extrabold text-gray-900">Category List</div>
          <div className="text-xs text-gray-500">Total: {filtered.length}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Slug</th>
                <th className="text-left px-4 py-3 font-semibold">Attributes</th>
                <th className="text-left px-4 py-3 font-semibold">Templates</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-500">
                    Loading categories...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-500">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const attrs = Array.isArray(c?.attributes) ? c.attributes : [];
                  const hl = Array.isArray(c?.highlightsTemplate) ? c.highlightsTemplate : [];
                  const specsRaw = c?.specsTemplate;
                  const specsCount =
                    specsRaw instanceof Map
                      ? specsRaw.size
                      : specsRaw && typeof specsRaw === "object"
                        ? Object.keys(specsRaw).length
                      : 0;

                  return (
                    <tr key={c._id} className="border-t">
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-700">{c.slug}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {attrs.length ? attrs.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="text-xs">
                          Highlights: {hl.length} | Specs: {specsCount}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(c)}
                            className="rounded-xl border px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(c._id)}
                            className="rounded-xl border px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
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
    </div>
  );
}
