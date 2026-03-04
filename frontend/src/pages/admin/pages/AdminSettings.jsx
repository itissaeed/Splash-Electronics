import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [form, setForm] = useState({
    // Store
    storeName: "Splash Electronics",
    logoUrl: "",
    supportEmail: "",
    supportPhone: "",
    supportHours: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    country: "Bangladesh",

    // Orders
    allowCOD: true,
    codMaxAmount: 50000,
    autoConfirmPaidOnline: true,
    orderPrefix: "SPL",

    // Shipping
    insideDhaka: 60,
    outsideDhaka: 100,
    freeShippingThreshold: 5000,
    expressExtraInsideDhaka: 80,
    expressExtraOutsideDhaka: 120,
    shippingOverrides: [],

    // UI
    primaryColor: "#4F46E5",
    secondaryColor: "#EC4899",
    homepageBannerText: "",
    announcementBarText: "",

    // Maintenance
    maintenanceEnabled: false,
    maintenanceMessage:
      "We’re doing some maintenance. You may experience temporary issues.",
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrMsg("");
      const { data } = await api.get("/admin/settings", {
        headers: tokenHeader(),
      });

      setLastUpdated(data.updatedAt || null);

      setForm((prev) => ({
        ...prev,
        storeName: data.store?.storeName || prev.storeName,
        logoUrl: data.store?.logoUrl || "",
        supportEmail: data.store?.supportEmail || "",
        supportPhone: data.store?.supportPhone || "",
        supportHours: data.store?.supportHours || "",
        addressLine1: data.store?.addressLine1 || "",
        addressLine2: data.store?.addressLine2 || "",
        city: data.store?.city || "",
        district: data.store?.district || "",
        country: data.store?.country || prev.country,

        allowCOD:
          typeof data.order?.allowCOD === "boolean"
            ? data.order.allowCOD
            : prev.allowCOD,
        codMaxAmount:
          data.order?.codMaxAmount !== undefined
            ? data.order.codMaxAmount
            : prev.codMaxAmount,
        autoConfirmPaidOnline:
          typeof data.order?.autoConfirmPaidOnline === "boolean"
            ? data.order.autoConfirmPaidOnline
            : prev.autoConfirmPaidOnline,
        orderPrefix: data.order?.orderPrefix || prev.orderPrefix,

        insideDhaka:
          data.shipping?.insideDhaka !== undefined
            ? data.shipping.insideDhaka
            : prev.insideDhaka,
        outsideDhaka:
          data.shipping?.outsideDhaka !== undefined
            ? data.shipping.outsideDhaka
            : prev.outsideDhaka,
        freeShippingThreshold:
          data.shipping?.freeShippingThreshold !== undefined
            ? data.shipping.freeShippingThreshold
            : prev.freeShippingThreshold,
        expressExtraInsideDhaka:
          data.shipping?.expressExtraInsideDhaka !== undefined
            ? data.shipping.expressExtraInsideDhaka
            : prev.expressExtraInsideDhaka,
        expressExtraOutsideDhaka:
          data.shipping?.expressExtraOutsideDhaka !== undefined
            ? data.shipping.expressExtraOutsideDhaka
            : prev.expressExtraOutsideDhaka,
        shippingOverrides: Array.isArray(data.shipping?.regionalOverrides)
          ? data.shipping.regionalOverrides.map((row) => ({
              division: row?.division || "",
              district: row?.district || "",
              fee: row?.fee ?? "",
            }))
          : prev.shippingOverrides,

        primaryColor: data.ui?.primaryColor || prev.primaryColor,
        secondaryColor: data.ui?.secondaryColor || prev.secondaryColor,
        homepageBannerText: data.ui?.homepageBannerText || "",
        announcementBarText: data.ui?.announcementBarText || "",

        maintenanceEnabled: data.maintenance?.enabled || false,
        maintenanceMessage: data.maintenance?.message || prev.maintenanceMessage,
      }));
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to load settings. Check /api/admin/settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg("");

    try {
      const payload = {
        store: {
          storeName: form.storeName,
          logoUrl: form.logoUrl,
          supportEmail: form.supportEmail,
          supportPhone: form.supportPhone,
          supportHours: form.supportHours,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          district: form.district,
          country: form.country,
        },
        order: {
          allowCOD: form.allowCOD,
          codMaxAmount: Number(form.codMaxAmount || 0),
          autoConfirmPaidOnline: form.autoConfirmPaidOnline,
          orderPrefix: form.orderPrefix,
        },
        shipping: {
          insideDhaka: Number(form.insideDhaka || 0),
          outsideDhaka: Number(form.outsideDhaka || 0),
          freeShippingThreshold: Number(form.freeShippingThreshold || 0),
          expressExtraInsideDhaka: Number(form.expressExtraInsideDhaka || 0),
          expressExtraOutsideDhaka: Number(form.expressExtraOutsideDhaka || 0),
          regionalOverrides: (form.shippingOverrides || [])
            .filter((row) => String(row?.division || "").trim() && row?.fee !== "")
            .map((row) => ({
              division: String(row.division || "").trim(),
              district: String(row.district || "").trim(),
              fee: Number(row.fee || 0),
            })),
        },
        ui: {
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          homepageBannerText: form.homepageBannerText,
          announcementBarText: form.announcementBarText,
        },
        maintenance: {
          enabled: form.maintenanceEnabled,
          message: form.maintenanceMessage,
        },
      };

      const { data } = await api.put("/admin/settings", payload, {
        headers: tokenHeader(),
      });

      setLastUpdated(data.updatedAt || null);
      alert("Settings saved successfully.");
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to save settings. Check server logs."
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
            Store Settings
          </h1>
          <p className="text-sm text-gray-500">
            Configure Splash Electronics branding, checkout, shipping and UI.
          </p>
        </div>

        <div className="text-xs text-gray-500 text-right">
          {lastUpdated && (
            <div>
              Last updated:{" "}
              <span className="font-semibold">
                {new Date(lastUpdated).toLocaleString()}
              </span>
            </div>
          )}
          {loading && <div className="mt-1 text-indigo-600">Loading…</div>}
        </div>
      </div>

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Main form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store profile */}
        <section className="bg-white border rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Store profile
              </h2>
              <p className="text-xs text-gray-500">
                These values appear on invoices, emails and the footer.
              </p>
            </div>
          </div>

	          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Store name
              </label>
              <input
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Logo URL (optional)
              </label>
              <input
                name="logoUrl"
                value={form.logoUrl}
                onChange={handleChange}
                placeholder="https://…"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Support email
              </label>
              <input
                name="supportEmail"
                type="email"
                value={form.supportEmail}
                onChange={handleChange}
                placeholder="support@example.com"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Support phone
              </label>
              <input
                name="supportPhone"
                value={form.supportPhone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Support hours
              </label>
              <input
                name="supportHours"
                value={form.supportHours}
                onChange={handleChange}
                placeholder="9 AM – 8 PM"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Address line 1
              </label>
              <input
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleChange}
                placeholder="House/Road"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Address line 2 (optional)
              </label>
              <input
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleChange}
                placeholder="Area / Landmark"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                City
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                District
              </label>
              <input
                name="district"
                value={form.district}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Country
              </label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
	          </div>
	          <div className="mt-3 rounded-2xl border p-3">
	            <div className="flex items-center justify-between">
	              <div className="text-sm font-semibold text-gray-700">
	                Regional overrides
	              </div>
	              <button
	                type="button"
	                onClick={() =>
	                  setForm((prev) => ({
	                    ...prev,
	                    shippingOverrides: [
	                      ...(prev.shippingOverrides || []),
	                      { division: "", district: "", fee: "" },
	                    ],
	                  }))
	                }
	                className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50"
	              >
	                Add region
	              </button>
	            </div>
	            <p className="mt-1 text-[11px] text-gray-500">
	              Set custom fee for specific division/district. Leave district empty for full division.
	            </p>
	            <div className="mt-3 space-y-2">
	              {(form.shippingOverrides || []).length === 0 ? (
	                <div className="text-xs text-gray-500">No overrides added.</div>
	              ) : (
	                (form.shippingOverrides || []).map((row, idx) => (
	                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
	                    <input
	                      value={row.division}
	                      onChange={(e) =>
	                        setForm((prev) => {
	                          const next = [...(prev.shippingOverrides || [])];
	                          next[idx] = { ...next[idx], division: e.target.value };
	                          return { ...prev, shippingOverrides: next };
	                        })
	                      }
	                      placeholder="Division (required)"
	                      className="rounded-xl border px-3 py-2 text-sm"
	                    />
	                    <input
	                      value={row.district}
	                      onChange={(e) =>
	                        setForm((prev) => {
	                          const next = [...(prev.shippingOverrides || [])];
	                          next[idx] = { ...next[idx], district: e.target.value };
	                          return { ...prev, shippingOverrides: next };
	                        })
	                      }
	                      placeholder="District (optional)"
	                      className="rounded-xl border px-3 py-2 text-sm"
	                    />
	                    <input
	                      type="number"
	                      value={row.fee}
	                      onChange={(e) =>
	                        setForm((prev) => {
	                          const next = [...(prev.shippingOverrides || [])];
	                          next[idx] = { ...next[idx], fee: e.target.value };
	                          return { ...prev, shippingOverrides: next };
	                        })
	                      }
	                      placeholder="Fee (BDT)"
	                      className="rounded-xl border px-3 py-2 text-sm"
	                    />
	                    <button
	                      type="button"
	                      onClick={() =>
	                        setForm((prev) => ({
	                          ...prev,
	                          shippingOverrides: (prev.shippingOverrides || []).filter(
	                            (_, i) => i !== idx
	                          ),
	                        }))
	                      }
	                      className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
	                    >
	                      Remove
	                    </button>
	                  </div>
	                ))
	              )}
	            </div>
	          </div>
	        </section>

        {/* Order & checkout */}
        <section className="bg-white border rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Order & checkout
              </h2>
              <p className="text-xs text-gray-500">
                Control payment methods and order behaviour.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Cash on delivery
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="allowCOD"
                  checked={form.allowCOD}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-gray-600">
                  Allow customers to choose COD at checkout
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                COD max amount (৳)
              </label>
              <input
                type="number"
                name="codMaxAmount"
                value={form.codMaxAmount}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                COD not allowed if order total is above this amount.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Order prefix
              </label>
              <input
                name="orderPrefix"
                value={form.orderPrefix}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm uppercase"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Used when generating order numbers, e.g. SPL-2025-0001.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Online payments
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="autoConfirmPaidOnline"
                checked={form.autoConfirmPaidOnline}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-600">
                Automatically mark online-paid orders as &quot;confirmed&quot;.
              </span>
            </div>
          </div>
        </section>

        {/* Shipping */}
        <section className="bg-white border rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              Shipping (Bangladesh)
            </h2>
            <p className="text-xs text-gray-500">
              Base delivery charges and free shipping thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Inside Dhaka (৳)
              </label>
              <input
                type="number"
                name="insideDhaka"
                value={form.insideDhaka}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Outside Dhaka (৳)
              </label>
              <input
                type="number"
                name="outsideDhaka"
                value={form.outsideDhaka}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Free shipping threshold (৳)
              </label>
              <input
                type="number"
                name="freeShippingThreshold"
                value={form.freeShippingThreshold}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                0 = always charge shipping.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Express extra (inside Dhaka)
              </label>
              <input
                type="number"
                name="expressExtraInsideDhaka"
                value={form.expressExtraInsideDhaka}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Express extra (outside Dhaka)
              </label>
              <input
                type="number"
                name="expressExtraOutsideDhaka"
                value={form.expressExtraOutsideDhaka}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* UI & maintenance */}
        <section className="bg-white border rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              UI & maintenance
            </h2>
            <p className="text-xs text-gray-500">
              Brand colors, homepage texts and maintenance mode.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Primary color
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  name="primaryColor"
                  value={form.primaryColor}
                  onChange={handleChange}
                  className="h-9 w-12 rounded-md border bg-white"
                />
                <input
                  name="primaryColor"
                  value={form.primaryColor}
                  onChange={handleChange}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Secondary color
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  name="secondaryColor"
                  value={form.secondaryColor}
                  onChange={handleChange}
                  className="h-9 w-12 rounded-md border bg-white"
                />
                <input
                  name="secondaryColor"
                  value={form.secondaryColor}
                  onChange={handleChange}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Homepage banner text
              </label>
              <textarea
                name="homepageBannerText"
                value={form.homepageBannerText}
                onChange={handleChange}
                placeholder="E.g. Eid offer, 0% EMI on selected laptops…"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[70px]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Announcement bar text
              </label>
              <textarea
                name="announcementBarText"
                value={form.announcementBarText}
                onChange={handleChange}
                placeholder="Short strip at top of site"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[70px]"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Maintenance mode
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="maintenanceEnabled"
                checked={form.maintenanceEnabled}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-600">
                When enabled, you can show a maintenance notice on the
                storefront.
              </span>
            </div>
            <textarea
              name="maintenanceMessage"
              value={form.maintenanceMessage}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[70px]"
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${
              saving
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={loadSettings}
            className="rounded-xl border bg-white px-6 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            Reset from server
          </button>
        </div>
      </form>
    </div>
  );
}
