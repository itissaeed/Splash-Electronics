import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const niceNumber = (n) => Number(n || 0).toLocaleString("en-BD");
const percent = (n) => `${Number(n || 0).toFixed(1)}%`;

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

const getOrderTotal = (order) => {
  const itemsTotal = Number(order?.pricing?.itemsTotal || 0);
  const shippingFee = Number(order?.pricing?.shippingFee || 0);
  const legacyCourier = Number(order?.shipment?.courierCharge || 0);
  const effectiveShipping = shippingFee > 0 ? shippingFee : legacyCourier;
  const discountTotal = Number(order?.pricing?.discountTotal || 0);
  return itemsTotal + effectiveShipping - discountTotal;
};

const toCsvCell = (value) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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

function DonutChart({ title, rows, valueKey = "orders", moneyMode = false, onRowClick }) {
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);

  if (!rows.length || total <= 0) {
    return (
      <div id="sales-report-section" className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
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
              <button
                type="button"
                key={`${row._id || "unknown"}-legend-${idx}`}
                onClick={() => onRowClick?.(row)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left ${
                  onRowClick ? "hover:border-cyan-300 hover:bg-cyan-50/70" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="truncate text-xs font-semibold text-slate-700">{row._id || "Unknown"}</p>
                </div>
                <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                  {moneyMode ? money(value) : niceNumber(value)} ({pct}%)
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RankedBars({ title, rows, valueKey, subtitleKey, subtitleLabel, formatValue }) {
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
                    {subtitleLabel || subtitleKey}: {niceNumber(row[subtitleKey])}
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
  const location = useLocation();
  const urlKeyword = useMemo(
    () => new URLSearchParams(location.search).get("keyword") || "",
    [location.search]
  );
  const syncedUrlKeywordRef = useRef(urlKeyword);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [byDivision, setByDivision] = useState([]);
  const [byDivisionProductOrders, setByDivisionProductOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [mostViewedProducts, setMostViewedProducts] = useState([]);
  const [peakOrderHours, setPeakOrderHours] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportPaymentMethod, setReportPaymentMethod] = useState("all");
  const [reportKeyword, setReportKeyword] = useState(urlKeyword);
  const [reportPage, setReportPage] = useState(1);
  const [reportPages, setReportPages] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportRows, setReportRows] = useState([]);
  const [reportSummary, setReportSummary] = useState({
    grossOrderValue: 0,
    recognizedSales: 0,
    cashCollected: 0,
    refundsIssued: 0,
    netRevenue: 0,
    averageRecognizedOrderValue: 0,
    paidOrders: 0,
    paidRevenue: 0,
    statusCounts: {},
  });
  const [reportLoading, setReportLoading] = useState(true);
  const [reportExporting, setReportExporting] = useState(false);

  useEffect(() => {
    const now = new Date();
    const toDate = formatLocalDate(now);
    const fromDate = formatLocalDate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    setFrom(fromDate);
    setTo(toDate);
  }, []);

  useEffect(() => {
    if (syncedUrlKeywordRef.current === urlKeyword) return;
    syncedUrlKeywordRef.current = urlKeyword;
    setReportKeyword(urlKeyword);
    setReportPage(1);
  }, [urlKeyword]);

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
      setMostViewedProducts(data.mostViewedProducts || []);
      setPeakOrderHours(data.peakOrderHours || []);
      setPaymentMethods(data.paymentMethods || []);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to load sales overview.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async (opts = {}) => {
    try {
      setReportLoading(true);
      const params = {
        page: opts.page ?? reportPage,
        limit: 12,
        scope: "finance",
        from: opts.from ?? from,
        to: opts.to ?? to,
      };
      if ((opts.status ?? reportStatus) !== "all") params.status = opts.status ?? reportStatus;
      if ((opts.paymentMethod ?? reportPaymentMethod) !== "all") {
        params.paymentMethod = opts.paymentMethod ?? reportPaymentMethod;
      }
      if (String(opts.keyword ?? reportKeyword).trim()) {
        params.keyword = String(opts.keyword ?? reportKeyword).trim();
      }

      const { data } = await api.get("/admin/orders", {
        headers: tokenHeader(),
        params,
      });

      setReportRows(data.orders || []);
      setReportTotal(Number(data.total || 0));
      setReportPages(Number(data.pages || 1));
      setReportSummary({
        grossOrderValue: Number(data.summary?.grossOrderValue || 0),
        recognizedSales: Number(data.summary?.recognizedSales || data.summary?.totalRevenue || 0),
        cashCollected: Number(data.summary?.cashCollected || 0),
        refundsIssued: Number(data.summary?.refundsIssued || 0),
        netRevenue: Number(data.summary?.netRevenue || 0),
        averageRecognizedOrderValue: Number(
          data.summary?.averageRecognizedOrderValue || data.summary?.averageOrderValue || 0
        ),
        paidOrders: Number(data.summary?.paidOrders || 0),
        paidRevenue: Number(data.summary?.paidRevenue || 0),
        statusCounts: data.summary?.statusCounts || {},
      });
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) fetchAnalytics({ from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    if (from && to) {
      fetchSalesReport({ from, to, page: reportPage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, reportPage, reportStatus, reportPaymentMethod, reportKeyword]);

  const handleRangeSubmit = (e) => {
    e.preventDefault();
    fetchAnalytics({ from, to });
    fetchSalesReport({ from, to, page: 1 });
    setReportPage(1);
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

  const viewedProductRows = useMemo(
    () =>
      mostViewedProducts.slice(0, 7).map((p) => ({
        _id: p.name || "Unknown product",
        name: p.name || "Unknown product",
        views: Number(p.views || 0),
        uniqueViewers: Number(p.uniqueViewers || 0),
      })),
    [mostViewedProducts]
  );

  const peakHourRows = useMemo(
    () =>
      peakOrderHours.slice(0, 6).map((row) => ({
        _id: `${String(row._id).padStart(2, "0")}:00`,
        orders: Number(row.orders || 0),
      })),
    [peakOrderHours]
  );
  const netRevenue = Number(overview?.netRevenue ?? 0);
  const averageOrderValue = Number(
    overview?.averageRecognizedOrderValue ?? overview?.averageOrderValue ?? 0
  );

  const openSalesReport = (extra = {}) => {
    if (Object.keys(extra).length === 0 || Object.prototype.hasOwnProperty.call(extra, "status")) {
      setReportStatus(extra.status || "all");
    }
    if (Object.keys(extra).length === 0 || Object.prototype.hasOwnProperty.call(extra, "paymentMethod")) {
      setReportPaymentMethod(extra.paymentMethod || "all");
    }
    if (Object.keys(extra).length === 0 || Object.prototype.hasOwnProperty.call(extra, "keyword")) {
      setReportKeyword(extra.keyword || "");
    }
    setReportPage(1);
    document.getElementById("sales-report-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportSalesReport = async () => {
    try {
      setReportExporting(true);
      let page = 1;
      let pages = 1;
      const allRows = [];

      do {
        const params = {
          page,
          limit: 500,
          scope: "finance",
          from,
          to,
        };
        if (reportStatus !== "all") params.status = reportStatus;
        if (reportPaymentMethod !== "all") params.paymentMethod = reportPaymentMethod;
        if (reportKeyword.trim()) params.keyword = reportKeyword.trim();

        const { data } = await api.get("/admin/orders", {
          headers: tokenHeader(),
          params,
        });

        allRows.push(...(data.orders || []));
        pages = Number(data.pages || 1);
        page += 1;
      } while (page <= pages);

      const csvRows = [
        [
          "Order No",
          "Created At",
          "Customer",
          "Email",
          "Phone",
          "Division",
          "District",
          "Payment Method",
          "Payment Status",
          "Order Status",
          "Grand Total",
          "Collected At",
          "Collected Amount",
          "Refund Events",
          "Refunded Amount",
          "Latest Refunded At",
          "Net Revenue",
        ],
        ...allRows.map((order) => [
          order.orderNo,
          new Date(order.createdAt).toISOString(),
          order.user?.name || "Guest",
          order.user?.email || "",
          order.shippingAddress?.phone || "",
          order.shippingAddress?.division || "",
          order.shippingAddress?.district || "",
          order.payment?.method || "",
          order.payment?.status || "",
          order.status || "",
          getOrderTotal(order),
          order.finance?.collectedAt ? new Date(order.finance.collectedAt).toISOString() : "",
          Number(order.finance?.collectedAmount || 0),
          Number(order.finance?.refundEvents || 0),
          Number(order.finance?.refundsIssued || 0),
          order.finance?.latestRefundedAt || "",
          Number(order.finance?.netRevenue || 0),
        ]),
      ];

      const csv = csvRows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales-report-${from || "all"}-${to || "latest"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to export sales report.");
    } finally {
      setReportExporting(false);
    }
  };

  const reportCancelled = Number(reportSummary.statusCounts?.cancelled || 0);
  const reportDelivered = Number(reportSummary.statusCounts?.delivered || 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Sales Analytics
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Revenue, conversion, product demand, and payment performance across the selected period
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
	            <button
	              type="button"
	              onClick={() => openSalesReport()}
	              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
	            >
	                Jump to report
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
          value={money(netRevenue)}
          hint="Net revenue after refunds"
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
          value={money(averageOrderValue)}
          hint="Revenue per order"
          accent="bg-sky-400/40"
        />
        <StatCard
          label="Unique Customers"
          value={niceNumber(overview?.uniqueCustomers ?? 0)}
          hint="Purchasing customers only"
          accent="bg-teal-400/40"
        />
        <StatCard
          label="Unique Viewers"
          value={niceNumber(overview?.uniqueViewers ?? 0)}
          hint="Tracked visitors in selected range"
          accent="bg-violet-400/40"
        />
        <StatCard
          label="Conversion Rate"
          value={percent(overview?.conversionRate ?? 0)}
          hint={`${niceNumber(overview?.orderingVisitors ?? 0)} visitors placed orders`}
          accent="bg-amber-400/40"
        />
        <StatCard
          label="Abandoned Carts"
          value={niceNumber(overview?.abandonedCarts ?? 0)}
          hint={`${niceNumber(overview?.abandonedItems ?? 0)} items left inactive for 24h+`}
          accent="bg-rose-400/40"
        />
        <StatCard
          label="Peak Order Time"
          value={overview?.peakOrderTime?.label || "N/A"}
          hint={
            overview?.peakOrderTime
              ? `${niceNumber(overview.peakOrderTime.orders)} orders in busiest hour`
              : "No order activity in this range"
          }
          accent="bg-indigo-400/40"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
	        <div className="xl:col-span-2 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
	          <div className="mb-4 flex items-center justify-between gap-3">
	            <h3 className="text-sm font-bold text-slate-900">Daily Revenue Trend</h3>
	            <div className="flex items-center gap-2">
	              <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
	                {loading ? "Loading..." : `${daily.length} day points`}
	              </span>
	              <button
	                type="button"
		                onClick={() => openSalesReport()}
	                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
	              >
		                Report table
	              </button>
	            </div>
	          </div>
          {loading ? (
            <div className="px-2 py-12 text-sm text-slate-500">Loading sales data...</div>
          ) : (
            <RevenueLineChart points={dailyChartPoints} />
          )}
        </div>

	        <DonutChart
	          title="Orders by Payment Method"
	          rows={paymentMethods}
	          valueKey="orders"
	          onRowClick={(row) => openSalesReport({ paymentMethod: row._id })}
	        />
	      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Gross Sales"
          value={money(overview?.recognizedSales ?? overview?.totalRevenue ?? 0)}
          hint="Collected order value before refunds"
          accent="bg-slate-400/40"
        />
        <StatCard
          label="Cash Collected"
          value={money(overview?.cashCollected ?? 0)}
          hint="Orders with collected payment"
          accent="bg-emerald-400/40"
        />
        <StatCard
          label="Refunds Issued"
          value={money(overview?.refundsIssued ?? 0)}
          hint="Refunded amount in selected range"
          accent="bg-amber-400/40"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DonutChart title="Gross Sales by Division" rows={byDivision} valueKey="revenue" moneyMode />
        <DonutChart title="Product Orders by Division" rows={byDivisionProductOrders} valueKey="qty" />
        <RankedBars
          title="Top Products by Revenue"
          rows={topProductsRows}
          valueKey="revenue"
          subtitleKey="qty"
          subtitleLabel="qty"
          formatValue={money}
        />
        <RankedBars
          title="Most Viewed Products"
          rows={viewedProductRows}
          valueKey="views"
          subtitleKey="uniqueViewers"
          subtitleLabel="unique viewers"
          formatValue={niceNumber}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
	        <DonutChart
	          title="Cash Collected by Payment Method"
	          rows={paymentMethods}
	          valueKey="cashCollected"
	          moneyMode
	          onRowClick={(row) => openSalesReport({ paymentMethod: row._id })}
	        />
	        <RankedBars
	          title="Peak Order Hours"
	          rows={peakHourRows}
	          valueKey="orders"
	          formatValue={niceNumber}
	        />
	      </div>

      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">Sales Report</h3>
            <p className="text-sm text-slate-500">
              Read-only sales history for reporting, reconciliation, and export
            </p>
          </div>
          <button
            type="button"
            onClick={exportSalesReport}
            disabled={reportExporting || reportLoading}
            className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${
              reportExporting || reportLoading ? "bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {reportExporting ? "Exporting CSV..." : "Export Report CSV"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gross Order Value" value={money(reportSummary.grossOrderValue)} hint="All matching orders" accent="bg-slate-400/40" />
          <StatCard label="Gross Sales" value={money(reportSummary.recognizedSales)} hint="Collected order value in filters" accent="bg-cyan-400/40" />
          <StatCard label="Cash Collected" value={money(reportSummary.cashCollected)} hint="Matching paid orders" accent="bg-sky-400/40" />
          <StatCard label="Refunds on Orders" value={money(reportSummary.refundsIssued)} hint="Refunded rows linked to matching orders" accent="bg-rose-400/40" />
          <StatCard label="Net Revenue" value={money(reportSummary.netRevenue)} hint="Cash collected minus refunds" accent="bg-emerald-400/40" />
          <StatCard label="Avg Paid Order" value={money(reportSummary.averageRecognizedOrderValue)} hint="Average collected order value" accent="bg-indigo-400/40" />
          <StatCard label="Delivered" value={niceNumber(reportDelivered)} hint="Completed sales records" accent="bg-teal-400/40" />
          <StatCard label="Cancelled" value={niceNumber(reportCancelled)} hint="Cancelled orders included here" accent="bg-amber-400/40" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Status
            <select
              value={reportStatus}
              onChange={(e) => {
                setReportPage(1);
                setReportStatus(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Payment
            <select
              value={reportPaymentMethod}
              onChange={(e) => {
                setReportPage(1);
                setReportPaymentMethod(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            >
              <option value="all">All Methods</option>
              <option value="COD">COD</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank</option>
              <option value="SSLCOMMERZ">SSLCommerz</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 xl:col-span-3">
            Search
            <input
              value={reportKeyword}
              onChange={(e) => {
                setReportPage(1);
                setReportKeyword(e.target.value);
              }}
              placeholder="Order no, phone, district, division"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Region</th>
                <th className="px-4 py-3 text-left font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {reportLoading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>Loading sales report...</td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>No sales found for these filters.</td>
                </tr>
              ) : (
                reportRows.map((order) => (
                  <tr key={order._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{order.orderNo}</div>
                      <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{order.user?.name || "Guest"}</div>
                      <div className="text-xs text-slate-500">{order.user?.email || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold uppercase text-slate-900">{order.payment?.method || "-"}</div>
                      <div className="text-xs text-slate-500">{order.payment?.status || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.shippingAddress?.division || "-"}
                      <div className="text-xs text-slate-500">{order.shippingAddress?.district || ""}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{money(getOrderTotal(order))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>
            Page <span className="font-bold">{reportPage}</span> of <span className="font-bold">{reportPages}</span>
            {" "}with <span className="font-bold">{reportTotal}</span> matching sales
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={reportPage <= 1}
              onClick={() => setReportPage((p) => p - 1)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                reportPage <= 1 ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={reportPage >= reportPages}
              onClick={() => setReportPage((p) => p + 1)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                reportPage >= reportPages ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
