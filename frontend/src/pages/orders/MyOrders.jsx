import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const statusBadge = (status) => {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold";
  switch (status) {
    case "pending":
      return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
    case "confirmed":
    case "processing":
      return `${base} bg-blue-50 text-blue-700 border border-blue-200`;
    case "shipped":
      return `${base} bg-purple-50 text-purple-700 border border-purple-200`;
    case "delivered":
      return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`;
    case "cancelled":
    case "returned":
      return `${base} bg-red-50 text-red-700 border border-red-200`;
    default:
      return `${base} bg-gray-50 text-gray-700 border border-gray-200`;
  }
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const navigate = useNavigate();

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      setErrMsg("");
      const { data } = await api.get("/orders/my", { headers: tokenHeader() });
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Failed to fetch your orders.";
      setErrMsg(msg);

      // If token invalid, you can redirect:
      if (e?.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o?.pricing?.grandTotal || 0), 0);
  }, [orders]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500">Track all your purchases in one place</p>
        </div>

        <div className="rounded-2xl border bg-white px-4 py-3">
          <div className="text-xs text-gray-500">Total spent</div>
          <div className="text-lg font-extrabold text-gray-900">{money(totalSpent)}</div>
        </div>
      </div>

      {errMsg && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading your orders…</div>
      ) : orders.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center">
          <div className="text-gray-900 font-bold">No orders yet</div>
          <p className="text-sm text-gray-500 mt-1">When you place orders, they’ll show up here.</p>
          <Link
            to="/products"
            className="mt-4 inline-block rounded-xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold hover:bg-indigo-500"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b font-extrabold text-gray-900">Orders</div>

          <div className="divide-y">
            {orders.map((o) => {
              const firstImg =
                o?.items?.[0]?.imageSnapshot ||
                "https://via.placeholder.com/96";

              const itemCount = o?.items?.reduce((sum, it) => sum + Number(it.qty || 0), 0) || 0;

              return (
                <div key={o._id} className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <img
                    src={firstImg}
                    alt={o.orderNo}
                    className="h-20 w-20 rounded-xl object-cover border"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-extrabold text-gray-900">{o.orderNo}</div>
                      <span className={statusBadge(o.status)}>{o.status}</span>
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(o.createdAt).toLocaleString()} • {itemCount} item(s)
                    </div>

                    <div className="mt-2 text-sm text-gray-700">
                      Ship to:{" "}
                      <span className="font-semibold">
                        {o?.shippingAddress?.division}, {o?.shippingAddress?.district}
                      </span>
                    </div>

                    {o?.shipment?.trackingId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Tracking:{" "}
                        <span className="font-semibold text-gray-800">
                          {o?.shipment?.courier || "Courier"} • {o.shipment.trackingId}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-lg font-extrabold text-indigo-600">
                      {money(o?.pricing?.grandTotal)}
                    </div>

                    <Link
                      to={`/order/${o.orderNo}`}
                      className="mt-2 inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link to="/products" className="text-sm font-semibold text-indigo-600 hover:underline">
          Continue shopping →
        </Link>
      </div>
    </div>
  );
}
