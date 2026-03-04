import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { buildTrackingUrl } from "../../utils/shipmentTracking";

const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

const statusBadge = (status) => {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold capitalize";
  switch (status) {
    case "pending":
      return `${base} border-amber-200 bg-amber-50 text-amber-700`;
    case "confirmed":
    case "processing":
      return `${base} border-blue-200 bg-blue-50 text-blue-700`;
    case "shipped":
      return `${base} border-violet-200 bg-violet-50 text-violet-700`;
    case "delivered":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
    case "cancelled":
    case "returned":
      return `${base} border-rose-200 bg-rose-50 text-rose-700`;
    default:
      return `${base} border-gray-200 bg-gray-50 text-gray-700`;
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border bg-white p-4">
          <div className="flex gap-4">
            <div className="h-20 w-20 rounded-xl bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
              <div className="mt-2 h-3 w-36 rounded bg-gray-100 animate-pulse" />
              <div className="mt-4 h-3 w-56 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="w-28">
              <div className="h-4 w-20 ml-auto rounded bg-gray-200 animate-pulse" />
              <div className="mt-2 h-9 rounded-xl bg-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
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
      if (e?.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        order?.status === statusFilter ||
        (statusFilter === "processing" && order?.status === "confirmed");

      if (!matchesStatus) return false;
      if (!q) return true;

      const where = [
        order?.orderNo,
        order?.status,
        order?.shippingAddress?.division,
        order?.shippingAddress?.district,
        order?.shipment?.trackingId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return where.includes(q);
    });
  }, [orders, query, statusFilter]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce(
      (sum, o) => sum + Number(o?.pricing?.grandTotal || 0),
      0
    );
    const deliveredCount = orders.filter((o) => o?.status === "delivered").length;
    const activeCount = orders.filter((o) => {
      const s = o?.status;
      return s !== "delivered" && s !== "cancelled" && s !== "returned";
    }).length;

    return {
      totalOrders: orders.length,
      totalSpent,
      deliveredCount,
      activeCount,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="rounded-3xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Account Center</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">My Orders</h1>
              <p className="mt-2 text-sm text-slate-200">View order history, monitor deliveries, and open full order details.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <Link
                  to="/"
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
                >
                  Home
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
                >
                  Back
                </button>
              </div>
            </div>
            <button
              onClick={fetchMyOrders}
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs text-slate-300">Total Orders</div>
              <div className="mt-1 text-xl font-extrabold">{stats.totalOrders}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs text-slate-300">Total Spent</div>
              <div className="mt-1 text-xl font-extrabold">{money(stats.totalSpent)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs text-slate-300">Delivered</div>
              <div className="mt-1 text-xl font-extrabold">{stats.deliveredCount}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs text-slate-300">Active</div>
              <div className="mt-1 text-xl font-extrabold">{stats.activeCount}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    statusFilter === f.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order no, status, district, tracking..."
              className="w-full lg:w-96 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        {errMsg && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errMsg}
          </div>
        )}

        <div className="mt-5">
          {loading ? (
            <LoadingSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center">
              <div className="text-lg font-bold text-gray-900">No matching orders</div>
              <p className="mt-1 text-sm text-gray-500">Try another filter or search term.</p>
              <Link
                to="/products"
                className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((o) => {
                const firstImg = o?.items?.[0]?.imageSnapshot || "https://via.placeholder.com/96";
                const itemCount =
                  o?.items?.reduce((sum, it) => sum + Number(it?.qty || 0), 0) || 0;
                const trackingUrl =
                  String(o?.shipment?.trackingUrl || "").trim() ||
                  buildTrackingUrl(o?.shipment?.courier, o?.shipment?.trackingId);
                const visibleTotal =
                  Number(o?.pricing?.itemsTotal || 0) +
                  Number(o?.pricing?.shippingFee || 0) -
                  Number(o?.pricing?.discountTotal || 0);

                return (
                  <article
                    key={o._id}
                    className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <img
                        src={firstImg}
                        alt={o.orderNo}
                        className="h-20 w-20 rounded-xl border object-cover"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                            {o.orderNo}
                          </h2>
                          <span className={statusBadge(o.status)}>{o.status || "unknown"}</span>
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                          Placed: {formatDate(o?.createdAt)} | Items: {itemCount}
                        </p>

                        <p className="mt-2 text-sm text-gray-700">
                          Shipping: {o?.shippingAddress?.division || "-"}, {o?.shippingAddress?.district || "-"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Delivery fee: {money(o?.pricing?.shippingFee)} | Delivery by third-party courier
                        </p>

                        {o?.shipment?.trackingId ? (
                          <p className="mt-1 text-xs text-gray-500">
                            Tracking: <span className="font-semibold text-gray-700">{o?.shipment?.courier || "Courier"} | {o.shipment.trackingId}</span>
                            {trackingUrl ? (
                              <>
                                {" "}
                                <a
                                  href={trackingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-indigo-600 hover:underline"
                                >
                                  Track
                                </a>
                              </>
                            ) : null}
                          </p>
                        ) : null}
                      </div>

                      <div className="sm:text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-xl font-extrabold text-slate-900">
                          {money(visibleTotal)}
                        </div>
                        <Link
                          to={`/order/${o.orderNo}`}
                          className="mt-2 inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/products" className="text-sm font-semibold text-indigo-600 hover:underline">
            Continue shopping ->
          </Link>
        </div>
      </div>
    </div>
  );
}
