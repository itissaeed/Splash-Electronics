import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../utils/api";

const COUPON_DRAFT_KEY = "admin_coupon_form_draft_v1";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const dedupeItems = (items = []) => {
  const seen = new Set();
  return (items || []).filter((item) => {
    const id = String(item?._id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getCustomerLabel = (customer) =>
  [customer?.name, customer?.email].filter(Boolean).join(" - ") || "Unnamed customer";

const loadCouponFallbackItems = async (searchPath, query) => {
  const keyword = String(query || "").trim().toLowerCase();

  if (searchPath.endsWith("/products")) {
    const { data } = await api.get("/products/admin");
    const items = Array.isArray(data?.products) ? data.products : [];
    return items
      .filter((item) => {
        if (!keyword) return true;
        return [item?.name, item?.slug].some((value) => String(value || "").toLowerCase().includes(keyword));
      })
      .slice(0, 8);
  }

  if (searchPath.endsWith("/categories")) {
    const { data } = await api.get("/categories");
    const items = Array.isArray(data) ? data : [];
    return items
      .filter((item) => {
        if (!keyword) return true;
        return [item?.name, item?.slug].some((value) => String(value || "").toLowerCase().includes(keyword));
      })
      .slice(0, 8);
  }

  if (searchPath.endsWith("/users")) {
    const { data } = await api.get("/admin/customers", {
      headers: tokenHeader(),
      params: { page: 1, limit: 8, keyword: query.trim() },
    });
    return Array.isArray(data?.users) ? data.users : [];
  }

  return [];
};

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

function AsyncScopePicker({
  title,
  searchPath,
  selectedItems,
  onChange,
  getItemLabel,
  placeholder,
  helpText,
  disabled = false,
  disabledMessage = "",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (disabled) {
      setResults([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(searchPath, {
          headers: tokenHeader(),
          params: { keyword: query.trim(), limit: 8 },
        });
        if (!active) return;
        setResults(Array.isArray(data?.items) ? data.items : []);
      } catch (fetchError) {
        if (fetchError?.response?.status === 404) {
          try {
            const fallbackItems = await loadCouponFallbackItems(searchPath, query);
            if (!active) return;
            setResults(fallbackItems);
            setError("");
            return;
          } catch (fallbackError) {
            if (!active) return;
            console.error(`Fallback lookup failed for ${title.toLowerCase()}:`, fallbackError);
          }
        }
        if (!active) return;
        console.error(`Failed to load ${title.toLowerCase()}:`, fetchError);
        setError(fetchError?.response?.data?.message || "Failed to search.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [disabled, query, searchPath, title]);

  const selectedSet = new Set((selectedItems || []).map((item) => String(item?._id)));
  const visibleResults = results.filter((item) => !selectedSet.has(String(item?._id)));

  const addItem = (item) => {
    if (!item?._id) return;
    onChange(dedupeItems([...(selectedItems || []), item]));
    setQuery("");
  };

  const removeItem = (id) => {
    onChange((selectedItems || []).filter((item) => String(item?._id) !== String(id)));
  };

  return (
    <div className={`rounded-2xl border p-4 ${disabled ? "bg-gray-50" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">{title}</label>
          <p className="mt-1 text-xs text-gray-500">
            {disabled ? disabledMessage || helpText : helpText}
          </p>
        </div>
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          {(selectedItems || []).length} selected
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-gray-100"
      />

      <div className="mt-3 rounded-2xl border bg-gray-50/80 p-2">
        {disabled ? (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            {disabledMessage || "This selector is currently disabled."}
          </div>
        ) : loading ? (
          <div className="px-2 py-6 text-center text-sm text-gray-500">Searching...</div>
        ) : error ? (
          <div className="px-2 py-6 text-center text-sm text-red-600">{error}</div>
        ) : visibleResults.length ? (
          <div className="space-y-2">
            {visibleResults.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm"
              >
                <div className="min-w-0 text-sm text-gray-700">
                  <div className="truncate font-medium">{getItemLabel(item)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => addItem(item)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            {query.trim() ? "No matches found." : "Start typing to search live data."}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(selectedItems || []).length ? (
          selectedItems.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => removeItem(item._id)}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <span className="max-w-[200px] truncate">{getItemLabel(item)}</span>
              <span aria-hidden="true">x</span>
            </button>
          ))
        ) : (
          <div className="text-xs text-gray-400">Nothing selected yet.</div>
        )}
      </div>
    </div>
  );
}

export default function AdminCoupons() {
  const location = useLocation();
  const urlKeyword = useMemo(
    () => new URLSearchParams(location.search).get("keyword") || "",
    [location.search]
  );
  const syncedUrlKeywordRef = useRef(urlKeyword);
  const [coupons, setCoupons] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const hasHydratedDraftRef = useRef(false);

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "PERCENT",
    value: "",
    maxDiscount: "",
    minCartTotal: "",
    usageLimit: "",
    perCustomerUsageLimit: "",
    validFrom: "",
    validTo: "",
    isActive: true,
    customerEligibility: "ALL",
    discountAppliesTo: "ELIGIBLE_ITEMS",
  });

  const resetForm = () => {
    setEditingId(null);
    setSelectedProducts([]);
    setSelectedCategories([]);
    setSelectedUsers([]);
    setForm({
      code: "",
      description: "",
      type: "PERCENT",
      value: "",
      maxDiscount: "",
      minCartTotal: "",
      usageLimit: "",
      perCustomerUsageLimit: "",
      validFrom: "",
      validTo: "",
      isActive: true,
      customerEligibility: "ALL",
      discountAppliesTo: "ELIGIBLE_ITEMS",
    });
    localStorage.removeItem(COUPON_DRAFT_KEY);
    setDraftRestored(false);
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

  useEffect(() => {
    if (syncedUrlKeywordRef.current === urlKeyword) return;
    syncedUrlKeywordRef.current = urlKeyword;
    setKeyword(urlKeyword);
    fetchCoupons({ page: 1, keyword: urlKeyword });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKeyword]);

  useEffect(() => {
    if (hasHydratedDraftRef.current) return;
    hasHydratedDraftRef.current = true;
    try {
      const rawDraft = localStorage.getItem(COUPON_DRAFT_KEY);
      if (!rawDraft) return;
      const parsed = JSON.parse(rawDraft);
      if (!parsed || typeof parsed !== "object") return;
      if (!parsed.form || typeof parsed.form !== "object") return;

      setEditingId(parsed.editingId || null);
      setForm((prev) => ({
        ...prev,
        ...parsed.form,
      }));
      setSelectedProducts(dedupeItems(parsed.selectedProducts || []));
      setSelectedCategories(dedupeItems(parsed.selectedCategories || []));
      setSelectedUsers(dedupeItems(parsed.selectedUsers || []));
      setDraftRestored(true);
    } catch (error) {
      console.error("Failed to restore coupon draft:", error);
      localStorage.removeItem(COUPON_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    try {
      localStorage.setItem(
        COUPON_DRAFT_KEY,
        JSON.stringify({
          editingId,
          form,
          selectedProducts,
          selectedCategories,
          selectedUsers,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Failed to save coupon draft:", error);
    }
  }, [editingId, form, selectedProducts, selectedCategories, selectedUsers]);

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
    setSelectedProducts(dedupeItems(c.applicableProducts || []));
    setSelectedCategories(dedupeItems(c.applicableCategories || []));
    setSelectedUsers(dedupeItems(c.applicableUsers || []));
    setForm({
      code: c.code || "",
      description: c.description || "",
      type: c.type || "PERCENT",
      value: c.value ?? "",
      maxDiscount: c.maxDiscount ?? "",
      minCartTotal: c.minCartTotal ?? "",
      usageLimit: c.usageLimit ?? "",
      perCustomerUsageLimit: c.perCustomerUsageLimit ?? "",
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : "",
      validTo: c.validTo ? c.validTo.slice(0, 10) : "",
      isActive: c.isActive !== false,
      customerEligibility: c.customerEligibility || "ALL",
      discountAppliesTo: c.discountAppliesTo || "ELIGIBLE_ITEMS",
    });
    setDraftRestored(false);
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

  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const prefixHint =
        form.code.trim() ||
        form.description.trim() ||
        form.customerEligibility ||
        form.type;
      const { data } = await api.get("/admin/coupons/generate-code", {
        headers: tokenHeader(),
        params: { prefix: prefixHint },
      });
      if (data?.code) {
        setForm((prev) => ({
          ...prev,
          code: String(data.code).toUpperCase(),
        }));
      }
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to generate coupon code.");
    } finally {
      setGeneratingCode(false);
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
        perCustomerUsageLimit:
          form.perCustomerUsageLimit !== "" ? Number(form.perCustomerUsageLimit) : 0,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        isActive: !!form.isActive,
        customerEligibility: form.customerEligibility,
        discountAppliesTo: form.discountAppliesTo,
        applicableProducts: selectedProducts.map((item) => item._id),
        applicableCategories: selectedCategories.map((item) => item._id),
        applicableUsers: selectedUsers.map((item) => item._id),
      };

      if (form.customerEligibility === "SPECIFIC_USERS" && payload.applicableUsers.length === 0) {
        throw new Error("Select at least one customer for a specific-customer coupon.");
      }

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
        e?.response?.data?.message || e?.message || "Failed to save coupon. Check server."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {draftRestored && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Restored your unsaved coupon draft from this browser.
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Code
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  placeholder="e.g. NEWUSER200"
                  className="w-full rounded-xl border px-3 py-2 text-sm uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${
                    generatingCode
                      ? "cursor-not-allowed bg-gray-200 text-gray-500"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {generatingCode ? "Generating..." : "Generate"}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Shown to customers. Will be uppercased. Use Generate to get a unique code checked against existing coupons.
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Per customer limit
              </label>
              <input
                type="number"
                name="perCustomerUsageLimit"
                value={form.perCustomerUsageLimit}
                onChange={handleFormChange}
                placeholder="e.g. 1"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Customer eligibility
              </label>
              <select
                name="customerEligibility"
                value={form.customerEligibility}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
              >
                <option value="ALL">All customers</option>
                <option value="SPECIFIC_USERS">Specific customers</option>
                <option value="NEW_CUSTOMERS">New customers only</option>
                <option value="RETURNING_CUSTOMERS">Returning customers only</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Discount applies to
              </label>
              <select
                name="discountAppliesTo"
                value={form.discountAppliesTo}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
              >
                <option value="ELIGIBLE_ITEMS">Eligible items only</option>
                <option value="ENTIRE_CART">Whole cart after qualification</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                For scoped coupons, this controls whether only matching items or the whole cart is discounted.
              </p>
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

          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                Scope and Audience
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <AsyncScopePicker
                title="Specific products"
                searchPath="/admin/coupons/lookups/products"
                placeholder="Search products by name or slug"
                helpText="Leave empty to allow all products. Matching products qualify for the coupon."
                selectedItems={selectedProducts}
                onChange={setSelectedProducts}
                getItemLabel={(product) => product?.name || "Unnamed product"}
              />

              <AsyncScopePicker
                title="Specific categories"
                searchPath="/admin/coupons/lookups/categories"
                placeholder="Search categories by name or slug"
                helpText="Category scope works with product scope. A match on either can qualify."
                selectedItems={selectedCategories}
                onChange={setSelectedCategories}
                getItemLabel={(category) => category?.name || "Unnamed category"}
              />

              <AsyncScopePicker
                title="Specific users"
                searchPath="/admin/coupons/lookups/users"
                placeholder="Search customers by name, email, or phone"
                helpText="Used when customer eligibility is set to specific customers."
                selectedItems={selectedUsers}
                onChange={setSelectedUsers}
                getItemLabel={getCustomerLabel}
                disabled={form.customerEligibility !== "SPECIFIC_USERS"}
                disabledMessage="Switch customer eligibility to Specific customers to search and add users here."
              />
            </div>
          </div>

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
                ? "Saving..."
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
                    Loading coupons...
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
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {c.description}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {c.type === "PERCENT" ? "Percentage" : "Flat"}
                      </td>

                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {c.type === "PERCENT"
                          ? `${c.value}%`
                          : `৳${Number(c.value || 0).toLocaleString("en-BD")}`}
                      </td>

                      <td className="px-4 py-3">
                        <span className={badgeClass(status)}>{status}</span>
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600">
                        {validity}
                      </td>

                      <td className="px-4 py-3 text-right text-xs text-gray-700">
                        {usage}
                        {c.perCustomerUsageLimit > 0 && (
                          <div className="text-gray-500 mt-1">
                            Per customer: {c.perCustomerUsageLimit}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="rounded-xl border bg-white px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
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
              Prev
            </button>

            <div>
              Page <span className="font-semibold">{page}</span> of{" "}
              <span className="font-semibold">{pages}</span>
            </div>

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
