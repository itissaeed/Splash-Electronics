import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const couponCode = location?.state?.couponCode || "";

  const [shippingAddress, setShippingAddress] = useState({
    recipientName: "",
    phone: "",
    division: "",
    district: "",
    upazila: "",
    area: "",
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const canSubmit = useMemo(() => {
    return (
      shippingAddress.division.trim() &&
      shippingAddress.district.trim() &&
      shippingAddress.addressLine1.trim() &&
      !loading
    );
  }, [shippingAddress, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((p) => ({ ...p, [name]: value }));
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);

    try {
      const { data } = await api.post(
        "/orders",
        { shippingAddress, paymentMethod, couponCode: couponCode || undefined },
        { headers: tokenHeader() }
      );

      // data is the created order
      navigate(`/order-success/${data.orderNo}`);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to place order";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Checkout</h1>
        <p className="text-sm text-gray-500">Enter shipping address and confirm payment</p>
      </div>

      {errMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      <form onSubmit={placeOrder} className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="rounded-xl border px-3 py-2" name="recipientName" value={shippingAddress.recipientName} onChange={handleChange} placeholder="Recipient name (optional)" />
          <input className="rounded-xl border px-3 py-2" name="phone" value={shippingAddress.phone} onChange={handleChange} placeholder="Phone (optional)" />
          <input className="rounded-xl border px-3 py-2" name="division" value={shippingAddress.division} onChange={handleChange} placeholder="Division *" required />
          <input className="rounded-xl border px-3 py-2" name="district" value={shippingAddress.district} onChange={handleChange} placeholder="District *" required />
          <input className="rounded-xl border px-3 py-2" name="upazila" value={shippingAddress.upazila} onChange={handleChange} placeholder="Upazila (optional)" />
          <input className="rounded-xl border px-3 py-2" name="area" value={shippingAddress.area} onChange={handleChange} placeholder="Area (optional)" />
          <input className="rounded-xl border px-3 py-2" name="postalCode" value={shippingAddress.postalCode} onChange={handleChange} placeholder="Postal Code (optional)" />
          <input className="rounded-xl border px-3 py-2" name="addressLine2" value={shippingAddress.addressLine2} onChange={handleChange} placeholder="Address line 2 (optional)" />
        </div>

        <input
          className="rounded-xl border px-3 py-2 w-full"
          name="addressLine1"
          value={shippingAddress.addressLine1}
          onChange={handleChange}
          placeholder="Address line 1 *"
          required
        />

        <div className="pt-4 border-t">
          <div className="font-extrabold text-gray-900 mb-2">Payment Method</div>
          <div className="flex flex-wrap gap-3">
            {["COD", "BKASH", "NAGAD", "CARD", "BANK"].map((m) => (
              <label key={m} className="flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m}
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                />
                <span className="text-sm font-semibold text-gray-800">{m}</span>
              </label>
            ))}
          </div>

          {couponCode && (
            <div className="mt-3 text-sm text-gray-600">
              Coupon: <span className="font-bold text-gray-900">{couponCode}</span> (validated on order creation)
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white ${
            canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Placing order..." : "Place Order"}
        </button>
      </form>
    </div>
  );
}
