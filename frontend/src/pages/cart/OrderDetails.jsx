import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../utils/api";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const STATUS_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];

const badgeClass = (status) => {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border";
  switch (status) {
    case "pending":
      return `${base} bg-amber-50 text-amber-700 border-amber-200`;
    case "confirmed":
    case "processing":
      return `${base} bg-blue-50 text-blue-700 border-blue-200`;
    case "shipped":
      return `${base} bg-purple-50 text-purple-700 border-purple-200`;
    case "delivered":
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    case "cancelled":
    case "returned":
      return `${base} bg-red-50 text-red-700 border-red-200`;
    default:
      return `${base} bg-gray-50 text-gray-700 border-gray-200`;
  }
};

function Step({ label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold border",
          done
            ? "bg-indigo-600 text-white border-indigo-600"
            : active
            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
            : "bg-white text-gray-400 border-gray-200",
        ].join(" ")}
      >
        {done ? "✓" : "•"}
      </div>
      <div className={done || active ? "text-sm font-bold text-gray-900" : "text-sm font-semibold text-gray-400"}>
        {label}
      </div>
    </div>
  );
}

export default function OrderDetails() {
  const { orderNo } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/orders/${orderNo}`, { headers: tokenHeader() });
      setOrder(data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  const itemCount = useMemo(() => {
    return order?.items?.reduce((sum, it) => sum + Number(it.qty || 0), 0) || 0;
  }, [order]);

  const currentStepIndex = useMemo(() => {
    const s = order?.status;
    const i = STATUS_FLOW.indexOf(s);
    return i >= 0 ? i : -1; // cancelled/returned etc.
  }, [order]);

  if (loading) return <div className="p-6 text-gray-600">Loading…</div>;
  if (!order) return <div className="p-6 text-gray-600">Order not found.</div>;

  const addr = order.shippingAddress || {};
  const pay = order.payment || {};
  const pricing = order.pricing || {};
  const shipment = order.shipment || {};

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{order.orderNo}</h1>
              <span className={badgeClass(order.status)}>{order.status}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {new Date(order.createdAt).toLocaleString()} • {itemCount} item(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              ← My Orders
            </Link>
            <Link
              to="/products"
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        {/* Timeline (only for normal flow orders) */}
        {currentStepIndex >= 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {STATUS_FLOW.map((st, idx) => (
                <Step
                  key={st}
                  label={st.charAt(0).toUpperCase() + st.slice(1)}
                  active={idx === currentStepIndex}
                  done={idx < currentStepIndex}
                />
              ))}
            </div>
          </div>
        )}

        {/* Cancelled/Returned note */}
        {["cancelled", "returned"].includes(order.status) && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This order is marked as <span className="font-bold">{order.status}</span>.
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 bg-white border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b font-extrabold text-gray-900">Items</div>

          <div className="divide-y">
            {order.items.map((it) => {
              const itemTotal = Number(it.price || 0) * Number(it.qty || 0);
              return (
                <div key={it._id} className="p-5 flex gap-4">
                  <img
                    src={it.imageSnapshot || "https://via.placeholder.com/96"}
                    alt={it.nameSnapshot}
                    className="h-24 w-24 rounded-2xl object-cover border"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 line-clamp-2">{it.nameSnapshot}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      SKU: <span className="font-semibold text-gray-700">{it.skuSnapshot || "—"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <div className="rounded-xl bg-gray-50 border px-3 py-1">
                        Qty: <span className="font-bold text-gray-900">{it.qty}</span>
                      </div>
                      <div className="rounded-xl bg-gray-50 border px-3 py-1">
                        Unit: <span className="font-bold text-gray-900">{money(it.price)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-lg font-extrabold text-gray-900">{money(itemTotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary & Address */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border rounded-3xl p-5 shadow-sm">
            <div className="font-extrabold text-gray-900">Summary</div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-bold text-gray-900">{money(pricing.itemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-bold text-gray-900">{money(pricing.shippingFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-bold text-gray-900">-{money(pricing.discountTotal)}</span>
              </div>

              <div className="pt-3 mt-3 border-t flex justify-between">
                <span className="text-base font-extrabold text-gray-900">Total</span>
                <span className="text-base font-extrabold text-indigo-600">{money(pricing.grandTotal)}</span>
              </div>
            </div>

            {order.coupon?.code && (
              <div className="mt-4 rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm">
                Coupon: <span className="font-extrabold text-indigo-700">{order.coupon.code}</span>{" "}
                <span className="text-indigo-700">({money(order.coupon.discountAmount)} off)</span>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">
              Payment:{" "}
              <span className="font-semibold text-gray-800">
                {pay.method} ({pay.status})
              </span>
              {pay.paidAt && (
                <span className="block mt-1">
                  Paid at: <span className="font-semibold text-gray-800">{new Date(pay.paidAt).toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white border rounded-3xl p-5 shadow-sm">
            <div className="font-extrabold text-gray-900">Shipping</div>

            <div className="mt-3 text-sm text-gray-700 space-y-1">
              {addr.recipientName && <div><span className="font-bold">{addr.recipientName}</span></div>}
              {addr.phone && <div className="text-gray-600">Phone: <span className="font-semibold text-gray-800">{addr.phone}</span></div>}
              <div className="text-gray-600">
                {addr.addressLine1}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
              </div>
              <div className="text-gray-600">
                {addr.area ? `${addr.area}, ` : ""}
                {addr.upazila ? `${addr.upazila}, ` : ""}
                {addr.district}, {addr.division}
                {addr.postalCode ? ` - ${addr.postalCode}` : ""}
              </div>
            </div>

            {(shipment.trackingId || shipment.courier) && (
              <div className="mt-4 rounded-2xl bg-gray-50 border px-4 py-3 text-sm">
                <div className="text-gray-600">Shipment</div>
                <div className="font-bold text-gray-900">
                  {shipment.courier || "Courier"} • {shipment.trackingId || "—"}
                </div>
                {shipment.shippedAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Shipped: {new Date(shipment.shippedAt).toLocaleString()}
                  </div>
                )}
                {shipment.deliveredAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Delivered: {new Date(shipment.deliveredAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          {order.notes && (
            <div className="bg-white border rounded-3xl p-5 shadow-sm">
              <div className="font-extrabold text-gray-900">Notes</div>
              <p className="mt-2 text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
