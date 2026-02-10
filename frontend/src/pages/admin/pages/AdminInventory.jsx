import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function AdminInventory() {
  const [metrics, setMetrics] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // selection for manual adjustment
  const [selected, setSelected] = useState(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("RESTOCK");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrMsg("");
      const { data } = await api.get(
        `/admin/inventory/overview?threshold=${encodeURIComponent(
          threshold
        )}`,
        { headers: tokenHeader() }
      );
      setMetrics(data.metrics || null);
      setLowStock(data.lowStock || []);
      setMovements(data.recentMovements || []);
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to load inventory overview. Check /api/admin/inventory/overview."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const totalLowStockUnits = useMemo(
    () =>
      lowStock.reduce((sum, v) => sum + Number(v.stock || 0), 0),
    [lowStock]
  );

  const handleSelectVariant = (entry) => {
    setSelected(entry);
    setDelta("");
    setReason("RESTOCK");
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
      alert(
        e?.response?.data?.message || "Failed to update inventory. Check server logs."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Inventory
          </h1>
          <p className="text-sm text-gray-500">
            Monitor stock levels and adjust variants
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>Low-stock threshold:</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) =>
                setThreshold(Math.max(0, Number(e.target.value || 0)))
              }
              className="w-16 rounded-xl border px-2 py-1 text-sm text-right"
            />
          </div>
          <button
            onClick={fetchOverview}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
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
          label="Total SKUs"
          value={metrics?.totalSkus ?? 0}
        />
        <MetricCard
          label="Units in stock"
          value={metrics?.totalUnitsInStock ?? 0}
        />
        <MetricCard
          label="Stock value"
          value={money(metrics?.totalStockValue ?? 0)}
        />
        <MetricCard
          label={`Low-stock (≤ ${threshold})`}
          value={`${metrics?.lowStockCount ?? 0} variants / ${totalLowStockUnits} units`}
        />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Low-stock table */}
        <div className="xl:col-span-2 bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <div className="font-extrabold text-gray-900">
              Low-stock variants
            </div>
            <div className="text-xs text-gray-500">
              Click a row to select for adjustment
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold">
                    Brand / Category
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Stock
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={5}>
                      Loading inventory…
                    </td>
                  </tr>
                ) : lowStock.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={5}>
                      No variants are at or below the threshold.
                    </td>
                  </tr>
                ) : (
                  lowStock.map((v) => {
                    const isSelected =
                      selected &&
                      selected.productId === v.productId &&
                      selected.variantId === v.variantId;
                    return (
                      <tr
                        key={`${v.productId}-${v.variantId}`}
                        className={`border-t cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleSelectVariant(v)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 line-clamp-1">
                            {v.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-mono text-gray-700">
                            {v.sku || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {v.brand && <span>{v.brand}</span>}
                          {v.brand && v.category && <span> • </span>}
                          {v.category && <span>{v.category}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${
                              v.stock === 0
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {v.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {money(v.price)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjust panel */}
        <div className="bg-white border rounded-3xl shadow-sm p-5 h-fit">
          <div className="font-extrabold text-gray-900 mb-2">
            Manual stock adjustment
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Select a low-stock variant from the left to adjust its stock.
          </p>

          {selected ? (
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="text-sm">
                <div className="font-semibold text-gray-900 line-clamp-2">
                  {selected.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  SKU:{" "}
                  <span className="font-mono font-semibold">
                    {selected.sku || "—"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Current stock:{" "}
                  <span className="font-bold text-gray-900">
                    {selected.stock}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Delta (can be negative)
                </label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. 10 to add, -2 to remove"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                >
                  <option value="RESTOCK">RESTOCK</option>
                  <option value="DAMAGE">DAMAGE</option>
                  <option value="LOST">LOST</option>
                  <option value="MANUAL_ADJUST">MANUAL_ADJUST</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notes about this adjustment"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
                  saving
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {saving ? "Saving…" : "Apply adjustment"}
              </button>
            </form>
          ) : (
            <div className="text-sm text-gray-500">
              No variant selected yet. Click a row in the low-stock list to
              start adjusting stock.
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b font-extrabold text-gray-900">
          Recent inventory movements
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">When</th>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-right px-4 py-3 font-semibold">Qty</th>
                <th className="text-left px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>
                    No inventory movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m._id} className="border-t">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 line-clamp-1">
                        {m.product?.name || "Unknown product"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold">
                      {m.type}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {m.reason}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {m.qty}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                      {m.note}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-lg font-extrabold text-gray-900 break-all">
        {value}
      </div>
    </div>
  );
}
