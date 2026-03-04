import React, { useEffect, useMemo, useState } from "react";
import api from "../../../utils/api";
import { buildTrackingUrl } from "../../../utils/shipmentTracking";

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const COURIER_OPTIONS = ["Pathao", "RedX", "Sundarban", "eCourier", "Steadfast"];
const STATUS_FLOW = {
  pending: ["pending", "confirmed", "processing", "shipped", "cancelled"],
  confirmed: ["confirmed", "processing", "shipped", "cancelled"],
  processing: ["processing", "shipped", "cancelled"],
  shipped: ["shipped", "delivered", "returned"],
  delivered: ["delivered", "returned"],
  cancelled: ["cancelled"],
  returned: ["returned"],
};

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
  const [dispatching, setDispatching] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const updateStatus = async ({
    orderNo,
    status,
    courier,
    trackingId,
    trackingUrl,
    bookingRef,
    pickupDate,
    notes,
  }) => {
    const normalizedCourier = String(courier || "").trim();
    const normalizedTrackingId = String(trackingId || "").trim();
    if (status === "shipped" && (!normalizedCourier || !normalizedTrackingId)) {
      alert("To mark as shipped, please provide both courier name and tracking ID.");
      return;
    }

    try {
      setUpdating(true);
      await api.put(
        `/admin/orders/${orderNo}/status`,
        {
          status,
          courier: normalizedCourier,
          trackingId: normalizedTrackingId,
          trackingUrl: String(trackingUrl || "").trim(),
          bookingRef: String(bookingRef || "").trim(),
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
	                      {(() => {
	                        const itemsTotal = Number(o?.pricing?.itemsTotal || 0);
	                        const shippingFee = Number(o?.pricing?.shippingFee || 0);
	                        const legacyCourier = Number(o?.shipment?.courierCharge || 0);
	                        const effectiveShipping = shippingFee > 0 ? shippingFee : legacyCourier;
	                        const discountTotal = Number(o?.pricing?.discountTotal || 0);
	                        return money(itemsTotal + effectiveShipping - discountTotal);
	                      })()}
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
          <div className="w-full max-w-3xl bg-white rounded-2xl border shadow-xl max-h-[90vh] overflow-y-auto">
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
                    <span className="font-bold">
                      {money(itemsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-bold">
                      {money(shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-bold">
                      -{money(discountTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t">
                    <span className="text-gray-900 font-extrabold">
                      Grand Total
                    </span>
                    <span className="text-gray-900 font-extrabold">
                      {money(grandTotal)}
                    </span>
                  </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Right: status update */}
              <OrderUpdatePanel
                order={selected}
                updating={updating}
                dispatching={dispatching}
                deleting={deleting}
                onUpdate={(payload) => updateStatus(payload)}
                onDispatch={(orderNo, courierProvider) =>
                  dispatchShipment(orderNo, courierProvider)
                }
                onDelete={(orderNo) => deleteOrder(orderNo)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderUpdatePanel({
  order,
  updating,
  dispatching,
  deleting,
  onUpdate,
  onDispatch,
  onDelete,
}) {
  const [status, setStatus] = useState(order.status || "pending");
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
  const statusOptions = STATUS_FLOW[currentStatus] || [currentStatus];

  useEffect(() => {
    setStatus(order.status || "pending");
    const nextCourier = String(order.shipment?.courier || "").trim();
    setCourierOption(COURIER_OPTIONS.includes(nextCourier) ? nextCourier : "CUSTOM");
    setCustomCourier(COURIER_OPTIONS.includes(nextCourier) ? "" : nextCourier);
    setTrackingId(order.shipment?.trackingId || "");
    setTrackingUrl(order.shipment?.trackingUrl || "");
    setBookingRef(order.shipment?.bookingRef || "");
    setPickupDate(
      order.shipment?.pickupDate
        ? new Date(order.shipment.pickupDate).toISOString().slice(0, 10)
        : ""
    );
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
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Allowed transitions are limited by current status.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Courier</label>
          <select
            value={courierOption}
            onChange={(e) => setCourierOption(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
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
          {status === "shipped" ? (
            <p className="mt-1 text-xs text-amber-700">
              Required for shipped status.
            </p>
          ) : null}
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
          {previewTrackingUrl ? (
            <a
              href={previewTrackingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open tracking link
            </a>
          ) : null}
          {status === "shipped" ? (
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
                {money(order?.pricing?.shippingFee || 0)} (same as shipping fee)
              </div>
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
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm min-h-[90px]"
          />
        </div>

        <button
          disabled={updating}
          onClick={() =>
              onUpdate({
                orderNo: order.orderNo,
                status,
                courier: effectiveCourier,
                trackingId,
                trackingUrl,
                bookingRef,
                pickupDate,
                notes,
              })
          }
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            updating ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {updating ? "Updating..." : "Save Changes"}
        </button>
        <button
          type="button"
          disabled={dispatching}
          onClick={() => onDispatch(order.orderNo, dispatchProvider)}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            dispatching ? "bg-cyan-300" : "bg-cyan-600 hover:bg-cyan-500"
          }`}
        >
          {dispatching ? "Booking shipment..." : "Book Shipment"}
        </button>
        <button
          type="button"
          disabled={deleting || !["cancelled", "returned"].includes(String(order?.status || ""))}
          onClick={() => onDelete(order.orderNo)}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            deleting
              ? "bg-red-300"
              : ["cancelled", "returned"].includes(String(order?.status || ""))
              ? "bg-red-600 hover:bg-red-500"
              : "bg-gray-300 cursor-not-allowed"
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
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
          >
            <option value="demo">Demo Courier</option>
            <option value="pathao_sandbox">Pathao Sandbox</option>
          </select>
        </div>

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
