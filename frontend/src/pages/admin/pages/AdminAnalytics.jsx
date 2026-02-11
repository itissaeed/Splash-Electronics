import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-xl font-extrabold text-gray-900 break-all">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
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
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // init default range: last 30 days
  useEffect(() => {
    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
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
      setTopProducts(data.topProducts || []);
      setPaymentMethods(data.paymentMethods || []);
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to load analytics overview. Check /api/admin/analytics/overview."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) {
      fetchAnalytics({ from, to });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const handleRangeSubmit = (e) => {
    e.preventDefault();
    fetchAnalytics({ from, to });
  };

  const totalDailyRevenue = daily.reduce(
    (sum, d) => sum + (d.revenue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Analytics
          </h1>
          <p className="text-sm text-gray-500">
            Revenue, orders and customer behavior for Splash Electronics
          </p>
        </div>

        <form
          onSubmit={handleRangeSubmit}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Apply
          </button>
        </form>
      </div>

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total revenue"
          value={money(overview?.totalRevenue ?? 0)}
          subtitle="Excludes cancelled & returned"
        />
        <MetricCard
          label="Total orders"
          value={overview?.totalOrders ?? 0}
        />
        <MetricCard
          label="Average order value"
          value={money(overview?.averageOrderValue ?? 0)}
        />
        <MetricCard
          label="Unique customers"
          value={overview?.uniqueCustomers ?? 0}
        />
      </div>

      {/* Layout: Daily + Payment + Regions + Top products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily trend */}
        <div className="xl:col-span-2 bg-white border rounded-3xl shadow-sm">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-extrabold text-gray-900">
              Daily revenue
            </div>
            <div className="text-xs text-gray-500">
              Total: {money(totalDailyRevenue)}
            </div>
          </div>

          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-gray-500">
                Loading analytics…
              </div>
            ) : daily.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">
                No orders in this range.
              </div>
            ) : (
              <ul className="divide-y text-sm">
                {daily.map((d) => {
                  const revenue = d.revenue || 0;
                  const orders = d.orders || 0;
                  // Simple "bar" based on revenue
                  const max = totalDailyRevenue || revenue || 1;
                  const width = Math.max(
                    5,
                    Math.round((revenue / max) * 100)
                  );
                  return (
                    <li
                      key={d._id}
                      className="px-4 py-3 flex items-center gap-3"
                    >
                      <div className="w-24 text-xs text-gray-500">
                        {d._id}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-indigo-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-32 text-right text-xs text-gray-600">
                        {orders} order{orders !== 1 ? "s" : ""}
                      </div>
                      <div className="w-32 text-right text-sm font-semibold text-gray-900">
                        {money(revenue)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-extrabold text-gray-900">
            Payment methods
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              Loading…
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No data for this range.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Method</th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Orders
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Revenue
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods.map((m) => (
                  <tr key={m._id} className="border-t">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                      {m._id || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">
                      {m.orders}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                      {money(m.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">
                      {m.paidCount} paid
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Regions + Top products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Regions */}
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-extrabold text-gray-900">
            Revenue by division
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              Loading…
            </div>
          ) : byDivision.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No regional data for this range.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Division
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Orders
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {byDivision.map((r) => (
                  <tr key={r._id || "unknown"} className="border-t">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                      {r._id || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">
                      {r.orders}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                      {money(r.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-extrabold text-gray-900">
            Top products (by revenue)
          </div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              Loading…
            </div>
          ) : topProducts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No products sold in this range.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Product
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Qty
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr
                    key={`${p._id?.product || ""}-${p._id?.name || ""}`}
                    className="border-t"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 line-clamp-2">
                        {p._id?.name || "Unknown product"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">
                      {p.qty}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                      {money(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
