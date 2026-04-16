import React, { useEffect, useState } from "react";
import { MonitorSmartphone, Paintbrush, RefreshCw, Store } from "lucide-react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function StatCard({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p> : null}
        </div>
        <span className="rounded-2xl border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm">
          <Icon size={16} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [form, setForm] = useState({
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
    primaryColor: "#4F46E5",
    secondaryColor: "#EC4899",
    homepageBannerText: "",
    announcementBarText: "",
    maintenanceEnabled: false,
    maintenanceMessage: "We are doing some maintenance. You may experience temporary issues.",
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
        primaryColor: data.ui?.primaryColor || prev.primaryColor,
        secondaryColor: data.ui?.secondaryColor || prev.secondaryColor,
        homepageBannerText: data.ui?.homepageBannerText || "",
        announcementBarText: data.ui?.announcementBarText || "",
        maintenanceEnabled: data.maintenance?.enabled || false,
        maintenanceMessage: data.maintenance?.message || prev.maintenanceMessage,
      }));
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg("");

    try {
      const { data } = await api.put(
        "/admin/settings",
        {
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
        },
        { headers: tokenHeader() }
      );

      setLastUpdated(data.updatedAt || null);
      alert("Settings saved successfully.");
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#ffffff_48%,_#faf5ff)] p-5 sm:p-6">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-700">Store Settings</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Brand, Storefront, And Maintenance</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
              Checkout and shipping controls have been moved to a separate tab so this page stays focused on branding and storefront configuration.
            </p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            {lastUpdated ? (
              <div>
                Last updated: <span className="font-semibold">{new Date(lastUpdated).toLocaleString()}</span>
              </div>
            ) : null}
            {loading ? <div className="mt-1 text-indigo-700">Loading...</div> : null}
          </div>
        </div>
      </div>

      {errMsg ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errMsg}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Store Name" value={form.storeName || "-"} hint="Brand identity used across the store" icon={Store} accent="bg-indigo-400/35" />
        <StatCard label="Support Email" value={form.supportEmail || "-"} hint="Primary customer support address" icon={MonitorSmartphone} accent="bg-sky-400/35" />
        <StatCard label="Primary Color" value={form.primaryColor} hint="Storefront theme tone" icon={Paintbrush} accent="bg-fuchsia-400/30" />
        <StatCard label="Maintenance" value={form.maintenanceEnabled ? "Enabled" : "Disabled"} hint="Storefront availability control" icon={RefreshCw} accent="bg-amber-400/35" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white border rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Store Profile</h2>
            <p className="text-xs text-gray-500">These values appear on invoices, emails, and footer sections.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Store name</label>
              <input name="storeName" value={form.storeName} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Logo URL</label>
              <input name="logoUrl" value={form.logoUrl} onChange={handleChange} placeholder="https://..." className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Support email</label>
              <input name="supportEmail" type="email" value={form.supportEmail} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Support phone</label>
              <input name="supportPhone" value={form.supportPhone} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Support hours</label>
              <input name="supportHours" value={form.supportHours} onChange={handleChange} placeholder="9 AM - 8 PM" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Address line 1</label>
              <input name="addressLine1" value={form.addressLine1} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Address line 2</label>
              <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">City</label>
              <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">District</label>
              <input name="district" value={form.district} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">UI And Maintenance</h2>
            <p className="text-xs text-gray-500">Brand colors, homepage messaging, and maintenance notice settings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Primary color</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" name="primaryColor" value={form.primaryColor} onChange={handleChange} className="h-9 w-12 rounded-md border bg-white" />
                <input name="primaryColor" value={form.primaryColor} onChange={handleChange} className="flex-1 rounded-xl border px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Secondary color</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" name="secondaryColor" value={form.secondaryColor} onChange={handleChange} className="h-9 w-12 rounded-md border bg-white" />
                <input name="secondaryColor" value={form.secondaryColor} onChange={handleChange} className="flex-1 rounded-xl border px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Homepage banner text</label>
              <textarea name="homepageBannerText" value={form.homepageBannerText} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[70px]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Announcement bar text</label>
              <textarea name="announcementBarText" value={form.announcementBarText} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[70px]" />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="text-sm font-semibold text-gray-700">Maintenance mode</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="maintenanceEnabled" checked={form.maintenanceEnabled} onChange={handleChange} className="rounded border-gray-300" />
              <span className="text-xs text-gray-600">Show a maintenance notice on the storefront when needed.</span>
            </div>
            <textarea name="maintenanceMessage" value={form.maintenanceMessage} onChange={handleChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[70px]" />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${
              saving ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {saving ? "Saving..." : "Save changes"}
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
