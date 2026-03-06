import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const nice = (n) => Number(n || 0).toLocaleString("en-BD");
const PALETTE = ["#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#0ea5e9"];

function StatCard({ label, value, subtitle, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        {subtitle ? <p className="mt-2 text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function DonutShare({ title, rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.forecastRevenue || 0), 0);
  if (!rows.length || total <= 0) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-6 text-sm text-slate-500">No category forecast data.</p>
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
              const ratio = Number(row.forecastRevenue || 0) / total;
              const dash = ratio * circumference;
              const segment = (
                <circle
                  key={row.categoryId || row.categoryName || idx}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={PALETTE[idx % PALETTE.length]}
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
            const rev = Number(row.forecastRevenue || 0);
            const pct = ((rev / total) * 100).toFixed(1);
            return (
              <div
                key={`${row.categoryId || row.categoryName || "cat"}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <p className="truncate text-xs font-semibold text-slate-700">{row.categoryName || "Unknown"}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                  {money(rev)} ({pct}%)
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ForecastMomentum({ rows, horizonDays }) {
  if (!rows.length) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-sm font-bold text-slate-900">Forecast Momentum</h3>
        <p className="mt-6 text-sm text-slate-500">No product forecast data in this range.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...rows.map((x) => Number(x.forecastRevenue || 0)), 1);
  const points = rows.map((x, idx) => {
    const xPos = rows.length > 1 ? (idx / (rows.length - 1)) * 100 : 50;
    const yPos = 100 - (Number(x.forecastRevenue || 0) / maxRevenue) * 100;
    return `${xPos},${yPos}`;
  });
  const polyline = points.join(" ");
  const area = `M 0 100 L ${polyline} L 100 100 Z`;

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">Forecast Momentum</h3>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
          Next {horizonDays} days
        </span>
      </div>
      <svg viewBox="0 0 100 100" className="h-56 w-full rounded-2xl bg-slate-950/[0.03]">
        <defs>
          <linearGradient id="forecastArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#forecastArea)" />
        <polyline fill="none" stroke="#0891b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
      </svg>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {rows.slice(0, 4).map((row) => (
          <div key={row.productId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="truncate font-semibold text-slate-700">{row.name}</p>
            <p className="text-slate-900">{money(row.forecastRevenue)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedProductBars({ rows }) {
  const max = Math.max(...rows.map((r) => Number(r.forecastRevenue || 0)), 1);
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <h3 className="text-sm font-bold text-slate-900">Top Forecasted Products</h3>
      {!rows.length ? (
        <p className="mt-6 text-sm text-slate-500">No order history in this period.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((p, idx) => {
            const width = Math.max(7, Math.round((Number(p.forecastRevenue || 0) / max) * 100));
            return (
              <div key={p.productId || `p-${idx}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold text-slate-700">{p.name}</p>
                  <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">{money(p.forecastRevenue)}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${width}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Qty {Math.round(p.forecastQty || 0)} | Avg/day {Number(p.avgDailyQty || 0).toFixed(2)} | {p.category || "Uncategorized"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const riskBadgeClass = (risk) => {
  if (risk === "stockout") return "bg-red-100 text-red-700";
  if (risk === "at_risk") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

const riskLabel = (risk) => {
  if (risk === "stockout") return "Stockout";
  if (risk === "at_risk") return "At Risk";
  return "Stable";
};

function StockRiskTable({ rows, horizonDays }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">Stockout Risk & Reorder Plan</h3>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
          Horizon {horizonDays}d
        </span>
      </div>
      {!rows.length ? (
        <p className="mt-6 text-sm text-slate-500">No risk detected in current forecast set.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Product</th>
                <th className="text-right px-3 py-2 font-semibold">Current Stock</th>
                <th className="text-right px-3 py-2 font-semibold">Forecast Qty</th>
                <th className="text-right px-3 py-2 font-semibold">Days Cover</th>
                <th className="text-right px-3 py-2 font-semibold">Projected End Stock</th>
                <th className="text-right px-3 py-2 font-semibold">Suggested Reorder</th>
                <th className="text-right px-3 py-2 font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, idx) => (
                <tr key={p.productId || `risk-${idx}`} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900 line-clamp-1">{p.name}</p>
                    <p className="text-[11px] text-slate-500">{p.category || "Uncategorized"}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{nice(Math.round(p.currentStock || 0))}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{nice(Math.round(p.forecastQty || 0))}</td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {p.daysOfCover == null ? "-" : Number(p.daysOfCover).toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{nice(Math.round(p.projectedStockAtHorizon || 0))}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{nice(Math.round(p.suggestedReorderQty || 0))}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${riskBadgeClass(p.riskLevel)}`}>
                      {riskLabel(p.riskLevel)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-500">
        Suggested reorder includes forecast demand plus 7-day safety stock.
      </p>
    </div>
  );
}

export default function AdminForecasting() {
  const [daysBack, setDaysBack] = useState(90);
  const [horizonDays, setHorizonDays] = useState(30);
  const [productForecasts, setProductForecasts] = useState([]);
  const [categoryForecasts, setCategoryForecasts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const fetchForecast = async (opts = {}) => {
    try {
      setLoading(true);
      setErrMsg("");

      const params = {
        daysBack: opts.daysBack ?? daysBack,
        horizonDays: opts.horizonDays ?? horizonDays,
      };

      const { data } = await api.get("/admin/analytics/forecasting", {
        headers: tokenHeader(),
        params,
      });

      setProductForecasts(data.productForecasts || []);
      setCategoryForecasts(data.categoryForecasts || []);
      setSummary(data.summary || null);
      setRange(data.range || null);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to load demand forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchForecast({ daysBack, horizonDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysBack, horizonDays]);

  const topCategory = useMemo(() => {
    if (!categoryForecasts.length) return null;
    return [...categoryForecasts].sort((a, b) => (b.forecastRevenue || 0) - (a.forecastRevenue || 0))[0];
  }, [categoryForecasts]);

  const roundedSummary = summary
    ? {
        ...summary,
        totalForecastQty: Math.round(summary.totalForecastQty || 0),
        totalForecastRevenue: Math.round(summary.totalForecastRevenue || 0),
      }
    : null;

  const topProducts = useMemo(() => productForecasts.slice(0, 10), [productForecasts]);
  const topCategories = useMemo(() => categoryForecasts.slice(0, 6), [categoryForecasts]);
  const riskyProducts = useMemo(
    () =>
      productForecasts
        .filter((p) => (p.riskLevel && p.riskLevel !== "stable") || Number(p.suggestedReorderQty || 0) > 0)
        .sort((a, b) => {
          const aScore = a.riskLevel === "stockout" ? 2 : a.riskLevel === "at_risk" ? 1 : 0;
          const bScore = b.riskLevel === "stockout" ? 2 : b.riskLevel === "at_risk" ? 1 : 0;
          if (bScore !== aScore) return bScore - aScore;
          return Number(b.suggestedReorderQty || 0) - Number(a.suggestedReorderQty || 0);
        })
        .slice(0, 12),
    [productForecasts]
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-emerald-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Forecast Intelligence</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Premium demand forecasting view based on recent order behavior</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-300 bg-white/90 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">History</span>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm bg-white"
            >
              <option value={30}>30d</option>
              <option value={60}>60d</option>
              <option value={90}>90d</option>
              <option value={180}>180d</option>
            </select>
            <span className="text-xs font-semibold text-slate-600">Horizon</span>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm bg-white"
            >
              <option value={7}>7d</option>
              <option value={14}>14d</option>
              <option value={30}>30d</option>
              <option value={60}>60d</option>
            </select>
          </div>
        </div>
      </div>

      {errMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errMsg}</div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Forecast Revenue"
          value={money(roundedSummary?.totalForecastRevenue || 0)}
          subtitle={`Estimated next ${horizonDays} days`}
          accent="bg-cyan-400/40"
        />
        <StatCard
          label="Forecast Units"
          value={nice(roundedSummary?.totalForecastQty || 0)}
          subtitle="Across top products"
          accent="bg-emerald-400/40"
        />
        <StatCard
          label="Products Considered"
          value={nice(roundedSummary?.productCount || 0)}
          subtitle={`History: last ${daysBack} days`}
          accent="bg-amber-400/40"
        />
        <StatCard
          label="Projected Risk SKUs"
          value={nice(roundedSummary?.projectedStockoutCount || 0)}
          subtitle={topCategory ? `Leader: ${topCategory.categoryName || "Unknown"}` : "No category leader"}
          accent="bg-red-400/40"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Immediate Stockouts"
          value={nice(roundedSummary?.stockoutRiskCount || 0)}
          subtitle="Current stock is already zero"
          accent="bg-rose-400/30"
        />
        <StatCard
          label="Total Reorder Qty"
          value={nice(Math.round(roundedSummary?.totalSuggestedReorderQty || 0))}
          subtitle="Across forecasted products"
          accent="bg-orange-400/30"
        />
        <StatCard
          label="Categories Covered"
          value={nice(roundedSummary?.categoryCount || 0)}
          subtitle="Forecast distribution breadth"
          accent="bg-sky-400/30"
        />
      </div>

      {range ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-600">
          Training range: <span className="font-semibold">{new Date(range.from).toLocaleDateString()}</span> to{" "}
          <span className="font-semibold">{new Date(range.to).toLocaleDateString()}</span> ({range.daysBack || daysBack} days)
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">Calculating forecast...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ForecastMomentum rows={topProducts} horizonDays={horizonDays} />
            </div>
            <DonutShare title="Category Revenue Share" rows={topCategories} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <RankedProductBars rows={topProducts} />
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
              <h3 className="text-sm font-bold text-slate-900">Category Outlook</h3>
              {!categoryForecasts.length ? (
                <p className="mt-6 text-sm text-slate-500">No category forecast data.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {topCategories.map((c, idx) => (
                    <div
                      key={c.categoryId || `${c.categoryName || "unknown"}-${idx}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">{c.categoryName || "Unknown"}</p>
                        <p className="text-xs font-semibold text-slate-900">{money(c.forecastRevenue || 0)}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Forecast qty: {nice(Math.round(c.forecastQty || 0))}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-[11px] text-slate-500">
                Projection uses average daily demand from selected training window.
              </p>
            </div>
          </div>

          <StockRiskTable rows={riskyProducts} horizonDays={horizonDays} />
        </>
      )}
    </div>
  );
}
