import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const niceNumber = (n) => Number(n || 0).toLocaleString("en-BD");

const PALETTE = [
  "#0ea5e9",
  "#06b6d4",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#ef4444",
];

const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`}
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

function RevenueLineChart({ points }) {
  if (!points.length) {
    return <div className="px-4 py-12 text-sm text-slate-500">No daily data in this range.</div>;
  }

  const maxY = Math.max(...points.map((p) => p.revenue), 1);
  const stepX = points.length > 1 ? 100 / (points.length - 1) : 100;

  const polyline = points
    .map((p, idx) => {
      const x = idx * stepX;
      const y = 100 - (p.revenue / maxY) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath = `M 0 100 L ${polyline} L 100 100 Z`;

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 100 100" className="h-56 w-full rounded-2xl bg-slate-950/[0.03]">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lineFill)" />
        <polyline
          fill="none"
          stroke="#0284c7"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
        {points.slice(Math.max(points.length - 4, 0)).map((p) => (
          <div key={p.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="font-semibold">{p.label}</p>
            <p className="text-slate-800">{money(p.revenue)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ title, rows, valueKey = "orders", moneyMode = false }) {
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);

  if (!rows.length || total <= 0) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-6 text-sm text-slate-500">No data for this range.</p>
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offsetCursor = 0;

  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center">
        <div className="mx-auto">
          <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
            {rows.map((row, idx) => {
              const value = Number(row[valueKey] || 0);
              const ratio = value / total;
              const dash = ratio * circumference;
              const color = PALETTE[idx % PALETTE.length];
              const segment = (
                <circle
                  key={`${row._id || "unknown"}-${idx}`}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offsetCursor}
                  strokeLinecap="butt"
                />
              );
              offsetCursor += dash;
              return segment;
            })}
          </svg>
        </div>

        <div className="space-y-2">
          {rows.map((row, idx) => {
            const value = Number(row[valueKey] || 0);
            const pct = ((value / total) * 100).toFixed(1);
            const color = PALETTE[idx % PALETTE.length];
            return (
              <div
                key={`${row._id || "unknown"}-legend-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="truncate text-xs font-semibold text-slate-700">{row._id || "Unknown"}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                  {moneyMode ? money(value) : niceNumber(value)} ({pct}%)
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RankedBars({ title, rows, valueKey, subtitleKey, formatValue }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 1);
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {!rows.length ? (
        <p className="mt-6 text-sm text-slate-500">No data for this range.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row, idx) => {
            const value = Number(row[valueKey] || 0);
            const width = Math.max(7, Math.round((value / max) * 100));
            return (
              <div key={`${row._id || row.name || "row"}-${idx}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold text-slate-700">{row._id || row.name || "Unknown"}</p>
                  <p className="text-xs font-semibold text-slate-900">{formatValue(value)}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                {subtitleKey && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {subtitleKey}: {niceNumber(row[subtitleKey])}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [byDivision, setByDivision] = useState([]);
  const [byDivisionProductOrders, setByDivisionProductOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const now = new Date();
    const toDate = formatLocalDate(now);
    const fromDate = formatLocalDate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    setFrom(fromDate);
    setTo(toDate);
  }, []);

  const fetchAnalytics = async (opts = {}) => {
    try {
      setLoading(true);
      setErrMsg("");

      const params = {
        from: opts.from ?? from,
        to: opts.to ?? to,
      };

      const { data } = await api.get("/admin/analytics/overview", {
        headers: tokenHeader(),
        params,
      });

      setOverview(data.overview || null);
      setDaily(data.daily || []);
      setByDivision(data.byDivision || []);
      setByDivisionProductOrders(data.byDivisionProductOrders || []);
      setTopProducts(data.topProducts || []);
      setPaymentMethods(data.paymentMethods || []);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to load analytics overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) fetchAnalytics({ from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const handleRangeSubmit = (e) => {
    e.preventDefault();
    fetchAnalytics({ from, to });
  };

  const dailyChartPoints = useMemo(
    () =>
      daily.map((d) => ({
        label: d._id,
        revenue: Number(d.revenue || 0),
        orders: Number(d.orders || 0),
      })),
    [daily]
  );

  const topProductsRows = useMemo(
    () =>
      topProducts.slice(0, 7).map((p) => ({
        _id: p._id?.name || "Unknown product",
        name: p._id?.name || "Unknown product",
        revenue: Number(p.revenue || 0),
        qty: Number(p.qty || 0),
      })),
    [topProducts]
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Performance Command Center
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Premium visual analytics for revenue, order flow and customer behavior
            </p>
          </div>

          <form onSubmit={handleRangeSubmit} className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-slate-600">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </form>
        </div>
      </div>

      {errMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={money(overview?.totalRevenue ?? 0)}
          hint="Excludes cancelled and returned"
          accent="bg-cyan-400/40"
        />
        <StatCard
          label="Total Orders"
          value={niceNumber(overview?.totalOrders ?? 0)}
          hint="Across selected date range"
          accent="bg-emerald-400/40"
        />
        <StatCard
          label="Avg Order Value"
          value={money(overview?.averageOrderValue ?? 0)}
          hint="Revenue per order"
          accent="bg-sky-400/40"
        />
        <StatCard
          label="Unique Customers"
          value={niceNumber(overview?.uniqueCustomers ?? 0)}
          hint="Purchasing customers only"
          accent="bg-teal-400/40"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">Daily Revenue Trend</h3>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
              {loading ? "Loading..." : `${daily.length} day points`}
            </span>
          </div>
          {loading ? (
            <div className="px-2 py-12 text-sm text-slate-500">Loading analytics...</div>
          ) : (
            <RevenueLineChart points={dailyChartPoints} />
          )}
        </div>

        <DonutChart title="Orders by Payment Method" rows={paymentMethods} valueKey="orders" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DonutChart title="Revenue by Division" rows={byDivision} valueKey="revenue" moneyMode />
        <DonutChart title="Product Orders by Division" rows={byDivisionProductOrders} valueKey="qty" />
        <RankedBars
          title="Top Products by Revenue"
          rows={topProductsRows}
          valueKey="revenue"
          subtitleKey="qty"
          formatValue={money}
        />
      </div>

      <DonutChart title="Revenue Share by Payment Method" rows={paymentMethods} valueKey="revenue" moneyMode />
    </div>
  );
}
