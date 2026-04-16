import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const getStatus = (offer) => {
  const now = new Date();
  if (!offer?.isActive) return "Disabled";
  const from = offer?.validFrom ? new Date(offer.validFrom) : null;
  const to = offer?.validTo ? new Date(offer.validTo) : null;
  if (from && now < from) return "Upcoming";
  if (to && now > to) return "Expired";
  return "Active";
};

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-extrabold text-gray-900">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
    </div>
  );
}

function SearchableScopePicker({ title, items, selectedIds, onChange, getItemLabel, placeholder, helpText }) {
  const [query, setQuery] = useState("");
  const selectedSet = new Set((selectedIds || []).map(String));
  const selectedItems = items.filter((item) => selectedSet.has(String(item?._id)));
  const filteredItems = items
    .filter((item) => !selectedSet.has(String(item?._id)))
    .filter((item) => getItemLabel(item).toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">{title}</label>
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        </div>
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          {selectedItems.length} selected
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
      />

      <div className="mt-3 rounded-2xl border bg-gray-50 p-2">
        {filteredItems.length ? (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <div className="min-w-0 truncate text-sm font-medium text-gray-700">{getItemLabel(item)}</div>
                <button
                  type="button"
                  onClick={() => onChange([...(selectedIds || []), String(item._id)])}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            {query.trim() ? "No matches found." : "Start typing to search and add items."}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => onChange((selectedIds || []).filter((id) => String(id) !== String(item._id)))}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
            >
              {getItemLabel(item)} x
            </button>
          ))
        ) : (
          <div className="text-xs text-gray-400">Nothing selected yet.</div>
        )}
      </div>
    </div>
  );
}

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    label: "",
    type: "PERCENT",
    value: "",
    priority: 0,
    scopeType: "ALL",
    validFrom: "",
    validTo: "",
    isActive: true,
    applicableProducts: [],
    applicableCategories: [],
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      label: "",
      type: "PERCENT",
      value: "",
      priority: 0,
      scopeType: "ALL",
      validFrom: "",
      validTo: "",
      isActive: true,
      applicableProducts: [],
      applicableCategories: [],
    });
  };

  const fetchDependencies = async () => {
    try {
      const [productRes, categoryRes] = await Promise.all([
        api.get("/products/admin", { headers: tokenHeader() }),
        api.get("/categories"),
      ]);
      setProducts(productRes.data?.products || []);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
    } catch (error) {
      console.error("Failed to load offer dependencies:", error);
    }
  };

  const fetchOffers = async (opts = {}) => {
    try {
      setLoading(true);
      setErrMsg("");
      const params = {
        page: opts.page ?? page,
        limit: 20,
      };
      const kw = String(opts.keyword ?? keyword).trim();
      if (kw) params.keyword = kw;
      const status = opts.status ?? statusFilter;
      if (status) params.status = status;
      const { data } = await api.get("/admin/offers", {
        headers: tokenHeader(),
        params,
      });
      setOffers(data?.offers || []);
      setMetrics(data?.metrics || null);
      setPage(data?.page || 1);
      setPages(data?.pages || 1);
    } catch (error) {
      console.error(error);
      setErrMsg(error?.response?.data?.message || "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchDependencies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const updateFormList = (name, values) => {
    setForm((prev) => ({
      ...prev,
      [name]: values,
    }));
  };

  const handleEdit = (offer) => {
    setEditingId(offer._id);
    setForm({
      name: offer?.name || "",
      description: offer?.description || "",
      label: offer?.label || "",
      type: offer?.type || "PERCENT",
      value: offer?.value ?? "",
      priority: offer?.priority ?? 0,
      scopeType: offer?.scopeType || "ALL",
      validFrom: offer?.validFrom ? offer.validFrom.slice(0, 10) : "",
      validTo: offer?.validTo ? offer.validTo.slice(0, 10) : "",
      isActive: offer?.isActive !== false,
      applicableProducts: (offer?.applicableProducts || []).map((item) => item?._id || item),
      applicableCategories: (offer?.applicableCategories || []).map((item) => item?._id || item),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this offer?")) return;
    try {
      await api.delete(`/admin/offers/${id}`, { headers: tokenHeader() });
      fetchOffers();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to deactivate offer.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        label: form.label.trim(),
        type: form.type,
        value: Number(form.value || 0),
        priority: Number(form.priority || 0),
        scopeType: form.scopeType,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        isActive: !!form.isActive,
        applicableProducts: form.applicableProducts,
        applicableCategories: form.applicableCategories,
      };
      if (!payload.name || !Number.isFinite(payload.value)) {
        throw new Error("Name and value are required.");
      }
      if (editingId) {
        await api.put(`/admin/offers/${editingId}`, payload, { headers: tokenHeader() });
      } else {
        await api.post("/admin/offers", payload, { headers: tokenHeader() });
      }
      resetForm();
      fetchOffers({ page: 1 });
      alert("Offer saved!");
    } catch (error) {
      console.error(error);
      setErrMsg(error?.response?.data?.message || error?.message || "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Offers</h1>
          <p className="text-sm text-gray-500">Manage storefront sale campaigns separately from product editing.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchOffers({ page: 1 });
            }}
            className="flex items-center gap-2"
          >
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search offers"
              className="w-48 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300 sm:w-64"
            />
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              Search
            </button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchOffers({ page: 1, status: e.target.value });
            }}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="active">Active now</option>
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {errMsg ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errMsg}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total offers" value={metrics?.totalAll ?? 0} />
        <MetricCard label="Enabled offers" value={metrics?.activeFlag ?? 0} subtitle="isActive = true" />
        <MetricCard label="Upcoming" value={metrics?.upcomingCount ?? 0} />
        <MetricCard label="Expired" value={metrics?.expiredCount ?? 0} />
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-extrabold text-gray-900">{editingId ? "Edit offer" : "Create offer"}</div>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-xl border bg-white px-3 py-1 text-xs font-semibold hover:bg-gray-50">
              Cancel editing
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Offer name</label>
              <input name="name" value={form.name} onChange={handleFormChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Label</label>
              <input name="label" value={form.label} onChange={handleFormChange} placeholder="e.g. Eid Sale" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Type</label>
              <select name="type" value={form.type} onChange={handleFormChange} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="PERCENT">Percent off</option>
                <option value="FIXED_AMOUNT">Fixed amount off</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Value</label>
              <input type="number" name="value" value={form.value} onChange={handleFormChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" required />
              <p className="mt-1 text-xs text-gray-500">
                Example: enter `10` for 10% off, or `500` for Tk 500 off.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-semibold text-gray-700">Scope</label>
              <select name="scopeType" value={form.scopeType} onChange={handleFormChange} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="ALL">All products</option>
                <option value="PRODUCTS">Specific products</option>
                <option value="CATEGORIES">Specific categories</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Priority</label>
              <input type="number" name="priority" value={form.priority} onChange={handleFormChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Valid from</label>
              <input type="date" name="validFrom" value={form.validFrom} onChange={handleFormChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Valid to</label>
              <input type="date" name="validTo" value={form.validTo} onChange={handleFormChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleFormChange} />
                Active
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleFormChange} className="mt-1 min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SearchableScopePicker
              title="Offer products"
              placeholder="Search products"
              helpText="Use this when the offer applies only to selected products."
              items={products}
              selectedIds={form.applicableProducts}
              onChange={(values) => updateFormList("applicableProducts", values)}
              getItemLabel={(product) => product?.name || "Unnamed product"}
            />
            <SearchableScopePicker
              title="Offer categories"
              placeholder="Search categories"
              helpText="Use this when the offer applies to whole categories."
              items={categories}
              selectedIds={form.applicableCategories}
              onChange={(values) => updateFormList("applicableCategories", values)}
              getItemLabel={(category) => category?.name || "Unnamed category"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${saving ? "cursor-not-allowed bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-500"}`}>
              {saving ? "Saving..." : editingId ? "Update offer" : "Create offer"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-xl border bg-white px-6 py-3 text-sm font-semibold hover:bg-gray-50">
              Clear form
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-extrabold text-gray-900">Offers ({offers.length} on this page)</div>
          <div className="text-xs text-gray-500">Page {page} of {pages}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Offer</th>
                <th className="px-4 py-3 text-left font-semibold">Discount</th>
                <th className="px-4 py-3 text-left font-semibold">Scope</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Validity</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-gray-500">Loading offers...</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-gray-500">No offers found.</td></tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-gray-900">{offer.name}</div>
                      {offer.label ? <div className="mt-1 text-xs text-gray-500">Label: {offer.label}</div> : null}
                      {offer.description ? <div className="mt-1 text-xs text-gray-500 line-clamp-1">{offer.description}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {offer.type === "PERCENT" ? `${offer.value}% off` : `Tk ${offer.value} off`}
                      <div className="mt-1 text-gray-500">Priority: {offer.priority || 0}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {offer.scopeType === "ALL" ? "All products" : offer.scopeType === "PRODUCTS" ? `${offer.applicableProducts?.length || 0} products` : `${offer.applicableCategories?.length || 0} categories`}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{getStatus(offer)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {(offer.validFrom ? offer.validFrom.slice(0, 10) : "-")} to {(offer.validTo ? offer.validTo.slice(0, 10) : "-")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleEdit(offer)} className="rounded-xl border bg-white px-3 py-1 text-xs font-semibold hover:bg-gray-50">Edit</button>
                        <button type="button" onClick={() => handleDelete(offer._id)} className="rounded-xl border bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
