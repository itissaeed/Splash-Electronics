import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";
import { Activity, Eye, Package, ShieldAlert, Sparkles, TrendingUp, Users } from "lucide-react";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) =>
  `BDT ${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const nice = (n) => Number(n || 0).toLocaleString("en-BD");
const pct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;
const wholePct = (n) => `${Math.round(Number(n || 0))}%`;
const PALETTE = ["#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#0ea5e9"];

function StatCard({ label, value, subtitle, accent, icon: Icon, eyebrow }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            {eyebrow ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p> : null}
          </div>
          {Icon ? (
            <span className="rounded-2xl border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm">
              <Icon size={16} strokeWidth={2.2} />
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        {subtitle ? <p className="mt-2 text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function confidenceTone(score) {
  if (score >= 75) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-200 text-slate-700";
}

function riskTone(risk) {
  if (risk === "stockout") return "bg-red-100 text-red-700";
  if (risk === "at_risk") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function riskLabel(risk) {
  if (risk === "stockout") return "Stockout";
  if (risk === "at_risk") return "At Risk";
  return "Stable";
}

function trendMeta(factor) {
  const delta = ((Number(factor || 1) - 1) * 100).toFixed(0);
  if (factor >= 1.12) return { label: `Rising +${delta}%`, tone: "text-emerald-700 bg-emerald-50" };
  if (factor <= 0.92) return { label: `Cooling ${delta}%`, tone: "text-amber-700 bg-amber-50" };
  return { label: "Stable", tone: "text-slate-700 bg-slate-100" };
}

function ForecastMethodology({ model }) {
  return (
    <SectionCard
      title="How Forecast Works"
      subtitle="Built to be explainable during a viva or project demo"
      right={
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
          {model?.version || "traffic-weighted-v2"}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">1. Baseline Demand</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Average daily sold x future days</p>
          <p className="mt-1 text-xs text-slate-600">Anchors the forecast in real completed order history.</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">2. Traffic Intent</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Page views + visitors + conversion</p>
          <p className="mt-1 text-xs text-slate-600">Products with strong user hits get extra demand weight.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">3. Momentum</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Recent vs previous {model?.momentumWindowDays || 14} days</p>
          <p className="mt-1 text-xs text-slate-600">Checks whether traffic and demand are rising or cooling.</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">4. Inventory Action</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">Forecast + {model?.safetyStockDays || 7} day buffer</p>
          <p className="mt-1 text-xs text-slate-600">Converts prediction into reorder quantity and risk level.</p>
        </div>
      </div>
    </SectionCard>
  );
}

function SignalOverview({ summary, topProduct }) {
  return (
    <SectionCard
      title="Traffic Signal Overview"
      subtitle="Forecast quality improves when behavioral data and order data move together"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User Hit Metrics</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] font-semibold text-slate-500">Page Views</p>
              <p className="mt-1 text-xl font-black text-slate-900">{nice(summary?.totalPageViews || 0)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] font-semibold text-slate-500">Unique Viewers</p>
              <p className="mt-1 text-xl font-black text-slate-900">{nice(summary?.totalUniqueViewers || 0)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] font-semibold text-slate-500">Avg Conversion</p>
              <p className="mt-1 text-xl font-black text-slate-900">{pct(summary?.avgConversionRate || 0)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] font-semibold text-slate-500">Avg Confidence</p>
              <p className="mt-1 text-xl font-black text-slate-900">{wholePct(summary?.avgConfidenceScore || 0)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Executive Read</p>
          <p className="mt-3 text-lg font-black">
            {topProduct ? `${topProduct.name} leads the next demand cycle` : "No strong signal leader yet"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Trending SKUs</p>
              <p className="mt-1 font-bold">{nice(summary?.trendingUpCount || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">High Intent SKUs</p>
              <p className="mt-1 font-bold">{nice(summary?.highIntentSkuCount || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Risky SKUs</p>
              <p className="mt-1 font-bold">{nice(summary?.projectedStockoutCount || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Suggested Reorder</p>
              <p className="mt-1 font-bold">{nice(Math.round(summary?.totalSuggestedReorderQty || 0))}</p>
            </div>
          </div>
          {topProduct ? (
            <p className="mt-4 text-xs text-slate-300">
              Lead product has {nice(topProduct.pageViews || 0)} views, {pct(topProduct.effectiveConversionRate || 0)} conversion,
              and confidence {topProduct.confidenceScore || 0}%.
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function FeaturedSignal({ topProduct, summary, horizonDays }) {
  if (!topProduct) return null;

  const trend = trendMeta(topProduct.momentumFactor);
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.22),_transparent_30%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-100">Priority Signal</span>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-semibold text-emerald-200">{trend.label}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-200">Next {horizonDays}d outlook</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.95fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Lead Product</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{topProduct.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              This item is leading because traffic, purchase intent, and forecasted revenue are aligning better than the rest of the catalog.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Revenue</p>
                <p className="mt-1 text-base font-bold">{money(topProduct.forecastRevenue)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Views</p>
                <p className="mt-1 text-base font-bold">{nice(topProduct.pageViews || 0)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Conversion</p>
                <p className="mt-1 text-base font-bold">{pct(topProduct.effectiveConversionRate || 0)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-slate-400">Confidence</p>
                <p className="mt-1 text-base font-bold">{wholePct(topProduct.confidenceScore || 0)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Decision Snapshot</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Traffic weight</span>
                <span className="font-semibold text-white">{Math.round((topProduct.trafficWeight || 0) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Order weight</span>
                <span className="font-semibold text-white">{Math.round((topProduct.orderWeight || 0) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Risk SKUs</span>
                <span className="font-semibold text-white">{nice(summary?.projectedStockoutCount || 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Suggested reorder</span>
                <span className="font-semibold text-white">{nice(Math.round(summary?.totalSuggestedReorderQty || 0))}</span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white/5 p-3 text-xs text-slate-300">
              Teacher-friendly explanation: this product is not only selling, it is also attracting enough traffic and sustained intent to justify a stronger forward forecast.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForecastMomentum({ rows, horizonDays }) {
  if (!rows.length) {
    return (
      <SectionCard title="Demand Momentum" subtitle="Traffic and order movement across the strongest products">
        <p className="text-sm text-slate-500">No product forecast data in this range.</p>
      </SectionCard>
    );
  }

  const maxScore = Math.max(...rows.map((row) => Number(row.demandScore || 0)), 1);
  const points = rows.map((row, idx) => {
    const xPos = rows.length > 1 ? (idx / (rows.length - 1)) * 100 : 50;
    const yPos = 100 - (Number(row.demandScore || 0) / maxScore) * 100;
    return `${xPos},${yPos}`;
  });
  const polyline = points.join(" ");
  const area = `M 0 100 L ${polyline} L 100 100 Z`;

  return (
    <SectionCard
      title="Demand Momentum"
      subtitle="Composite score blends demand, traffic intent, and conversion strength"
      right={
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
          Next {horizonDays} days
        </span>
      }
    >
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
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.slice(0, 3).map((row) => {
          const trend = trendMeta(row.momentumFactor);
          return (
            <div key={row.productId} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{row.name}</p>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${confidenceTone(row.confidenceScore)}`}>
                  {row.confidenceLabel}
                </span>
              </div>
              <p className="mt-2 text-xl font-black text-slate-900">{money(row.forecastRevenue)}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className={`rounded-full px-2 py-1 font-semibold ${trend.tone}`}>{trend.label}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                  Views {nice(row.pageViews || 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function DonutShare({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.forecastRevenue || 0), 0);
  if (!rows.length || total <= 0) {
    return (
      <SectionCard title="Category Revenue Share" subtitle="Which categories dominate projected demand">
        <p className="text-sm text-slate-500">No category forecast data.</p>
      </SectionCard>
    );
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <SectionCard title="Category Revenue Share" subtitle="Forecasted revenue contribution by category">
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[150px_1fr]">
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
          {rows.map((row, idx) => (
            <div
              key={`${row.categoryId || row.categoryName || "cat"}-${idx}`}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <p className="truncate text-xs font-semibold text-slate-700">{row.categoryName || "Unknown"}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900">{money(row.forecastRevenue)}</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Qty {nice(Math.round(row.forecastQty || 0))} | Views {nice(row.pageViews || 0)} | Conv {pct(row.conversionRate || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function RankedProductBars({ rows }) {
  const max = Math.max(...rows.map((r) => Number(r.forecastRevenue || 0)), 1);
  return (
    <SectionCard title="Top Forecasted Products" subtitle="Strongest upcoming products after blending traffic and order intent">
      {!rows.length ? (
        <p className="text-sm text-slate-500">No order history in this period.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => {
            const width = Math.max(7, Math.round((Number(row.forecastRevenue || 0) / max) * 100));
            const trend = trendMeta(row.momentumFactor);
            return (
              <div key={row.productId || `p-${idx}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
                  <p className="whitespace-nowrap text-sm font-bold text-slate-900">{money(row.forecastRevenue)}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500" style={{ width: `${width}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className={`rounded-full px-2 py-1 font-semibold ${trend.tone}`}>{trend.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    Forecast {nice(Math.round(row.forecastQty || 0))} units
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    Views {nice(row.pageViews || 0)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    Conv {pct(row.effectiveConversionRate || 0)}
                  </span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${confidenceTone(row.confidenceScore)}`}>
                    Confidence {row.confidenceScore || 0}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function DemandIntelligenceTable({ rows }) {
  return (
    <SectionCard
      title="Demand Intelligence Table"
      subtitle="Every forecast row is tied to measurable sales and visitor signals"
    >
      {!rows.length ? (
        <p className="text-sm text-slate-500">No forecast rows available.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((row, idx) => {
              const trend = trendMeta(row.momentumFactor);
              return (
                <div key={row.productId || `intelligence-card-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{row.category || "Uncategorized"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${confidenceTone(row.confidenceScore)}`}>
                      {row.confidenceScore || 0}%
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">Views</p>
                      <p className="mt-1 font-semibold text-slate-900">{nice(row.pageViews || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">Conversion</p>
                      <p className="mt-1 font-semibold text-slate-900">{pct(row.effectiveConversionRate || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">Forecast Qty</p>
                      <p className="mt-1 font-semibold text-slate-900">{nice(Math.round(row.forecastQty || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">Revenue</p>
                      <p className="mt-1 font-semibold text-slate-900">{money(row.forecastRevenue || 0)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-1 font-semibold ${trend.tone}`}>{trend.label}</span>
                    <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                      O {Math.round((row.orderWeight || 0) * 100)} / T {Math.round((row.trafficWeight || 0) * 100)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Product</th>
                <th className="px-3 py-2 text-right font-semibold">Page Views</th>
                <th className="px-3 py-2 text-right font-semibold">Unique Users</th>
                <th className="px-3 py-2 text-right font-semibold">Conversion</th>
                <th className="px-3 py-2 text-right font-semibold">Trend</th>
                <th className="px-3 py-2 text-right font-semibold">Signal Mix</th>
                <th className="px-3 py-2 text-right font-semibold">Confidence</th>
                <th className="px-3 py-2 text-right font-semibold">Forecast Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const trend = trendMeta(row.momentumFactor);
                return (
                  <tr key={row.productId || `intelligence-${idx}`} className="border-t border-slate-100 even:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900 line-clamp-1">{row.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {row.category || "Uncategorized"} | Buyers {nice(row.buyerCount || 0)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">{nice(row.pageViews || 0)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{nice(row.uniqueViewers || 0)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{pct(row.effectiveConversionRate || 0)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${trend.tone}`}>{trend.label}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      O {Math.round((row.orderWeight || 0) * 100)} / T {Math.round((row.trafficWeight || 0) * 100)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${confidenceTone(row.confidenceScore)}`}>
                        {row.confidenceScore || 0}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{nice(Math.round(row.forecastQty || 0))}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{money(row.forecastRevenue || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function StockRiskTable({ rows, horizonDays }) {
  return (
    <SectionCard
      title="Stockout Risk And Reorder Plan"
      subtitle="Forecast is converted into action using projected end stock plus safety stock"
      right={
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
          Horizon {horizonDays}d
        </span>
      }
    >
      {!rows.length ? (
        <p className="text-sm text-slate-500">No risk detected in current forecast set.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Product</th>
                <th className="px-3 py-2 text-right font-semibold">Stock</th>
                <th className="px-3 py-2 text-right font-semibold">Forecast Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Days Cover</th>
                <th className="px-3 py-2 text-right font-semibold">Projected End</th>
                <th className="px-3 py-2 text-right font-semibold">Reorder</th>
                <th className="px-3 py-2 text-right font-semibold">Traffic</th>
                <th className="px-3 py-2 text-right font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.productId || `risk-${idx}`} className="border-t border-slate-100 even:bg-slate-50/50">
                  <td className="px-3 py-3">
                    <p className="line-clamp-1 font-semibold text-slate-900">{row.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {row.category || "Uncategorized"} | Confidence {row.confidenceScore || 0}%
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">{nice(Math.round(row.currentStock || 0))}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{nice(Math.round(row.forecastQty || 0))}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{row.daysOfCover == null ? "-" : Number(row.daysOfCover).toFixed(1)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{nice(Math.round(row.projectedStockAtHorizon || 0))}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">{nice(Math.round(row.suggestedReorderQty || 0))}</td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {nice(row.pageViews || 0)} / {pct(row.effectiveConversionRate || 0)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${riskTone(row.riskLevel)}`}>
                      {riskLabel(row.riskLevel)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-500">Suggested reorder includes forecast demand plus 7-day safety stock.</p>
    </SectionCard>
  );
}

export default function AdminForecasting() {
  const [daysBack, setDaysBack] = useState(90);
  const [horizonDays, setHorizonDays] = useState(30);
  const [productForecasts, setProductForecasts] = useState([]);
  const [categoryForecasts, setCategoryForecasts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setLoading(true);
        setErrMsg("");

        const { data } = await api.get("/admin/analytics/forecasting", {
          headers: tokenHeader(),
          params: { daysBack, horizonDays },
        });

        setProductForecasts(data.productForecasts || []);
        setCategoryForecasts(data.categoryForecasts || []);
        setSummary(data.summary || null);
        setRange(data.range || null);
        setModel(data.model || null);
      } catch (e) {
        console.error(e);
        setErrMsg(e?.response?.data?.message || "Failed to load demand forecast.");
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [daysBack, horizonDays]);

  const roundedSummary = summary
    ? {
        ...summary,
        totalForecastQty: Math.round(summary.totalForecastQty || 0),
        totalForecastRevenue: Math.round(summary.totalForecastRevenue || 0),
        totalSuggestedReorderQty: Math.round(summary.totalSuggestedReorderQty || 0),
        avgConfidenceScore: Math.round(summary.avgConfidenceScore || 0),
      }
    : null;

  const topProducts = useMemo(() => productForecasts.slice(0, 8), [productForecasts]);
  const topCategories = useMemo(() => categoryForecasts.slice(0, 6), [categoryForecasts]);
  const topLeader = topProducts[0] || null;
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
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_30%),linear-gradient(135deg,_#ecfeff,_#f8fafc_48%,_#ecfdf5)] p-5 sm:p-6">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-700">Forecasting Command Center</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Traffic-Aware Demand Forecast</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
              This forecast combines sales history, page views, user hits, visitor conversion, momentum, and stock coverage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-300 bg-white/90 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">History</span>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
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
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value={7}>7d</option>
              <option value={14}>14d</option>
              <option value={30}>30d</option>
              <option value={60}>60d</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">Orders + Traffic + Conversion</span>
          <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700">Real user hit signals</span>
          <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700">Inventory-ready reorder plan</span>
        </div>
      </div>

      {errMsg ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errMsg}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Forecast Revenue" value={money(roundedSummary?.totalForecastRevenue || 0)} subtitle={`Estimated next ${horizonDays} days`} accent="bg-cyan-400/40" icon={TrendingUp} eyebrow="Primary KPI" />
        <StatCard label="Forecast Units" value={nice(roundedSummary?.totalForecastQty || 0)} subtitle="Blended order and traffic demand" accent="bg-emerald-400/40" icon={Package} eyebrow="Demand Volume" />
        <StatCard label="Page Views" value={nice(roundedSummary?.totalPageViews || 0)} subtitle="Traffic feeding the forecast" accent="bg-sky-400/40" icon={Eye} eyebrow="Intent Signal" />
        <StatCard label="Unique Viewers" value={nice(roundedSummary?.totalUniqueViewers || 0)} subtitle={`History window: last ${daysBack} days`} accent="bg-indigo-400/40" icon={Users} eyebrow="Reach" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg Conversion" value={pct(roundedSummary?.avgConversionRate || 0)} subtitle="Estimated visitor-to-order strength" accent="bg-amber-400/40" icon={Activity} eyebrow="Efficiency" />
        <StatCard label="Trending SKUs" value={nice(roundedSummary?.trendingUpCount || 0)} subtitle="Rising traffic or order momentum" accent="bg-teal-400/40" icon={Sparkles} eyebrow="Watchlist" />
        <StatCard label="Projected Risk SKUs" value={nice(roundedSummary?.projectedStockoutCount || 0)} subtitle="Could run short within horizon" accent="bg-red-400/40" icon={ShieldAlert} eyebrow="Risk" />
        <StatCard label="Confidence" value={wholePct(roundedSummary?.avgConfidenceScore || 0)} subtitle="Average model confidence" accent="bg-violet-400/40" icon={TrendingUp} eyebrow="Model Trust" />
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
          <FeaturedSignal topProduct={topLeader} summary={roundedSummary} horizonDays={horizonDays} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ForecastMethodology model={model} />
            <SignalOverview summary={roundedSummary} topProduct={topLeader} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ForecastMomentum rows={topProducts} horizonDays={horizonDays} />
            </div>
            <DonutShare rows={topCategories} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RankedProductBars rows={topProducts} />
            </div>
            <SectionCard title="Category Outlook" subtitle="High-level category performance and confidence">
              {!topCategories.length ? (
                <p className="text-sm text-slate-500">No category forecast data.</p>
              ) : (
                <div className="space-y-2">
                  {topCategories.map((row, idx) => (
                    <div key={row.categoryId || `${row.categoryName || "unknown"}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{row.categoryName || "Unknown"}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${confidenceTone(row.avgConfidenceScore)}`}>
                          {row.avgConfidenceScore || 0}% confidence
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p>Revenue</p>
                          <p className="mt-1 font-semibold text-slate-900">{money(row.forecastRevenue || 0)}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p>Views</p>
                          <p className="mt-1 font-semibold text-slate-900">{nice(row.pageViews || 0)}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p>Units</p>
                          <p className="mt-1 font-semibold text-slate-900">{nice(Math.round(row.forecastQty || 0))}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <p>Conversion</p>
                          <p className="mt-1 font-semibold text-slate-900">{pct(row.conversionRate || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <DemandIntelligenceTable rows={topProducts} />
          <StockRiskTable rows={riskyProducts} horizonDays={horizonDays} />
        </>
      )}
    </div>
  );
}
