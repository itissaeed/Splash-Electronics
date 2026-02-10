import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/overview", { headers: tokenHeader() });
      setData(res.data);
    } catch (e) {
      console.error(e);
      alert("Failed to load overview. Make sure /api/admin/overview exists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="text-gray-600">Loading dashboard…</div>;
  if (!data) return <div className="text-gray-600">No dashboard data.</div>;

  const cards = [
    { label: "Total Revenue", value: money(data.totalRevenue) },
    { label: "Total Orders", value: data.totalOrders },
    { label: "Total Customers", value: data.totalCustomers },
    { label: "Pending Orders", value: data.statusCounts?.pending || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="text-sm text-gray-500 font-semibold">{c.label}</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Best sellers + Region sales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h3 className="font-extrabold text-gray-900 mb-4">Best Sellers</h3>
          <div className="space-y-3">
            {data.bestSellers?.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={p.imageSnapshot || "https://via.placeholder.com/48"}
                    alt={p.nameSnapshot}
                    className="h-12 w-12 rounded-xl object-cover border"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 line-clamp-1">
                      {p.nameSnapshot}
                    </div>
                    <div className="text-xs text-gray-500">
                      Sold: {p.qtySold} • Revenue: {money(p.revenue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!data.bestSellers?.length && (
              <div className="text-sm text-gray-500">No sales yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <h3 className="font-extrabold text-gray-900 mb-4">Sales by Division</h3>
          <div className="space-y-3">
            {data.salesByDivision?.map((r) => (
              <div key={r._id || "Unknown"} className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">{r._id || "Unknown"}</div>
                <div className="text-sm text-gray-600">
                  {r.totalOrders} orders • <span className="font-bold">{money(r.revenue)}</span>
                </div>
              </div>
            ))}
            {!data.salesByDivision?.length && (
              <div className="text-sm text-gray-500">No region data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
