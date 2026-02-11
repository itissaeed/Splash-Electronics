import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const badgeClass = (status) => {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border";
  switch (status) {
    case "Active":
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    case "Upcoming":
      return `${base} bg-blue-50 text-blue-700 border-blue-200`;
    case "Expired":
      return `${base} bg-red-50 text-red-700 border-red-200`;
    case "Disabled":
    default:
      return `${base} bg-gray-50 text-gray-600 border-gray-200`;
  }
};

const getStatus = (c) => {
  const now = new Date();
  if (!c.isActive) return "Disabled";

  const from = c.validFrom ? new Date(c.validFrom) : null;
  const to = c.validTo ? new Date(c.validTo) : null;

  if (from && now < from) return "Upcoming";
  if (to && now > to) return "Expired";
  return "Active";
};

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-xl font-extrabold text-gray-900 break-all">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // form
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "PERCENT",
    value: "",
    maxDiscount: "",
    minCartTotal: "",
    usageLimit: "",
    validFrom: "",
    validTo: "",
    isActive: true,
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      code: "",
      description: "",
      type: "PERCENT",
      value: "",
      maxDiscount: "",
      minCartTotal: "",
      usageLimit: "",
      validFrom: "",
      validTo: "",
      isActive: true,
    });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const fetchCoupons = async (opts = {}) => {
    try {
      setLoading(true);
      setErrMsg("");

      const params = {
        page: opts.page ?? page,
        limit,
      };
      const kw = (opts.keyword ?? keyword).trim();
      if (kw) params.keyword = kw;

      const status = opts.status ?? statusFilter;
      if (status) params.status = status;

      const { data } = await api.get("/admin/coupons", {
        headers: tokenHeader(),
        params,
      });

      setCoupons(data.coupons || []);
      setMetrics(data.metrics || null);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to load coupons. Check /api/admin/coupons."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    fetchCoupons({ page: 1 });
  };

  const onStatusChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    fetchCoupons({ page: 1, status: value });
  };

  const goPage = (newPage) => {
    if (newPage < 1 || newPage > pages) return;
    fetchCoupons({ page: newPage });
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    setForm({
      code: c.code || "",
      description: c.description || "",
      type: c.type || "PERCENT",
      value: c.value ?? "",
      maxDiscount: c.maxDiscount ?? "",
      minCartTotal: c.minCartTotal ?? "",
      usageLimit: c.usageLimit ?? "",
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : "",
      validTo: c.validTo ? c.validTo.slice(0, 10) : "",
      isActive: c.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this coupon?")) return;
    try {
      await api.delete(`/admin/coupons/${id}`, { headers: tokenHeader() });
      fetchCoupons();
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
          "Failed to deactivate coupon. Check server logs."
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg("");

    try {
      if (!form.code || !form.type || !form.value) {
        alert("Code, type and value are required.");
        setSaving(false);
        return;
      }

      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        type: form.type,
        value: Number(form.value || 0),
        maxDiscount: form.maxDiscount !== "" ? Number(form.maxDiscount) : null,
        minCartTotal:
          form.minCartTotal !== "" ? Number(form.minCartTotal) : null,
        usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : 0,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        isActive: !!form.isActive,
      };

      if (editingId) {
        await api.put(`/admin/coupons/${editingId}`, payload, {
          headers: tokenHeader(),
        });
      } else {
        await api.post("/admin/coupons", payload, { headers: tokenHeader() });
      }

      resetForm();
      fetchCoupons({ page: 1 });
      alert("Coupon saved!");
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message || "Failed to save coupon. Check server."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Coupons
          </h1>
          <p className="text-sm text-gray-500">
            Manage discount codes for Splash Electronics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={onSearchSubmit}
            className="flex items-center gap-2"
          >
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by code or description"
              className="w-48 sm:w-64 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
            >
              Search
            </button>
          </form>

          <select
            value={statusFilter}
            onChange={onStatusChange}
            className="rounded-xl border px-3 py-2 text-sm bg-white"
          >
            <option value="">All</option>
            <option value="active">Active now</option>
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total coupons"
          value={metrics?.totalAll ?? 0}
        />
        <MetricCard
          label="Active flag"
          value={metrics?.activeFlag ?? 0}
          subtitle="isActive = true"
        />
        <MetricCard
          label="Upcoming"
          value={metrics?.upcomingCount ?? 0}
        />
        <MetricCard
          label="Expired"
          value={metrics?.expiredCount ?? 0}
          subtitle="Date range passed"
        />
      </div>

      {/* Form */}
      <div className="bg-white border rounded-3xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-extrabold text-gray-900">
            {editingId ? "Edit coupon" : "Create new coupon"}
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs rounded-xl border bg-white px-3 py-1 font-semibold hover:bg-gray-50"
            >
              Cancel editing
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Code
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleFormChange}
                placeholder="e.g. NEWUSER200"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm uppercase"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown to customers. Will be uppercased.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                required
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FLAT">Flat amount (৳)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Value
              </label>
              <input
                type="number"
                name="value"
                value={form.value}
                onChange={handleFormChange}
                placeholder="e.g. 10 for 10% or 200 for ৳200"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Max discount (optional)
              </label>
              <input
                type="number"
                name="maxDiscount"
                value={form.maxDiscount}
                onChange={handleFormChange}
                placeholder="e.g. 500"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                For percentage coupons. Leave empty for no cap.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Min cart total (optional)
              </label>
              <input
                type="number"
                name="minCartTotal"
                value={form.minCartTotal}
                onChange={handleFormChange}
                placeholder="e.g. 2000"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Usage limit (0 = unlimited)
              </label>
              <input
                type="number"
                name="usageLimit"
                value={form.usageLimit}
                onChange={handleFormChange}
                placeholder="e.g. 100"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Valid from (optional)
              </label>
              <input
                type="date"
                name="validFrom"
                value={form.validFrom}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Valid to (optional)
              </label>
              <input
                type="date"
                name="validTo"
                value={form.validTo}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-3 mt-6">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Active
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Internal description (optional)
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Notes about where this coupon is used (Facebook campaign, new users, etc.)"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${
                saving
                  ? "bg-indigo-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {saving
                ? "Saving…"
                : editingId
                ? "Update coupon"
                : "Create coupon"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border bg-white px-6 py-3 text-sm font-semibold hover:bg-gray-50"
            >
              Clear form
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-extrabold text-gray-900">
            Coupons ({coupons.length} on this page)
          </div>
          <div className="text-xs text-gray-500">
            Page {page} of {pages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Code</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Value</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Validity</th>
                <th className="text-right px-4 py-3 font-semibold">
                  Usage
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-gray-500">
                    Loading coupons…
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-gray-500">
                    No coupons found.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const status = getStatus(c);
                  const usageLimit =
                    c.usageLimit && c.usageLimit > 0
                      ? c.usageLimit
                      : "∞";
                  const usage = `${c.usedCount || 0} / ${usageLimit}`;
                  const validity =
                    (c.validFrom
                      ? c.validFrom.slice(0, 10)
                      : "—") +
                    " → " +
                    (c.validTo ? c.validTo.slice(0, 10) : "—");

                  return (
                    <tr key={c._id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-gray-900">
                          {c.code}
                        </div>
                        {c.description && (
                          <div className="mt-1 text-xs text-gray-500 line-clamp-1">
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.type === "PERCENT"
                          ? "Percentage"
                          : "Flat amount"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.type === "PERCENT"
                          ? `${c.value}%`
                          : `৳${c.value}`}
                        {c.maxDiscount ? (
                          <span className="text-gray-500">
                            {" "}
                            (max ৳{c.maxDiscount})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={badgeClass(status)}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {validity}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800">
                        {usage}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(c)}
                            className="rounded-xl border bg-white px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c._id)}
                            className="rounded-xl border bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Deactivate
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

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t text-sm text-gray-600">
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className={`rounded-xl px-3 py-1 border ${
                page <= 1
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= pages}
              className={`rounded-xl px-3 py-1 border ${
                page >= pages
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
