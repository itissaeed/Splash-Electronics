import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `৳${Number(n || 0).toFixed(0).toLocaleString("en-BD") || 0}`;

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
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to load demand forecast. Check /api/admin/analytics/forecasting."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // refetch when user changes sliders
    fetchForecast({ daysBack, horizonDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysBack, horizonDays]);

  const topCategory = useMemo(() => {
    if (!categoryForecasts.length) return null;
    return [...categoryForecasts].sort(
      (a, b) => (b.forecastRevenue || 0) - (a.forecastRevenue || 0)
    )[0];
  }, [categoryForecasts]);

  const roundedSummary = summary
    ? {
        ...summary,
        totalForecastQty: Math.round(summary.totalForecastQty || 0),
        totalForecastRevenue: Math.round(summary.totalForecastRevenue || 0),
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Forecasting
          </h1>
          <p className="text-sm text-gray-500">
            Simple demand forecast based on recent order history
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-gray-500">
            Training window (history)
          </div>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-sm bg-white"
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>

          <div className="text-xs text-gray-500">Forecast horizon</div>
          <select
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-sm bg-white"
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
          </select>
        </div>
      </div>

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Forecast revenue"
          value={money(roundedSummary?.totalForecastRevenue || 0)}
          subtitle={
            horizonDays
              ? `Estimated for next ${horizonDays} days`
              : undefined
          }
        />
        <MetricCard
          label="Forecast units"
          value={roundedSummary?.totalForecastQty || 0}
          subtitle="Across top products"
        />
        <MetricCard
          label="Products considered"
          value={roundedSummary?.productCount || 0}
        />
        <MetricCard
          label="Categories covered"
          value={roundedSummary?.categoryCount || 0}
          subtitle={
            topCategory
              ? `Top: ${topCategory.categoryName || "Unknown"}`
              : undefined
          }
        />
      </div>

      {/* Training info */}
      {range && (
        <div className="text-xs text-gray-500">
          Using orders from{" "}
          <span className="font-semibold">
            {new Date(range.from).toLocaleDateString()}
          </span>{" "}
          to{" "}
          <span className="font-semibold">
            {new Date(range.to).toLocaleDateString()}
          </span>{" "}
          ({range.daysBack || daysBack} days history)
        </div>
      )}

      {/* Layout: products + categories */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top products */}
        <div className="xl:col-span-2 bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-extrabold text-gray-900">
              Top forecasted products
            </div>
            <div className="text-xs text-gray-500">
              Based on average daily sales
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-gray-500">
                Calculating forecast…
              </div>
            ) : productForecasts.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">
                No order history in this period.
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">
                      Product
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Brand / Category
                    </th>
                    <th className="text-right px-4 py-3 font-semibold">
                      Sold (history)
                    </th>
                    <th className="text-right px-4 py-3 font-semibold">
                      Avg / day
                    </th>
                    <th className="text-right px-4 py-3 font-semibold">
                      Forecast qty
                    </th>
                    <th className="text-right px-4 py-3 font-semibold">
                      Forecast revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productForecasts.map((p) => {
                    const avgDaily = p.avgDailyQty || 0;
                    const fq = p.forecastQty || 0;
                    const fr = p.forecastRevenue || 0;
                    return (
                      <tr key={p.productId} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 line-clamp-2">
                            {p.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {p.brand && <span>{p.brand}</span>}
                          {p.brand && p.category && <span> • </span>}
                          {p.category && <span>{p.category}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-700">
                          {p.qtyTotal || 0}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-700">
                          {avgDaily.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                          {Math.round(fq)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                          {money(fr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Category forecast */}
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b font-extrabold text-gray-900">
            Forecast by category
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              Loading…
            </div>
          ) : categoryForecasts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No forecast data for categories.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Forecast qty
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Forecast revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryForecasts.map((c) => (
                  <tr
                    key={c.categoryId || c.categoryName}
                    className="border-t"
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">
                      {c.categoryName || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-700">
                      {Math.round(c.forecastQty || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                      {money(c.forecastRevenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="px-4 py-3 border-t text-[11px] text-gray-500">
            This is a simple projection based on average daily demand over the
            selected history window. For heavy forecasting you’d still export
            to Excel / BI tools.
          </div>
        </div>
      </div>
    </div>
  );
}
