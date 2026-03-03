import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const statusPill = (s) => {
  const base = "px-2 py-1 rounded-full text-xs font-semibold";
  if (s === "pending") return `${base} bg-yellow-100 text-yellow-700`;
  if (s === "confirmed") return `${base} bg-blue-100 text-blue-700`;
  if (s === "processing") return `${base} bg-indigo-100 text-indigo-700`;
  if (s === "shipped") return `${base} bg-purple-100 text-purple-700`;
  if (s === "delivered") return `${base} bg-green-100 text-green-700`;
  if (s === "cancelled") return `${base} bg-red-100 text-red-700`;
  return `${base} bg-gray-100 text-gray-700`;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // order details modal
  const [updating, setUpdating] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    params.set("status", status);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    return params.toString();
  }, [page, status, keyword]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/orders?${query}`, {
        headers: tokenHeader(),
      });

      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) {
      console.error(e);
      alert("Failed to load orders. Check /api/admin/orders route.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openOrder = async (orderNo) => {
    try {
      const { data } = await api.get(`/orders/${orderNo}`, {
        headers: tokenHeader(),
      });
      setSelected(data);
    } catch (e) {
      console.error(e);
      alert("Failed to load order details.");
    }
  };

  const updateStatus = async ({ orderNo, status, courier, trackingId, notes }) => {
    try {
      setUpdating(true);
      await api.put(
        `/admin/orders/${orderNo}/status`,
        { status, courier, trackingId, notes },
        { headers: tokenHeader() }
      );
      await fetchOrders();
      if (selected?.orderNo === orderNo) {
        await openOrder(orderNo);
      }
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Orders
          </h1>
          <p className="text-sm text-gray-500">
            Manage order status, courier & tracking
          </p>
        </div>

        <div className="text-sm text-gray-600">
          Total: <span className="font-bold">{total}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-xl border px-3 py-2 text-sm bg-white"
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

          <input
            value={keyword}
            onChange={(e) => {
              setPage(1);
              setKeyword(e.target.value);
            }}
            placeholder="Search orderNo / phone / district / division"
            className="rounded-xl border px-3 py-2 text-sm w-full sm:w-80"
          />
        </div>

        <button
          onClick={fetchOrders}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Order</th>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Region</th>
                <th className="text-left px-4 py-3 font-semibold">Total</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>
                    Loading orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {o.orderNo}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {o.user?.name || "Guest"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.user?.email || ""}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-gray-900">
                        {o.shippingAddress?.division || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.shippingAddress?.district || ""}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-bold text-gray-900">
                      {money(o.pricing?.grandTotal)}
                    </td>

                    <td className="px-4 py-3">
                      <span className={statusPill(o.status)}>{o.status}</span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openOrder(o.orderNo)}
                        className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                      >
                        View / Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <div className="text-gray-600">
            Page <span className="font-bold">{page}</span> of{" "}
            <span className="font-bold">{pages}</span>
          </div>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
            >
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                page >= pages
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl bg-white rounded-2xl border shadow-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="font-extrabold text-gray-900">
                  {selected.orderNo}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(selected.createdAt).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: items */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="font-extrabold text-gray-900 mb-3">
                  Items
                </div>

                <div className="space-y-3">
                  {(selected.items || []).map((it) => (
                    <div
                      key={it._id}
                      className="flex items-center justify-between gap-3 bg-white border rounded-xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={it.imageSnapshot || "https://via.placeholder.com/48"}
                          alt={it.nameSnapshot}
                          className="h-12 w-12 rounded-xl object-cover border"
                        />
                        <div>
                          <div className="font-semibold text-gray-900 line-clamp-1">
                            {it.nameSnapshot}
                          </div>
                          <div className="text-xs text-gray-500">
                            SKU: {it.skuSnapshot} • Qty: {it.qty}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-900">
                        {money(it.price)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-white border rounded-xl p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items Total</span>
                    <span className="font-bold">
                      {money(selected.pricing?.itemsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-bold">
                      {money(selected.pricing?.shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-bold">
                      -{money(selected.pricing?.discountTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t">
                    <span className="text-gray-900 font-extrabold">
                      Grand Total
                    </span>
                    <span className="text-gray-900 font-extrabold">
                      {money(selected.pricing?.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: status update */}
              <OrderUpdatePanel
                order={selected}
                updating={updating}
                onUpdate={(payload) => updateStatus(payload)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderUpdatePanel({ order, updating, onUpdate }) {
  const [status, setStatus] = useState(order.status || "pending");
  const [courier, setCourier] = useState(order.shipment?.courier || "");
  const [trackingId, setTrackingId] = useState(order.shipment?.trackingId || "");
  const [notes, setNotes] = useState(order.notes || "");

  useEffect(() => {
    setStatus(order.status || "pending");
    setCourier(order.shipment?.courier || "");
    setTrackingId(order.shipment?.trackingId || "");
    setNotes(order.notes || "");
  }, [order]);

  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="font-extrabold text-gray-900 mb-3">Update Order</div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
          >
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="processing">processing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
            <option value="returned">returned</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Courier</label>
          <input
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="Pathao / RedX / Sundarban"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">
            Tracking ID
          </label>
          <input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Tracking number"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes for this order"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[90px]"
          />
        </div>

        <button
          disabled={updating}
          onClick={() =>
              onUpdate({
                orderNo: order.orderNo,
                status,
                courier,
                trackingId,
                notes,
              })
          }
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            updating ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {updating ? "Updating..." : "Save Changes"}
        </button>

        <div className="text-xs text-gray-500">
          Payment:{" "}
          <span className="font-semibold text-gray-800">
            {order.payment?.method || "—"} ({order.payment?.status || "—"})
          </span>
        </div>

        <div className="text-xs text-gray-500">
          Ship to:{" "}
          <span className="font-semibold text-gray-800">
            {order.shippingAddress?.division || "—"},{" "}
            {order.shippingAddress?.district || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
