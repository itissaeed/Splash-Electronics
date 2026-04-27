import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../utils/api";

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const nice = (n) => Number(n || 0).toLocaleString("en-BD");
const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const PIE_COLORS = ["#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.45)]">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-80 blur-2xl ${accent}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-cyan-500 to-emerald-500 opacity-80" />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        {hint ? <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function Donut({ title, rows }) {
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  if (!rows.length || total <= 0) {
    return (
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-6 text-sm text-slate-500">No data yet.</p>
      </div>
    );
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
      <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4 items-center">
        <div className="mx-auto">
          <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
            {rows.map((row, idx) => {
              const ratio = Number(row.value || 0) / total;
              const dash = ratio * circumference;
              const color = PIE_COLORS[idx % PIE_COLORS.length];
              const segment = (
                <circle
                  key={row.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return segment;
            })}
          </svg>
        </div>
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const pct = ((Number(row.value || 0) / total) * 100).toFixed(1);
            return (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <p className="truncate text-xs font-semibold text-slate-700">{row.label}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                  {nice(row.value)} ({pct}%)
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrendBars({ title, rows }) {
  const max = Math.max(...rows.map((r) => Number(r.total || 0)), 1);
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
      <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{title}</h3>
      {!rows.length ? (
        <p className="mt-6 text-sm text-slate-500">No movement activity yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const width = Math.max(8, Math.round((Number(row.total || 0) / max) * 100));
            return (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <p className="font-semibold text-slate-700">{row.label}</p>
                  <p className="font-semibold text-slate-900">
                    {nice(row.total)} total ({nice(row.inQty)} in / {nice(row.outQty)} out)
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminInventory() {
  const location = useLocation();
  const urlKeyword = useMemo(
    () => new URLSearchParams(location.search).get("keyword") || "",
    [location.search]
  );
  const [metrics, setMetrics] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [allStock, setAllStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [stockQuery, setStockQuery] = useState(urlKeyword);
  const [stockCategory, setStockCategory] = useState("all");
  const [movementQuery, setMovementQuery] = useState(urlKeyword);
  const [movementType, setMovementType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [selected, setSelected] = useState(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("MANUAL_ADJUST");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrMsg("");
      const { data } = await api.get(
        `/admin/inventory/overview?threshold=${encodeURIComponent(threshold)}`,
        { headers: tokenHeader() }
      );
      setMetrics(data.metrics || null);
      setLowStock(data.lowStock || []);
      setAllStock(data.allStock || []);
      setMovements(data.recentMovements || []);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to load inventory overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  useEffect(() => {
    setStockQuery(urlKeyword);
    setMovementQuery(urlKeyword);
  }, [urlKeyword]);

  const totalLowStockUnits = useMemo(
    () => lowStock.reduce((sum, v) => sum + Number(v.available || v.stock || 0), 0),
    [lowStock]
  );

  const stockHealthRows = useMemo(() => {
    const totalSkus = Number(metrics?.totalSkus || 0);
    const lowCount = Number(metrics?.lowStockCount || 0);
    const outCount = lowStock.filter((v) => Number(v.available || v.stock || 0) === 0).length;
    const healthy = Math.max(totalSkus - lowCount, 0);
    const lowButPositive = Math.max(lowCount - outCount, 0);
    return [
      { label: "Healthy", value: healthy },
      { label: "Low Stock", value: lowButPositive },
      { label: "Out of Stock", value: outCount },
    ];
  }, [metrics, lowStock]);

  const lowStockByCategory = useMemo(() => {
    const map = new Map();
    lowStock.forEach((v) => {
      const key = v.category || "Uncategorized";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [lowStock]);

  const stockCategories = useMemo(() => {
    const set = new Set(
      allStock.map((row) => row.category || "Uncategorized")
    );
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [allStock]);

  const filteredAllStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    return allStock.filter((row) => {
      const category = row.category || "Uncategorized";
      if (stockCategory !== "all" && category !== stockCategory) return false;
      if (!q) return true;
      return (
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.sku || "").toLowerCase().includes(q) ||
        String(row.brand || "").toLowerCase().includes(q) ||
        String(category || "").toLowerCase().includes(q)
      );
    });
  }, [allStock, stockCategory, stockQuery]);

  const movementTypeRows = useMemo(() => {
    const counts = { IN: 0, OUT: 0, ADJUST: 0, RESERVE: 0, RELEASE: 0 };
    movements.forEach((m) => {
      const t = String(m.type || "").toUpperCase();
      if (counts[t] !== undefined) counts[t] += Number(m.qty || 0);
    });
    return [
      { label: "Stock In", value: counts.IN },
      { label: "Stock Out", value: counts.OUT },
      { label: "Adjustments", value: counts.ADJUST },
      { label: "Reserved", value: counts.RESERVE },
      { label: "Released", value: counts.RELEASE },
    ].filter((x) => x.value > 0);
  }, [movements]);

  const movementTrendRows = useMemo(() => {
    const bucket = new Map();
    movements.forEach((m) => {
      const d = new Date(m.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const label = d.toISOString().slice(0, 10);
      if (!bucket.has(label)) bucket.set(label, { label, inQty: 0, outQty: 0, adjustQty: 0, total: 0 });
      const row = bucket.get(label);
      const qty = Number(m.qty || 0);
      const type = String(m.type || "").toUpperCase();
      if (type === "IN") row.inQty += qty;
      else if (type === "OUT") row.outQty += qty;
      else if (type === "RESERVE") row.outQty += qty;
      else if (type === "RELEASE") row.inQty += qty;
      else row.adjustQty += qty;
      row.total += qty;
    });
    return [...bucket.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-7);
  }, [movements]);

  const movementTypes = useMemo(() => {
    const set = new Set(
      movements.map((m) => String(m.type || "").toUpperCase()).filter(Boolean)
    );
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const q = movementQuery.trim().toLowerCase();
    return movements.filter((m) => {
      const type = String(m.type || "").toUpperCase();
      if (movementType !== "all" && type !== movementType) return false;
      if (!q) return true;
      return (
        String(m.product?.name || "").toLowerCase().includes(q) ||
        String(m.sku || "").toLowerCase().includes(q) ||
        String(m.reason || "").toLowerCase().includes(q) ||
        String(m.note || "").toLowerCase().includes(q) ||
        String(m.actor?.name || m.actor?.email || "").toLowerCase().includes(q)
      );
    });
  }, [movements, movementQuery, movementType]);

  const handleSelectVariant = (entry) => {
    setSelected(entry);
    setDelta("");
    setReason("MANUAL_ADJUST");
    setNote("");
  };

  const applyPreset = (preset) => {
    if (!selected) {
      alert("Select a variant first.");
      return;
    }

    const label = selected.sku || selected.name;
    if (preset === "add") {
      setDelta("10");
      setReason("PURCHASE");
      setNote(`Restock for ${label}`);
    } else if (preset === "remove") {
      setDelta("-1");
      setReason("DAMAGE");
      setNote(`Remove damaged unit from ${label}`);
    } else if (preset === "correction") {
      setDelta("");
      setReason("MANUAL_ADJUST");
      setNote(`Cycle count correction for ${label}`);
    } else if (preset === "return") {
      setDelta("1");
      setReason("RETURN");
      setNote(`Return received for ${label}`);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!selected) {
      alert("Select a variant from the low-stock table first.");
      return;
    }
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      alert("Delta must be a non-zero number (positive or negative).");
      return;
    }

    try {
      setSaving(true);
      await api.post(
        "/admin/inventory/adjust",
        {
          productId: selected.productId,
          variantId: selected.variantId,
          delta: d,
          reason,
          note,
        },
        { headers: tokenHeader() }
      );
      await fetchOverview();
      alert("Inventory updated!");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update inventory.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.18),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#ecfeff_45%,_#f0fdf4_100%)] p-5 sm:p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
              Operations
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Inventory Intelligence</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Operational view of sellable stock, reservations, and stock movements across your catalog.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Global Alert</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm font-semibold"
            />
            <button
              onClick={fetchOverview}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {errMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errMsg}</div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total SKUs" value={nice(metrics?.totalSkus ?? 0)} hint="Active variants tracked" accent="bg-cyan-400/40" />
        <StatCard label="Units Available" value={nice(metrics?.totalUnitsAvailable ?? 0)} hint={`${nice(metrics?.totalUnitsReserved ?? 0)} reserved right now`} accent="bg-emerald-400/40" />
        <StatCard label="On-Hand Value" value={money(metrics?.totalStockValue ?? 0)} hint={`${nice(metrics?.totalUnitsOnHand ?? 0)} physical units in catalog`} accent="bg-sky-400/40" />
        <StatCard
          label={`Low Available <= ${threshold}`}
          value={`${nice(metrics?.lowStockCount ?? 0)} variants`}
          hint={`${nice(totalLowStockUnits)} units within low-stock group`}
          accent="bg-teal-400/40"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Donut title="Stock Health Composition" rows={stockHealthRows} />
        <Donut title="Movement Type Mix" rows={movementTypeRows} />
        <Donut title="Low-Stock by Category" rows={lowStockByCategory} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
            <div>
              <div className="font-extrabold tracking-tight text-slate-900">Low Availability Queue</div>
              <div className="text-xs text-slate-500">Threshold uses sellable stock after reservations</div>
            </div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
              Action Needed
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold">Brand / Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Available</th>
                  <th className="text-right px-4 py-3 font-semibold">Threshold</th>
                  <th className="text-right px-4 py-3 font-semibold">Reserved</th>
                  <th className="text-right px-4 py-3 font-semibold">On Hand</th>
                  <th className="text-right px-4 py-3 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : lowStock.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      No variants are at or below threshold.
                    </td>
                  </tr>
                ) : (
                  lowStock.map((v) => {
                    const isSelected = selected && selected.productId === v.productId && selected.variantId === v.variantId;
                    return (
                      <tr
                        key={`${v.productId}-${v.variantId}`}
                        className={`border-t cursor-pointer transition ${isSelected ? "bg-cyan-50/70 ring-1 ring-inset ring-cyan-200" : "hover:bg-slate-50"}`}
                        onClick={() => handleSelectVariant(v)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 line-clamp-1">{v.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-mono text-slate-700">{v.sku || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {v.brand && <span>{v.brand}</span>}
                          {v.brand && v.category && <span> / </span>}
                          {v.category && <span>{v.category}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                              Number(v.available || v.stock || 0) === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {nice(v.available || v.stock)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{nice(v.threshold)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{nice(v.reserved)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{nice(v.onHand)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(v.price)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-fit rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="font-extrabold tracking-tight text-slate-900">On-Hand Inventory Adjustment</div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Manual
            </div>
          </div>
          <p className="mb-4 text-xs leading-5 text-slate-500">Change physical stock. Reserved units are protected from being adjusted below active demand.</p>
          {selected ? (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="text-sm">
                <div className="font-semibold text-slate-900 line-clamp-2">{selected.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  SKU: <span className="font-mono font-semibold">{selected.sku || "-"}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Available</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{nice(selected.available || selected.stock)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Threshold</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{nice(selected.threshold)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Reserved</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{nice(selected.reserved)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">On Hand</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{nice(selected.onHand ?? selected.stock)}</div>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Quick Actions</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => applyPreset("add")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                    Add Stock
                  </button>
                  <button type="button" onClick={() => applyPreset("remove")} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                    Remove Stock
                  </button>
                  <button type="button" onClick={() => applyPreset("correction")} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                    Correction
                  </button>
                  <button type="button" onClick={() => applyPreset("return")} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100">
                    Return Received
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">On-hand delta (can be negative)</label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. 10 or -2"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="MANUAL_ADJUST">MANUAL_ADJUST</option>
                  <option value="PURCHASE">PURCHASE</option>
                  <option value="DAMAGE">DAMAGE</option>
                  <option value="RETURN">RETURN</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Internal note"
                  className="mt-1 min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
                  saving ? "bg-cyan-300 cursor-not-allowed" : "bg-cyan-700 hover:bg-cyan-600"
                }`}
              >
                {saving ? "Saving..." : "Apply Adjustment"}
              </button>
            </form>
          ) : (
            <div className="text-sm text-slate-500">No variant selected yet.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <TrendBars title="Recent Movement Trend (last active days)" rows={movementTrendRows} />
        </div>
        <div className="xl:col-span-2 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Recent Inventory Movements</h3>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Snapshot
            </div>
          </div>
          {!movements.length ? (
            <p className="mt-6 text-sm text-slate-500">No inventory movements recorded yet.</p>
          ) : (
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
              {movements.slice(0, 10).map((m) => (
                <div key={m._id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                    {m.product?.name || "Unknown product"} {m.sku ? `• ${m.sku}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {new Date(m.createdAt).toLocaleString()} | {m.type} | {m.reason} | Change {nice(m.deltaQty || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    On hand {nice(m.oldOnHand)} → {nice(m.newOnHand)} | Available {nice(m.oldAvailable)} → {nice(m.newAvailable)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {m.actor?.name || m.actor?.email || "System"}{m.note ? ` | ${m.note}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <h3 className="font-extrabold text-slate-900">Inventory Movement History</h3>
            <p className="text-xs text-slate-500">
              Full ledger view with before/after snapshots ({nice(filteredMovements.length)} shown)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={movementQuery}
              onChange={(e) => setMovementQuery(e.target.value)}
              placeholder="Search product / SKU / reason / actor"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm w-72"
            />
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {movementTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All movement types" : type}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 font-semibold">Type / Reason</th>
                <th className="text-right px-4 py-3 font-semibold">Change</th>
                <th className="text-left px-4 py-3 font-semibold">On Hand</th>
                <th className="text-left px-4 py-3 font-semibold">Available</th>
                <th className="text-left px-4 py-3 font-semibold">Actor</th>
                <th className="text-left px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    No inventory movements matched your filter.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const deltaNum = Number(m.deltaQty || 0);
                  const deltaClass =
                    deltaNum > 0
                      ? "text-emerald-700"
                      : deltaNum < 0
                      ? "text-rose-700"
                      : "text-slate-700";
                  return (
                    <tr key={m._id} className="border-t transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {m.product?.name || "Unknown product"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-700">
                        {m.sku || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{m.type}</div>
                        <div className="text-xs text-slate-500">{m.reason}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${deltaClass}`}>
                        {deltaNum > 0 ? "+" : ""}
                        {nice(deltaNum)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {nice(m.oldOnHand)} -&gt; {nice(m.newOnHand)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {nice(m.oldAvailable)} -&gt; {nice(m.newAvailable)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {m.actor?.name || m.actor?.email || "System"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[280px]">
                        <div className="line-clamp-2">{m.note || "-"}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.32)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div>
            <div className="font-extrabold text-slate-900">All Stock</div>
            <div className="text-xs text-slate-500">
              Full SKU inventory view ({nice(filteredAllStock.length)} shown)
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Search product / SKU / brand"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm w-64"
            />
            <select
              value={stockCategory}
              onChange={(e) => setStockCategory(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {stockCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All categories" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 font-semibold">Brand / Category</th>
                <th className="text-right px-4 py-3 font-semibold">Available</th>
                <th className="text-right px-4 py-3 font-semibold">Threshold</th>
                <th className="text-right px-4 py-3 font-semibold">Reserved</th>
                <th className="text-right px-4 py-3 font-semibold">On Hand</th>
                <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                <th className="text-right px-4 py-3 font-semibold">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllStock.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    No stock rows matched your filter.
                  </td>
                </tr>
              ) : (
                filteredAllStock.map((row) => {
                  const isSelected =
                    selected &&
                    selected.productId === row.productId &&
                    selected.variantId === row.variantId;
                  const availableNum = Number(row.available || row.stock || 0);
                  return (
                    <tr
                      key={`${row.productId}-${row.variantId}`}
                      className={`border-t cursor-pointer transition ${isSelected ? "bg-cyan-50/70 ring-1 ring-inset ring-cyan-200" : "hover:bg-slate-50"}`}
                      onClick={() => handleSelectVariant(row)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">{row.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-700">{row.sku || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {row.brand || "-"} / {row.category || "Uncategorized"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                            className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                            availableNum <= 0
                              ? "bg-red-100 text-red-700"
                              : availableNum <= threshold
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {nice(availableNum)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{nice(row.threshold)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{nice(row.reserved)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{nice(row.onHand)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(row.price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {money(Number(row.onHand || 0) * Number(row.price || 0))}
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
