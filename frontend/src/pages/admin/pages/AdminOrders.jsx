import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../utils/api";
import { buildTrackingUrl } from "../../../utils/shipmentTracking";
import { COURIER_STATUS_LABELS, FULFILLMENT_MODE_LABELS, getShipmentTimeline } from "../../../utils/shipmentTimeline";

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const COURIER_OPTIONS = ["Pathao", "RedX", "Sundarban", "eCourier", "Steadfast"];
const COURIER_STATUS_OPTIONS = Object.keys(COURIER_STATUS_LABELS);
const NON_SHIPPED_COURIER_STATUSES = ["AWAITING_BOOKING", "BOOKED"];
const SHIPPED_COURIER_STATUS_OPTIONS = COURIER_STATUS_OPTIONS.filter(
  (value) => !["DELIVERED", "RETURNED_TO_MERCHANT"].includes(value)
);
const STATUS_FLOW = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
const STATUS_OPTIONS = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const PAYMENT_METHOD_OPTIONS = ["all", "COD", "BKASH", "NAGAD", "CARD", "BANK", "SSLCOMMERZ"];
const STATUS_LABELS = {
  confirmed: "Confirm Order",
  processing: "Start Processing",
  shipped: "Mark as Shipped",
  delivered: "Mark as Delivered",
  cancelled: "Cancel Order",
  returned: "Mark as Returned",
};

const statusPill = (s) => {
  const normalized = String(s || "").toLowerCase();
  const base = "px-2 py-1 rounded-full text-xs font-semibold";
  if (normalized === "pending") return `${base} bg-yellow-100 text-yellow-700`;
  if (normalized === "confirmed") return `${base} bg-blue-100 text-blue-700`;
  if (normalized === "processing") return `${base} bg-indigo-100 text-indigo-700`;
  if (normalized === "shipped") return `${base} bg-purple-100 text-purple-700`;
  if (normalized === "delivered") return `${base} bg-green-100 text-green-700`;
  if (normalized === "cancelled") return `${base} bg-red-100 text-red-700`;
  if (normalized === "returned") return `${base} bg-orange-100 text-orange-700`;
  return `${base} bg-gray-100 text-gray-700`;
};

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeStatus = (value) =>
  STATUS_OPTIONS.includes(String(value || "").toLowerCase()) ? String(value).toLowerCase() : "all";

const normalizePaymentMethod = (value) => {
  const normalized = String(value || "").toUpperCase();
  return PAYMENT_METHOD_OPTIONS.includes(normalized) ? normalized : "all";
};

