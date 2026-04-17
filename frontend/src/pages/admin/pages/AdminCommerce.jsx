import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function StatCard({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p> : null}
        </div>
        <span className="rounded-2xl border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm">
          <Icon size={16} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </label>
  );
}

function ToggleRow({ title, description, checked, name, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <label className="inline-flex cursor-pointer items-center">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="relative h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-cyan-600">
          <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>
    </div>
  );
}

function OverrideCard({ row, idx, updateRow, removeRow }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Override {idx + 1}</p>
        <button
          type="button"
          onClick={() => removeRow(idx)}
          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Division">
          <input
            value={row.division}
            onChange={(e) => updateRow(idx, "division", e.target.value)}
            placeholder="Dhaka"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </Field>
        <Field label="District" hint="Optional">
          <input
            value={row.district}
            onChange={(e) => updateRow(idx, "district", e.target.value)}
            placeholder="Gazipur"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </Field>
        <Field label="Fee (BDT)">
          <input
            type="number"
            value={row.fee}
            onChange={(e) => updateRow(idx, "fee", e.target.value)}
            placeholder="150"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </Field>
      </div>
    </div>
  );
}

export default function AdminCommerce() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [form, setForm] = useState({
    allowCOD: true,
    codMaxAmount: 50000,
    autoConfirmPaidOnline: true,
    orderPrefix: "SPL",
    insideDhaka: 60,
    outsideDhaka: 100,
    freeShippingThreshold: 5000,
    expressExtraInsideDhaka: 80,
    expressExtraOutsideDhaka: 120,
    shippingOverrides: [],
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const updateOverrideRow = (idx, key, value) => {
    setForm((prev) => {
      const next = [...(prev.shippingOverrides || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, shippingOverrides: next };
    });
  };

  const removeOverrideRow = (idx) => {
    setForm((prev) => ({
      ...prev,
      shippingOverrides: (prev.shippingOverrides || []).filter((_, i) => i !== idx),
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
      }));
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to load commerce settings.");
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
        },
        { headers: tokenHeader() }
      );

      setLastUpdated(data.updatedAt || null);
      alert("Commerce settings saved successfully.");
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to save commerce settings.");
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(
    () => ({
      overrideCount: form.shippingOverrides.filter((row) => String(row.division || "").trim()).length,
      codStatus: form.allowCOD ? "Enabled" : "Disabled",
      expressLabel: `+${Number(form.expressExtraInsideDhaka || 0).toLocaleString("en-BD")} / +${Number(
        form.expressExtraOutsideDhaka || 0
      ).toLocaleString("en-BD")}`,
    }),
    [form]
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.16),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#ffffff_48%,_#ecfeff)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.45),transparent)] opacity-60" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-700">Commerce Controls</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Checkout And Shipping Settings</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
              Manage checkout rules, order numbering, shipping prices, and regional delivery settings.
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            {lastUpdated ? (
              <div>
                Last updated: <span className="font-semibold">{new Date(lastUpdated).toLocaleString()}</span>
              </div>
            ) : null}
            {loading ? <div className="mt-1 text-cyan-700">Loading...</div> : null}
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-sm">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-100">Commerce Snapshot</span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-semibold text-emerald-200">{summary.codStatus} COD</span>
              <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-200">{summary.overrideCount} override{summary.overrideCount === 1 ? "" : "s"}</span>
            </div>
            <h2 className="mt-4 text-xl font-black tracking-tight">Commerce Overview</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Review key checkout and shipping settings at a glance.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Order Prefix</p>
                <p className="mt-1 text-base font-bold">{form.orderPrefix || "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Free Shipping</p>
                <p className="mt-1 text-base font-bold">{Number(form.freeShippingThreshold || 0).toLocaleString("en-BD")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Inside Dhaka</p>
                <p className="mt-1 text-base font-bold">{Number(form.insideDhaka || 0).toLocaleString("en-BD")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Express Extra</p>
                <p className="mt-1 text-base font-bold">{summary.expressLabel}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <p className="text-sm font-bold text-slate-900">Settings Summary</p>
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                Update payment rules, delivery charges, and regional shipping overrides from one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {errMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errMsg}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="COD"
          value={summary.codStatus}
          hint={`Max ${Number(form.codMaxAmount || 0).toLocaleString("en-BD")} BDT`}
          icon={CreditCard}
          accent="bg-sky-400/35"
        />
        <StatCard
          label="Inside Dhaka"
          value={`${Number(form.insideDhaka || 0).toLocaleString("en-BD")} BDT`}
          hint={`Express +${Number(form.expressExtraInsideDhaka || 0).toLocaleString("en-BD")}`}
          icon={Truck}
          accent="bg-cyan-400/35"
        />
        <StatCard
          label="Outside Dhaka"
          value={`${Number(form.outsideDhaka || 0).toLocaleString("en-BD")} BDT`}
          hint={`Express +${Number(form.expressExtraOutsideDhaka || 0).toLocaleString("en-BD")}`}
          icon={Truck}
          accent="bg-emerald-400/35"
        />
        <StatCard
          label="Free Shipping"
          value={`${Number(form.freeShippingThreshold || 0).toLocaleString("en-BD")} BDT`}
          hint={`${summary.overrideCount} custom regional rule${summary.overrideCount === 1 ? "" : "s"}`}
          icon={PackageCheck}
          accent="bg-amber-400/35"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Order And Checkout"
            subtitle="Control what customers can do during checkout and how order numbers are generated."
            right={<span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">Payment policy</span>}
          >
            <div className="space-y-4">
              <ToggleRow
                title="Cash On Delivery"
                description="Allow customers to choose COD at checkout."
                checked={form.allowCOD}
                name="allowCOD"
                onChange={handleChange}
              />

              <ToggleRow
                title="Auto-confirm Online Payments"
                description="Mark online-paid orders as confirmed automatically."
                checked={form.autoConfirmPaidOnline}
                name="autoConfirmPaidOnline"
                onChange={handleChange}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="COD max amount (Tk)" hint="Orders above this amount cannot use COD.">
                  <input
                    type="number"
                    name="codMaxAmount"
                    value={form.codMaxAmount}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                </Field>
                <Field label="Order prefix" hint="Used in generated order IDs, e.g. SPL-2026-0001.">
                  <input
                    name="orderPrefix"
                    value={form.orderPrefix}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Shipping Pricing"
            subtitle="Configure standard and express shipping prices for Bangladesh."
            right={<span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">Delivery rules</span>}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Inside Dhaka (Tk)">
                <input
                  type="number"
                  name="insideDhaka"
                  value={form.insideDhaka}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>
              <Field label="Outside Dhaka (Tk)">
                <input
                  type="number"
                  name="outsideDhaka"
                  value={form.outsideDhaka}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>
              <Field label="Express extra (inside Dhaka)">
                <input
                  type="number"
                  name="expressExtraInsideDhaka"
                  value={form.expressExtraInsideDhaka}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>
              <Field label="Express extra (outside Dhaka)">
                <input
                  type="number"
                  name="expressExtraOutsideDhaka"
                  value={form.expressExtraOutsideDhaka}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Free shipping threshold (Tk)" hint="Set 0 if you always want to charge shipping.">
                  <input
                    type="number"
                    name="freeShippingThreshold"
                    value={form.freeShippingThreshold}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Regional Overrides"
          subtitle="Apply special shipping fees for a division or a specific district."
          right={
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  shippingOverrides: [...(prev.shippingOverrides || []), { division: "", district: "", fee: "" }],
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Add Region
            </button>
          }
        >
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">Example</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Hard-to-reach areas</p>
              <p className="mt-1 text-xs text-slate-600">Useful when a specific district costs more than the normal regional rate.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Region Rule</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Leave district empty</p>
              <p className="mt-1 text-xs text-slate-600">That makes the rule apply to the whole division instead of only one district.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Active Rules</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{summary.overrideCount} active override rules</p>
              <p className="mt-1 text-xs text-slate-600">Keep this list short so operations teams can review and maintain it quickly.</p>
            </div>
          </div>

          <div className="space-y-3">
            {(form.shippingOverrides || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center">
                <ShieldCheck size={20} className="mx-auto text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-800">No regional overrides yet</p>
                <p className="mt-1 text-xs text-slate-500">Add a region only if its delivery pricing needs to be different from the base rule.</p>
              </div>
            ) : (
              form.shippingOverrides.map((row, idx) => (
                <OverrideCard
                  key={idx}
                  row={row}
                  idx={idx}
                  updateRow={updateOverrideRow}
                  removeRow={removeOverrideRow}
                />
              ))
            )}
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition ${
              saving || loading ? "cursor-not-allowed bg-cyan-300" : "bg-cyan-600 hover:bg-cyan-500"
            }`}
          >
            {saving ? "Saving..." : loading ? "Loading..." : "Save Commerce Settings"}
          </button>
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving || loading}
            className={`inline-flex items-center gap-2 rounded-2xl border px-6 py-3 text-sm font-semibold transition ${
              saving || loading
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Reset From Server"}
          </button>
        </div>
      </form>
    </div>
  );
}
