import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;

const STATUS_OPTIONS = [
  "requested",
  "approved",
  "rejected",
  "picked",
  "received",
  "refunded",
];

const timeOptionLabel = (value) => {
  if (value === "WITHIN_24_HOURS") return "Within 24 hours";
  if (value === "WITHIN_3_DAYS") return "Within 3 days";
  if (value === "WITHIN_7_DAYS") return "Within 7 days";
  return "-";
};

export default function AdminReturns() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/returns/my", { headers: tokenHeader() });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to load return/refund requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r?.status === statusFilter);
  }, [rows, statusFilter]);

  const updateStatus = async (row, nextStatus) => {
    try {
      setUpdatingId(row._id);
      const payload = { status: nextStatus };
      if (nextStatus === "refunded") {
        payload.refund = {
          amount: Number(row?.order?.pricing?.grandTotal || 0),
          method: row?.order?.payment?.method === "COD" ? "CASH" : "BANK",
        };
      }
      await api.put(`/returns/admin/${row._id}/status`, payload, {
        headers: tokenHeader(),
      });
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update return/refund status");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Returns & Refunds</h1>
          <p className="text-sm text-gray-500">
            Customer refund requests from order details page.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm bg-white"
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Request</th>
                <th className="text-left px-4 py-3 font-semibold">Order</th>
                <th className="text-left px-4 py-3 font-semibold">Preference</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={5}>
                    Loading requests...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={5}>
                    No requests found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r._id}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleString("en-BD")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r?.order?.orderNo || "-"}</div>
                      <div className="text-xs text-gray-500">
                        {money(r?.order?.pricing?.grandTotal || 0)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {r?.customerRefundPreference?.reason || "-"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Preferred:{" "}
                        {timeOptionLabel(r?.customerRefundPreference?.refundTimeOption)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {r?.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r, e.target.value)}
                        disabled={updatingId === r._id}
                        className="rounded-xl border px-3 py-2 text-xs font-semibold bg-white"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
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