const getOrderTotal = (order) => {
  const itemsTotal = Number(order?.pricing?.itemsTotal || 0);
  const shippingFee = Number(order?.pricing?.shippingFee || 0);
  const legacyCourier = Number(order?.shipment?.courierCharge || 0);
  const effectiveShipping = shippingFee > 0 ? shippingFee : legacyCourier;
  const discountTotal = Number(order?.pricing?.discountTotal || 0);
  return itemsTotal + effectiveShipping - discountTotal;
};

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    averageOrderValue: 0,
    paidOrders: 0,
    paidRevenue: 0,
    statusCounts: {},
  });

  const [page, setPage] = useState(() => parsePositiveNumber(searchParams.get("page"), 1));
  const [pages, setPages] = useState(1);

  const [status, setStatus] = useState(() => normalizeStatus(searchParams.get("status") || "all"));
  const [paymentMethod, setPaymentMethod] = useState(() => normalizePaymentMethod(searchParams.get("paymentMethod")));
  const [from, setFrom] = useState(() => searchParams.get("from") || "");
  const [to, setTo] = useState(() => searchParams.get("to") || "");
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") || "");

  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const nextPage = parsePositiveNumber(searchParams.get("page"), 1);
    const nextStatus = normalizeStatus(searchParams.get("status") || "all");
    const nextPaymentMethod = normalizePaymentMethod(searchParams.get("paymentMethod"));
    const nextFrom = searchParams.get("from") || "";
    const nextTo = searchParams.get("to") || "";
    const nextKeyword = searchParams.get("keyword") || "";

    if (page !== nextPage) setPage(nextPage);
    if (status !== nextStatus) setStatus(nextStatus);
    if (paymentMethod !== nextPaymentMethod) setPaymentMethod(nextPaymentMethod);
    if (from !== nextFrom) setFrom(nextFrom);
    if (to !== nextTo) setTo(nextTo);
    if (keyword !== nextKeyword) setKeyword(nextKeyword);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    params.set("scope", "active");
    if (status !== "all") params.set("status", status);
    if (paymentMethod !== "all") params.set("paymentMethod", paymentMethod);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (keyword.trim()) params.set("keyword", keyword.trim());

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [page, status, paymentMethod, from, to, keyword, searchParams, setSearchParams]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    params.set("scope", "active");
    if (status !== "all") params.set("status", status);
    if (paymentMethod !== "all") params.set("paymentMethod", paymentMethod);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    return params.toString();
  }, [page, status, paymentMethod, from, to, keyword]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/orders?${query}`, {
        headers: tokenHeader(),
      });

      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setSummary({
        totalRevenue: Number(data.summary?.totalRevenue || 0),
        averageOrderValue: Number(data.summary?.averageOrderValue || 0),
        paidOrders: Number(data.summary?.paidOrders || 0),
        paidRevenue: Number(data.summary?.paidRevenue || 0),
        statusCounts: data.summary?.statusCounts || {},
      });
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to load orders.");
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

  const updateStatus = async ({
    orderNo,
    status: nextStatus,
    courier,
    trackingId,
    trackingUrl,
    bookingRef,
    pickupDate,
    fulfillmentMode,
    courierStatus,
    courierStatusNote,
    notes,
  }) => {
    const normalizedStatus = String(nextStatus || "").toLowerCase().trim();
    const normalizedCourier = String(courier || "").trim();
    const normalizedTrackingId = String(trackingId || "").trim();
    if (normalizedStatus === "shipped" && (!normalizedCourier || !normalizedTrackingId)) {
      alert("To mark as shipped, please provide both courier name and tracking ID.");
      return;
    }

    try {
      setUpdating(true);
      await api.put(
        `/admin/orders/${orderNo}/status`,
        {
          status: normalizedStatus,
          courier: normalizedCourier,
          trackingId: normalizedTrackingId,
          trackingUrl: String(trackingUrl || "").trim(),
          bookingRef: String(bookingRef || "").trim(),
          fulfillmentMode,
          courierStatus,
          courierStatusNote,
          courierCharge: undefined,
          pickupDate: pickupDate || undefined,
          notes,
        },
        { headers: tokenHeader() }
      );
      await fetchOrders();
      setSelected(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const dispatchShipment = async (orderNo, courierProvider) => {
    try {
      setDispatching(true);
      await api.post(
        `/admin/orders/${orderNo}/dispatch`,
        { courierProvider },
        { headers: tokenHeader() }
      );
      await fetchOrders();
      await openOrder(orderNo);
      alert(`Shipment booked successfully using ${courierProvider}.`);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to book demo shipment");
    } finally {
      setDispatching(false);
    }
  };

  const saveShipmentUpdate = async ({
    orderNo,
    courier,
    trackingId,
    trackingUrl,
    bookingRef,
    pickupDate,
    fulfillmentMode,
    courierStatus,
    courierStatusNote,
    notes,
  }) => {
    try {
      setSavingShipment(true);
      const { data } = await api.patch(
        `/admin/orders/${orderNo}/shipment`,
        {
          courier: String(courier || "").trim(),
          trackingId: String(trackingId || "").trim(),
          trackingUrl: String(trackingUrl || "").trim(),
          bookingRef: String(bookingRef || "").trim(),
          pickupDate: pickupDate || undefined,
          fulfillmentMode,
          courierStatus,
          courierStatusNote,
          notes,
        },
        { headers: tokenHeader() }
      );
      await fetchOrders();
      setSelected(data);
      alert("Shipment update saved.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to save shipment update");
    } finally {
      setSavingShipment(false);
    }
  };

  const deleteOrder = async (orderNo) => {
    const ok = window.confirm(
      "Delete this order permanently? Only cancelled or returned orders can be deleted."
    );
    if (!ok) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/orders/${orderNo}`, { headers: tokenHeader() });
      setSelected(null);
      await fetchOrders();
      alert("Order deleted.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setPage(1);
    setStatus("all");
    setPaymentMethod("all");
    setFrom("");
    setTo("");
    setKeyword("");
  };

  const activeCount =
    Number(summary.statusCounts?.pending || 0) +
    Number(summary.statusCounts?.confirmed || 0) +
    Number(summary.statusCounts?.processing || 0) +
    Number(summary.statusCounts?.shipped || 0);
  const confirmedCount = Number(summary.statusCounts?.confirmed || 0);
  const processingCount = Number(summary.statusCounts?.processing || 0);
  const shippedCount = Number(summary.statusCounts?.shipped || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">
            Active fulfillment queue for confirmation, shipping, and issue handling
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
          Active Orders: <span className="font-bold text-gray-900">{total}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active Orders" value={String(activeCount)} hint="Pending through shipped" />
        <SummaryCard label="Awaiting Confirmation" value={String(confirmedCount)} hint="Confirmed but not yet processing" />
        <SummaryCard label="In Processing" value={String(processingCount)} hint="Being prepared for dispatch" />
        <SummaryCard label="Shipped" value={String(shippedCount)} hint="Currently in transit" />
      </div>

      <div className="premium-card rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Status
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white normal-case tracking-normal text-slate-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Payment
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPage(1);
                setPaymentMethod(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white normal-case tracking-normal text-slate-900"
            >
              <option value="all">All Methods</option>
              <option value="COD">COD</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank</option>
              <option value="SSLCOMMERZ">SSLCommerz</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 xl:col-span-2">
            Search
            <input
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
              placeholder="Order no, phone, district, division"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
          {(from || to || status !== "all" || paymentMethod !== "all" || keyword.trim()) && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {from ? <FilterChip label={`From ${from}`} /> : null}
              {to ? <FilterChip label={`To ${to}`} /> : null}
              {status !== "all" ? <FilterChip label={`Status: ${status}`} /> : null}
              {paymentMethod !== "all" ? <FilterChip label={`Payment: ${paymentMethod}`} /> : null}
              {keyword.trim() ? <FilterChip label={`Search: ${keyword.trim()}`} /> : null}
            </div>
          )}
        </div>
      </div>

      <div className="premium-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3 text-left font-semibold">Region</th>
                <th className="px-4 py-3 text-left font-semibold">Total</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{o.orderNo}</div>
                      <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{o.user?.name || "Guest"}</div>
                      <div className="text-xs text-gray-500">{o.user?.email || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold uppercase text-gray-900">{o.payment?.method || "-"}</div>
                      <div className="text-xs text-gray-500">{o.payment?.status || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{o.shippingAddress?.division || "-"}</div>
                      <div className="text-xs text-gray-500">{o.shippingAddress?.district || ""}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{money(getOrderTotal(o))}</td>
                    <td className="px-4 py-3">
                      <span className={statusPill(o.status)}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
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

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <div className="text-gray-600">
            Page <span className="font-bold">{page}</span> of <span className="font-bold">{pages}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                page <= 1 ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                page >= pages ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="premium-card max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="font-extrabold text-gray-900">{selected.orderNo}</div>
                <div className="text-xs text-gray-500">{new Date(selected.createdAt).toLocaleString()}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="mb-3 font-extrabold text-gray-900">Items</div>

                <div className="space-y-3">
                  {(selected.items || []).map((it) => (
                    <div
                      key={it._id}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={it.imageSnapshot || "https://via.placeholder.com/48"}
                          alt={it.nameSnapshot}
                          className="h-12 w-12 rounded-xl border object-cover"
                        />
                        <div>
                          <div className="line-clamp-1 font-semibold text-gray-900">{it.nameSnapshot}</div>
                          <div className="text-xs text-gray-500">
                            SKU: {it.skuSnapshot} | Qty: {it.qty}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-900">{money(it.price)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border bg-white p-3 text-sm">
                  {(() => {
                    const itemsTotal = Number(selected?.pricing?.itemsTotal || 0);
                    const shippingFeeRaw = Number(selected?.pricing?.shippingFee || 0);
                    const legacyCourier = Number(selected?.shipment?.courierCharge || 0);
                    const shippingFee = shippingFeeRaw > 0 ? shippingFeeRaw : legacyCourier;
                    const discountTotal = Number(selected?.pricing?.discountTotal || 0);
                    const grandTotal = itemsTotal + shippingFee - discountTotal;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Items Total</span>
                          <span className="font-bold">{money(itemsTotal)}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span className="text-gray-600">Shipping</span>
                          <span className="font-bold">{money(shippingFee)}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span className="text-gray-600">Discount</span>
                          <span className="font-bold">-{money(discountTotal)}</span>
                        </div>
                        <div className="mt-2 flex justify-between border-t pt-2">
                          <span className="font-extrabold text-gray-900">Grand Total</span>
                          <span className="font-extrabold text-gray-900">{money(grandTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <OrderUpdatePanel
                order={selected}
                updating={updating}
                dispatching={dispatching}
                savingShipment={savingShipment}
                deleting={deleting}
                onUpdate={(payload) => updateStatus(payload)}
                onSaveShipment={(payload) => saveShipmentUpdate(payload)}
                onDispatch={(orderNo, courierProvider) => dispatchShipment(orderNo, courierProvider)}
                onDelete={(orderNo) => deleteOrder(orderNo)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function FilterChip({ label }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
      {label}
    </span>
  );
}

function OrderUpdatePanel({
  order,
  updating,
  dispatching,
  savingShipment,
  deleting,
  onUpdate,
  onSaveShipment,
  onDispatch,
  onDelete,
}) {
  const initialCourier = String(order.shipment?.courier || "").trim();
  const [courierOption, setCourierOption] = useState(
    COURIER_OPTIONS.includes(initialCourier) ? initialCourier : "CUSTOM"
  );
  const [customCourier, setCustomCourier] = useState(
    COURIER_OPTIONS.includes(initialCourier) ? "" : initialCourier
  );
  const [trackingId, setTrackingId] = useState(order.shipment?.trackingId || "");
  const [trackingUrl, setTrackingUrl] = useState(order.shipment?.trackingUrl || "");
  const [bookingRef, setBookingRef] = useState(order.shipment?.bookingRef || "");
  const [fulfillmentMode, setFulfillmentMode] = useState(
    order.shipment?.fulfillmentMode || "THIRD_PARTY_COURIER"
  );
  const [courierStatus, setCourierStatus] = useState(
    order.shipment?.courierStatus || "AWAITING_BOOKING"
  );
  const [courierStatusNote, setCourierStatusNote] = useState(
    order.shipment?.courierStatusNote || ""
  );
  const [pickupDate, setPickupDate] = useState(
    order.shipment?.pickupDate
      ? new Date(order.shipment.pickupDate).toISOString().slice(0, 10)
      : ""
  );
  const [notes, setNotes] = useState(order.notes || "");
  const [dispatchProvider, setDispatchProvider] = useState("demo");

  const effectiveCourier =
    courierOption === "CUSTOM" ? customCourier.trim() : courierOption;
  const previewTrackingUrl =
    String(trackingUrl || "").trim() || buildTrackingUrl(effectiveCourier, trackingId);
  const currentStatus = String(order.status || "pending").toLowerCase();
  const nextActions = STATUS_FLOW[currentStatus] || [];
  const canShip = nextActions.includes("shipped");
  const canDispatch = currentStatus === "processing";
  const shipmentTimeline = getShipmentTimeline(order, { includeHidden: true });
  const courierStatusOptions = useMemo(() => {
    const appendCurrentIfMissing = (options) =>
      options.includes(courierStatus) ? options : [...options, courierStatus];

    if (["pending", "confirmed", "processing", "cancelled"].includes(currentStatus)) {
      return appendCurrentIfMissing(NON_SHIPPED_COURIER_STATUSES);
    }
    if (currentStatus === "shipped") {
      return appendCurrentIfMissing(SHIPPED_COURIER_STATUS_OPTIONS);
    }
    return appendCurrentIfMissing(COURIER_STATUS_OPTIONS);
  }, [courierStatus, currentStatus]);
  const workflowHint =
    currentStatus === "pending"
      ? "Step 1: verify the order details before confirming."
      : currentStatus === "confirmed"
      ? "Step 2: move the order into warehouse processing."
      : currentStatus === "processing"
      ? "Step 3: add courier details, then mark the parcel as shipped."
      : currentStatus === "shipped"
      ? "Final delivery step: mark delivered once the customer receives it."
      : currentStatus === "delivered"
      ? "Post-delivery only: use returned if the shipment comes back."
      : "This order is in a closed state.";

  useEffect(() => {
    const nextCourier = String(order.shipment?.courier || "").trim();
    setCourierOption(COURIER_OPTIONS.includes(nextCourier) ? nextCourier : "CUSTOM");
    setCustomCourier(COURIER_OPTIONS.includes(nextCourier) ? "" : nextCourier);
    setTrackingId(order.shipment?.trackingId || "");
    setTrackingUrl(order.shipment?.trackingUrl || "");
    setBookingRef(order.shipment?.bookingRef || "");
    setFulfillmentMode(order.shipment?.fulfillmentMode || "THIRD_PARTY_COURIER");
    setCourierStatus(order.shipment?.courierStatus || "AWAITING_BOOKING");
    setCourierStatusNote(order.shipment?.courierStatusNote || "");
    setPickupDate(
      order.shipment?.pickupDate
        ? new Date(order.shipment.pickupDate).toISOString().slice(0, 10)
        : ""
    );
    setNotes(order.notes || "");
  }, [order]);

  return (
    <div className="premium-card rounded-2xl p-4">
      <div className="mb-3 font-extrabold text-gray-900">Update Order</div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">Current workflow state</label>
          <div className="mt-1 rounded-xl border bg-gray-50 px-3 py-2 text-sm font-semibold capitalize text-gray-900">
            {currentStatus}
          </div>
          <p className="mt-1 text-xs text-gray-500">{workflowHint}</p>
        </div>

        <div className="rounded-xl border bg-gray-50 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Payment Info
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">Method</span>
            <span className="font-semibold text-gray-900">{order.payment?.method || "-"}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">Status</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                String(order.payment?.status || "").toLowerCase() === "paid"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {String(order.payment?.status || "unknown").toUpperCase()}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Fulfillment mode</label>
          <select
            value={fulfillmentMode}
            onChange={(e) => setFulfillmentMode(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          >
            {Object.entries(FULFILLMENT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Courier</label>
          <select
            value={courierOption}
            onChange={(e) => setCourierOption(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          >
            {COURIER_OPTIONS.map((courier) => (
              <option key={courier} value={courier}>
                {courier}
              </option>
            ))}
            <option value="CUSTOM">Other courier</option>
          </select>
          {courierOption === "CUSTOM" ? (
            <input
              value={customCourier}
              onChange={(e) => setCustomCourier(e.target.value)}
              placeholder="Type courier name"
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            />
          ) : null}
          {canShip ? (
            <p className="mt-1 text-xs text-amber-700">Required for shipped status.</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Courier status</label>
          <select
            value={courierStatus}
            onChange={(e) => setCourierStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          >
            {courierStatusOptions.map((value) => (
              <option key={value} value={value}>
                {COURIER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Tracking ID</label>
          <input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Tracking number"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
          {previewTrackingUrl ? (
            <a
              href={previewTrackingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open courier tracking
            </a>
          ) : null}
          {canShip ? (
            <p className="mt-1 text-xs text-amber-700">
              Tracking ID is required before saving shipped status.
            </p>
          ) : null}
        </div>

        <div className="border-t pt-3">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Dispatch details
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Default courier fee: Dhaka 60 BDT, outside Dhaka 100 BDT.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700">Booking Ref / Consignment</label>
              <input
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                placeholder="Courier booking reference"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Pickup Date</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Courier Charge (BDT)</label>
              <div className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {money(order?.pricing?.shippingFee || 0)}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Courier status note</label>
              <textarea
                value={courierStatusNote}
                onChange={(e) => setCourierStatusNote(e.target.value)}
                placeholder="What did the courier update say?"
                className="mt-1 min-h-[72px] w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Tracking URL</label>
              <input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes for this order"
            className="mt-1 min-h-[90px] w-full rounded-xl border px-3 py-2 text-sm"
          />
        </div>

        <div className="border-t pt-3">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Workflow actions
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Real-world admins usually move orders one step at a time instead of jumping straight to a final status.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {nextActions.length === 0 ? (
              <div className="rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-500">
                No further workflow actions are available for this order.
              </div>
            ) : (
              nextActions.map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  disabled={updating}
                  onClick={() =>
                    onUpdate({
                      orderNo: order.orderNo,
                      status: nextStatus,
                      courier: effectiveCourier,
                      trackingId,
                      trackingUrl,
                      bookingRef,
                      fulfillmentMode,
                      courierStatus,
                      courierStatusNote,
                      pickupDate,
                      notes,
                    })
                  }
                  className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
                    updating ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  {updating ? "Updating..." : STATUS_LABELS[nextStatus] || `Move to ${nextStatus}`}
                </button>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={savingShipment}
          onClick={() =>
            onSaveShipment({
              orderNo: order.orderNo,
              courier: effectiveCourier,
              trackingId,
              trackingUrl,
              bookingRef,
              fulfillmentMode,
              courierStatus,
              courierStatusNote,
              pickupDate,
              notes,
            })
          }
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            savingShipment ? "bg-slate-300" : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {savingShipment ? "Saving shipment..." : "Save Courier Update"}
        </button>

        <button
          type="button"
          disabled={dispatching || !canDispatch}
          onClick={() => onDispatch(order.orderNo, dispatchProvider)}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            dispatching
              ? "bg-cyan-300"
              : canDispatch
              ? "bg-cyan-600 hover:bg-cyan-500"
              : "cursor-not-allowed bg-gray-300"
          }`}
        >
          {dispatching ? "Booking shipment..." : "Book Shipment"}
        </button>

        {!canDispatch ? (
          <p className="text-xs text-gray-500">
            Shipment booking becomes available after the order moves to processing.
          </p>
        ) : null}

        <button
          type="button"
          disabled={deleting || !["cancelled", "returned"].includes(String(order?.status || ""))}
          onClick={() => onDelete(order.orderNo)}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            deleting
              ? "bg-red-300"
              : ["cancelled", "returned"].includes(String(order?.status || ""))
              ? "bg-red-600 hover:bg-red-500"
              : "cursor-not-allowed bg-gray-300"
          }`}
        >
          {deleting ? "Deleting order..." : "Delete Order"}
        </button>

        {!["cancelled", "returned"].includes(String(order?.status || "")) ? (
          <p className="text-xs text-gray-500">
            Only cancelled or returned orders can be deleted.
          </p>
        ) : null}

        <div>
          <label className="text-xs font-semibold text-gray-700">Dispatch provider</label>
          <select
            value={dispatchProvider}
            onChange={(e) => setDispatchProvider(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="demo">Demo Courier</option>
            <option value="pathao_sandbox">Pathao Sandbox</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          Ship to:{" "}
          <span className="font-semibold text-gray-800">
            {order.shippingAddress?.division || "-"}, {order.shippingAddress?.district || "-"}
          </span>
        </div>

        <div className="rounded-xl border bg-gray-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            Manual tracking timeline
          </div>
          <div className="mt-3 space-y-3">
            {shipmentTimeline.length === 0 ? (
              <div className="text-sm text-gray-500">No shipment events recorded yet.</div>
            ) : (
              shipmentTimeline.map((event) => (
                <div key={event.id} className="rounded-xl border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{event.label}</div>
                    <div className="text-[11px] text-gray-500">
                      {event.createdAt ? new Date(event.createdAt).toLocaleString() : "-"}
                    </div>
                  </div>
                  {event.details ? (
                    <div className="mt-1 text-xs text-gray-600">{event.details}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
