import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";
import { buildTrackingUrl } from "../../utils/shipmentTracking";

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";
const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const REFUND_TIME_OPTIONS = [
  { value: "WITHIN_24_HOURS", label: "Within 24 hours" },
  { value: "WITHIN_3_DAYS", label: "Within 3 days" },
  { value: "WITHIN_7_DAYS", label: "Within 7 days" },
];

const STATUS_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];

const badgeClass = (status) => {
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

const prettyStatus = (s) => {
  const str = String(s || "unknown");
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="rounded-3xl border bg-white p-6 animate-pulse">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-64 rounded bg-gray-100" />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border bg-white p-5 animate-pulse h-80" />
        <div className="rounded-3xl border bg-white p-5 animate-pulse h-80" />
      </div>
    </div>
  );
}

function Step({ label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "h-7 w-7 rounded-full border text-xs font-extrabold flex items-center justify-center",
          done
            ? "bg-slate-900 text-white border-slate-900"
            : active
            ? "bg-slate-100 text-slate-800 border-slate-300"
            : "bg-white text-gray-400 border-gray-200",
        ].join(" ")}
      >
        {done ? "OK" : "-"}
      </div>
      <span
        className={done || active ? "text-sm font-semibold text-gray-900" : "text-sm text-gray-400"}
      >
        {label}
      </span>
    </div>
  );
}

