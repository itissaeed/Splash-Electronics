import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const niceNumber = (n) => Number(n || 0).toLocaleString("en-BD");

const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#0ea5e9",
  shipped: "#6366f1",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  returned: "#f97316",
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

function DivisionRevenueDonut({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  if (!rows.length || total <= 0) {
    return <p className="text-sm text-slate-500">No regional data yet.</p>;
  }

  const palette = ["#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#0ea5e9"];
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4 items-center">
      <div className="mx-auto">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
          {rows.map((row, idx) => {
            const ratio = Number(row.revenue || 0) / total;
            const dash = ratio * circumference;
            const segment = (
              <circle
                key={`${row._id || "unknown"}-${idx}`}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={palette[idx % palette.length]}
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
          const pct = ((Number(row.revenue || 0) / total) * 100).toFixed(1);
          return (
            <div
              key={`${row._id || "unknown"}-legend-${idx}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[idx % palette.length] }} />
                <p className="truncate text-xs font-semibold text-slate-700">{row._id || "Unknown"}</p>
              </div>
              <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                {money(row.revenue)} ({pct}%)
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusComposition({ statusCounts }) {
  const entries = Object.entries(statusCounts || {}).map(([status, count]) => ({
    status,
    count: Number(count || 0),
  }));
  const total = entries.reduce((sum, row) => sum + row.count, 0);

  if (!entries.length || total === 0) {
    return <p className="text-sm text-slate-500">No order status data yet.</p>;
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4 items-center">
      <div className="mx-auto">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
          {entries.map((row) => {
            const ratio = row.count / total;
            const dash = ratio * circumference;
            const color = STATUS_COLORS[row.status] || "#64748b";
            const segment = (
              <circle
                key={row.status}
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
        {entries.map((row) => {
          const pct = ((row.count / total) * 100).toFixed(1);
          const color = STATUS_COLORS[row.status] || "#64748b";
          return (
            <div
              key={row.status}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <p className="text-xs font-semibold capitalize text-slate-700">{row.status}</p>
              </div>
              <p className="text-xs font-semibold text-slate-900">
                {niceNumber(row.count)} ({pct}%)
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErrMsg("");
      const res = await api.get("/admin/overview", { headers: tokenHeader() });
      setData(res.data);
    } catch (e) {
      console.error(e);
      setErrMsg("Failed to load overview. Make sure /api/admin/overview exists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-600">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="text-sm text-slate-600">No dashboard data.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-emerald-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Executive Overview
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Real-time business health snapshot for Splash Electronics
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Refresh Overview
          </button>
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
          value={money(data.totalRevenue)}
          hint="Overall lifetime revenue"
          accent="bg-cyan-400/40"
        />
        <StatCard
          label="Total Orders"
          value={niceNumber(data.totalOrders)}
          hint="All order records"
          accent="bg-emerald-400/40"
        />
        <StatCard
          label="Total Customers"
          value={niceNumber(data.totalCustomers)}
          hint="Registered customers"
          accent="bg-sky-400/40"
        />
        <StatCard
          label="Pending Orders"
          value={niceNumber(data.statusCounts?.pending || 0)}
          hint="Requires fulfillment action"
          accent="bg-teal-400/40"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h3 className="text-sm font-bold text-slate-900">Top Best Sellers</h3>
          {!data.bestSellers?.length ? (
            <p className="mt-6 text-sm text-slate-500">No sales yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.bestSellers.slice(0, 6).map((p, idx) => (
                <div
                  key={p._id || `${p.nameSnapshot || "product"}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={p.imageSnapshot || "https://via.placeholder.com/48"}
                      alt={p.nameSnapshot}
                      className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.nameSnapshot}
                      </p>
                      <p className="text-xs text-slate-500">Sold: {niceNumber(p.qtySold)}</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                    {money(p.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h3 className="text-sm font-bold text-slate-900">Order Status Composition</h3>
          <div className="mt-4">
            <StatusComposition statusCounts={data.statusCounts} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-sm font-bold text-slate-900">Revenue by Division</h3>
        <div className="mt-4">
          <DivisionRevenueDonut rows={data.salesByDivision || []} />
        </div>
      </div>
    </div>
  );
}
