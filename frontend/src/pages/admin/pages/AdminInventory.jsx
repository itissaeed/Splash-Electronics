import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const nice = (n) => Number(n || 0).toLocaleString("en-BD");
const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const PIE_COLORS = ["#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        {hint ? <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function Donut({ title, rows }) {
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  if (!rows.length || total <= 0) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-6 text-sm text-slate-500">No data yet.</p>
      </div>
    );
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
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
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
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
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
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
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${width}%` }} />
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
  const [metrics, setMetrics] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [allStock, setAllStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [stockQuery, setStockQuery] = useState("");
  const [stockCategory, setStockCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [selected, setSelected] = useState(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("MANUAL");
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

  const totalLowStockUnits = useMemo(
    () => lowStock.reduce((sum, v) => sum + Number(v.stock || 0), 0),
    [lowStock]
  );

  const stockHealthRows = useMemo(() => {
    const totalSkus = Number(metrics?.totalSkus || 0);
    const lowCount = Number(metrics?.lowStockCount || 0);
    const outCount = lowStock.filter((v) => Number(v.stock || 0) === 0).length;
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
    const counts = { IN: 0, OUT: 0, ADJUST: 0 };
    movements.forEach((m) => {
      const t = String(m.type || "").toUpperCase();
      if (counts[t] !== undefined) counts[t] += Number(m.qty || 0);
    });
    return [
      { label: "Stock In", value: counts.IN },
      { label: "Stock Out", value: counts.OUT },
      { label: "Adjustments", value: counts.ADJUST },
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
      else row.adjustQty += qty;
      row.total += qty;
    });
    return [...bucket.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-7);
  }, [movements]);

  const handleSelectVariant = (entry) => {
    setSelected(entry);
    setDelta("");
    setReason("MANUAL");
    setNote("");
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
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-emerald-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Inventory Intelligence</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Visual command center for stock health, risk and movement</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white/90 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">Threshold</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
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
        <StatCard label="Units In Stock" value={nice(metrics?.totalUnitsInStock ?? 0)} hint="Across all active products" accent="bg-emerald-400/40" />
        <StatCard label="Stock Value" value={money(metrics?.totalStockValue ?? 0)} hint="Based on sell prices" accent="bg-sky-400/40" />
        <StatCard
          label={`Low Stock <= ${threshold}`}
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
        <div className="xl:col-span-2 rounded-3xl border border-white/70 bg-white/90 shadow-sm backdrop-blur overflow-hidden">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <div className="font-extrabold text-slate-900">Low-stock variants</div>
            <div className="text-xs text-slate-500">Select a row to adjust stock</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold">Brand / Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Stock</th>
                  <th className="text-right px-4 py-3 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : lowStock.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      No variants are at or below threshold.
                    </td>
                  </tr>
                ) : (
                  lowStock.map((v) => {
                    const isSelected = selected && selected.productId === v.productId && selected.variantId === v.variantId;
                    return (
                      <tr
                        key={`${v.productId}-${v.variantId}`}
                        className={`border-t cursor-pointer ${isSelected ? "bg-cyan-50" : "hover:bg-slate-50"}`}
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
                            className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                              Number(v.stock || 0) === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {nice(v.stock)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(v.price)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur h-fit">
          <div className="font-extrabold text-slate-900 mb-2">Manual Stock Adjustment</div>
          <p className="text-xs text-slate-500 mb-4">Select a low-stock variant then apply an adjustment.</p>
          {selected ? (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="text-sm">
                <div className="font-semibold text-slate-900 line-clamp-2">{selected.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  SKU: <span className="font-mono font-semibold">{selected.sku || "-"}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Current stock: <span className="font-bold text-slate-900">{nice(selected.stock)}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Delta (can be negative)</label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. 10 or -2"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                >
                  <option value="MANUAL">MANUAL</option>
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
                  saving ? "bg-cyan-300 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500"
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
        <div className="xl:col-span-2">
          <TrendBars title="Recent Movement Trend (last active days)" rows={movementTrendRows} />
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h3 className="text-sm font-bold text-slate-900">Recent Inventory Movements</h3>
          {!movements.length ? (
            <p className="mt-6 text-sm text-slate-500">No inventory movements recorded yet.</p>
          ) : (
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {movements.slice(0, 10).map((m) => (
                <div key={m._id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">{m.product?.name || "Unknown product"}</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {new Date(m.createdAt).toLocaleString()} | {m.type} | {m.reason} | Qty {nice(m.qty)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/90 shadow-sm backdrop-blur overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
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
                <th className="text-right px-4 py-3 font-semibold">Stock</th>
                <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
                <th className="text-right px-4 py-3 font-semibold">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllStock.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No stock rows matched your filter.
                  </td>
                </tr>
              ) : (
                filteredAllStock.map((row) => {
                  const isSelected =
                    selected &&
                    selected.productId === row.productId &&
                    selected.variantId === row.variantId;
                  const stockNum = Number(row.stock || 0);
                  return (
                    <tr
                      key={`${row.productId}-${row.variantId}`}
                      className={`border-t cursor-pointer ${isSelected ? "bg-cyan-50" : "hover:bg-slate-50"}`}
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
                          className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                            stockNum <= 0
                              ? "bg-red-50 text-red-700"
                              : stockNum <= threshold
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {nice(stockNum)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(row.price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {money(stockNum * Number(row.price || 0))}
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