export default function OrderDetails() {
  const { orderNo } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundTimeOption, setRefundTimeOption] = useState("WITHIN_3_DAYS");
  const [refundFormError, setRefundFormError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/orders/${orderNo}`, { headers: tokenHeader() });
      setOrder(data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to load order details.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  const itemCount = useMemo(
    () => order?.items?.reduce((sum, it) => sum + Number(it?.qty || 0), 0) || 0,
    [order]
  );

  const currentStepIndex = useMemo(() => {
    const i = STATUS_FLOW.indexOf(order?.status);
    return i >= 0 ? i : -1;
  }, [order]);

  if (loading) return <LoadingSkeleton />;
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <div className="text-lg font-bold text-gray-900">Order not found</div>
          <p className="mt-1 text-sm text-gray-500">The order may not exist or access is restricted.</p>
          <Link
            to="/orders"
            className="mt-4 inline-block rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  const addr = order.shippingAddress || {};
  const pay = order.payment || {};
  const pricing = order.pricing || {};
  const shipment = order.shipment || {};
  const visibleGrandTotal =
    Number(pricing?.itemsTotal || 0) +
    Number(pricing?.shippingFee || 0) +
    Number(pricing?.discountTotal || 0);
  const trackingUrl =
    String(shipment?.trackingUrl || "").trim() ||
    buildTrackingUrl(shipment?.courier, shipment?.trackingId);
  const canCancel = ["pending", "confirmed", "processing"].includes(order?.status);
  const canConfirmDelivery = order?.status === "shipped";
  const canRequestRefund =
    ["cancelled", "delivered"].includes(order?.status) && pay?.status === "paid";

  const doCancelOrder = async () => {
    const ok = window.confirm(
      "Cancel this order now? If already paid, you can request refund right after cancellation."
    );
    if (!ok) return;
    try {
      setActionLoading("cancel");
      await api.post(`/orders/${orderNo}/cancel`, {}, { headers: tokenHeader() });
      await load();
      alert("Order cancelled.");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to cancel order");
    } finally {
      setActionLoading("");
    }
  };

  const doConfirmDelivery = async () => {
    const ok = window.confirm("Confirm that you received the product from the courier?");
    if (!ok) return;
    try {
      setActionLoading("confirm");
      await api.post(`/orders/${orderNo}/confirm-delivery`, {}, { headers: tokenHeader() });
      await load();
      alert("Delivery confirmed.");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to confirm delivery");
    } finally {
      setActionLoading("");
    }
  };

  const doRequestRefund = async () => {
    setRefundFormError("");
    setRefundModalOpen(true);
  };

  const submitRefundRequest = async () => {
    const reason = refundReason.trim();
    if (!reason) {
      setRefundFormError("Please provide a refund reason.");
      return;
    }
    try {
      setActionLoading("refund");
      await api.post(
        `/orders/${orderNo}/refund`,
        {
          reason,
          refundTimeOption,
          notes: "Requested from customer order details page",
        },
        { headers: tokenHeader() }
      );
      setRefundModalOpen(false);
      setRefundReason("");
      setRefundTimeOption("WITHIN_3_DAYS");
      alert("Refund request submitted. Our team will review it.");
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to request refund";
      setRefundFormError(msg);
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <section className="rounded-3xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Order Details</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold">{order.orderNo}</h1>
                <span className={badgeClass(order.status)}>{prettyStatus(order.status)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-200">
                Placed {formatDate(order.createdAt)} | {itemCount} item(s)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/"
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Home
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Back
              </button>
              <Link
                to="/orders"
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Back to orders
              </Link>
              <Link
                to="/products"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Continue shopping
              </Link>
            </div>
          </div>

          {currentStepIndex >= 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {STATUS_FLOW.map((st, idx) => (
                <Step
                  key={st}
                  label={prettyStatus(st)}
                  active={idx === currentStepIndex}
                  done={idx < currentStepIndex}
                />
              ))}
            </div>
          )}

              {["cancelled", "returned"].includes(order.status) ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  This order is currently marked as {prettyStatus(order.status)}.
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Delivery partner: This order is fulfilled by Splash Electronics and delivered by a
                third-party courier service.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canCancel ? (
                  <button
                    type="button"
                    onClick={doCancelOrder}
                    disabled={actionLoading === "cancel"}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {actionLoading === "cancel" ? "Cancelling..." : "Cancel Order"}
                  </button>
                ) : null}
                {canConfirmDelivery ? (
                  <button
                    type="button"
                    onClick={doConfirmDelivery}
                    disabled={actionLoading === "confirm"}
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {actionLoading === "confirm" ? "Confirming..." : "Confirm Delivery"}
                  </button>
                ) : null}
                {canRequestRefund ? (
                  <button
                    type="button"
                    onClick={doRequestRefund}
                    disabled={actionLoading === "refund"}
                    className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                  >
                    {actionLoading === "refund" ? "Submitting..." : "Request Refund"}
                  </button>
                ) : null}
              </div>
              {refundModalOpen ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-bold text-amber-900">Refund Request</div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-amber-900">Reason *</label>
                      <textarea
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Write the reason for your refund request"
                        className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 min-h-[90px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-amber-900">
                        Preferred refund time *
                      </label>
                      <select
                        value={refundTimeOption}
                        onChange={(e) => setRefundTimeOption(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800"
                      >
                        {REFUND_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {refundFormError ? (
                      <div className="text-xs font-semibold text-red-700">{refundFormError}</div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={submitRefundRequest}
                        disabled={actionLoading === "refund"}
                        className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
                      >
                        {actionLoading === "refund" ? "Submitting..." : "Submit Refund Request"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundModalOpen(false)}
                        className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-3xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4 font-extrabold text-gray-900">Items</div>
            <div className="divide-y">
              {order.items?.map((it) => {
                const itemTotal = Number(it?.price || 0) * Number(it?.qty || 0);
                return (
                  <article key={it._id} className="p-5 flex gap-4">
                    <img
                      src={it?.imageSnapshot || fallbackImg}
                      alt={it?.nameSnapshot || "Order item"}
                      className="h-24 w-24 rounded-2xl border object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 line-clamp-2">{it?.nameSnapshot || "Product"}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        SKU: <span className="font-semibold text-gray-700">{it?.skuSnapshot || "-"}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-xl border bg-gray-50 px-3 py-1">
                          Qty: <span className="font-bold text-gray-900">{it?.qty || 0}</span>
                        </span>
                        <span className="rounded-xl border bg-gray-50 px-3 py-1">
                          Unit: <span className="font-bold text-gray-900">{money(it?.price)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-lg font-extrabold text-gray-900">{money(itemTotal)}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="font-extrabold text-gray-900">Payment Summary</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items total</span>
                  <span className="font-bold text-gray-900">{money(pricing?.itemsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping fee</span>
                  <span className="font-bold text-gray-900">{money(pricing?.shippingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-bold text-gray-900">-{money(pricing?.discountTotal)}</span>
                </div>
                <div className="mt-3 border-t pt-3 flex justify-between">
                  <span className="font-extrabold text-gray-900">Grand total</span>
                  <span className="font-extrabold text-slate-900">{money(visibleGrandTotal)}</span>
                </div>
              </div>

              {order?.coupon?.code ? (
                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                  Coupon: <span className="font-bold">{order.coupon.code}</span> ({money(order?.coupon?.discountAmount)} off)
                </div>
              ) : null}

              <div className="mt-4 text-sm text-gray-600">
                Payment method: <span className="font-semibold text-gray-900">{pay?.method || "-"}</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Payment status: <span className="font-semibold text-gray-900">{pay?.status || "-"}</span>
              </div>
              {pay?.paidAt ? (
                <div className="mt-1 text-xs text-gray-500">Paid at: {formatDate(pay.paidAt)}</div>
              ) : null}
            </section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="font-extrabold text-gray-900">Shipping Address</div>
              <div className="mt-3 space-y-1 text-sm text-gray-700">
                {addr?.recipientName ? <div className="font-semibold text-gray-900">{addr.recipientName}</div> : null}
                {addr?.phone ? <div>Phone: <span className="font-semibold">{addr.phone}</span></div> : null}
                <div>{addr?.addressLine1 || "-"}{addr?.addressLine2 ? `, ${addr.addressLine2}` : ""}</div>
                <div>
                  {addr?.area ? `${addr.area}, ` : ""}
                  {addr?.upazila ? `${addr.upazila}, ` : ""}
                  {addr?.district || "-"}, {addr?.division || "-"}
                  {addr?.postalCode ? ` - ${addr.postalCode}` : ""}
                </div>
              </div>

              {shipment?.courier || shipment?.trackingId ? (
                <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-sm">
                  <div className="text-gray-600">Shipment</div>
                  <div className="font-semibold text-gray-900">
                    {shipment?.courier || "Courier"} | {shipment?.trackingId || "-"}
                  </div>
                  {trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Track shipment
                    </a>
                  ) : null}
                  <div className="mt-1 text-xs text-gray-500">
                    Delivered by third-party courier on behalf of Splash Electronics.
                  </div>
                  {shipment?.deliveryOption ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Delivery option: {shipment.deliveryOption}
                      {shipment?.estimatedDaysMin && shipment?.estimatedDaysMax
                        ? ` (${shipment.estimatedDaysMin}-${shipment.estimatedDaysMax} days ETA)`
                        : ""}
                    </div>
                  ) : null}
                  {shipment?.bookingRef ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Booking ref: {shipment.bookingRef}
                    </div>
                  ) : null}
                  {shipment?.pickupDate ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Pickup date: {formatDate(shipment.pickupDate)}
                    </div>
                  ) : null}
                  {shipment?.expectedDeliveryDate ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Estimated delivery by: {formatDate(shipment.expectedDeliveryDate)}
                    </div>
                  ) : shipment?.estimatedDaysMax ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Estimated delivery in {shipment.estimatedDaysMax} day(s)
                    </div>
                  ) : null}
                  {shipment?.courierCharge !== undefined &&
                  shipment?.courierCharge !== null ? (
                    <div className="mt-1 text-xs text-gray-500">
                      Courier charge (included in shipping fee): {money(shipment.courierCharge)}
                    </div>
                  ) : null}
                  {shipment?.shippedAt ? (
                    <div className="mt-1 text-xs text-gray-500">Shipped: {formatDate(shipment.shippedAt)}</div>
                  ) : null}
                  {shipment?.deliveredAt ? (
                    <div className="mt-1 text-xs text-gray-500">Delivered: {formatDate(shipment.deliveredAt)}</div>
                  ) : null}
                </div>
              ) : null}
            </section>

            {order?.notes ? (
              <section className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="font-extrabold text-gray-900">Notes</div>
                <p className="mt-2 text-sm text-gray-700">{order.notes}</p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
