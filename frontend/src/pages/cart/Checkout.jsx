import React, { useMemo, useState, useContext, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { UserContext } from "../context/UserContext";
import { DIVISIONS, DISTRICTS_BY_DIVISION, UPAZILAS_BY_DISTRICT } from "../../data/bdLocations";

const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const couponCode = location?.state?.couponCode || "";
  const { user } = useContext(UserContext);

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

  const districts = useMemo(
    () => DISTRICTS_BY_DIVISION[shippingAddress.division] || [],
    [shippingAddress.division]
  );

  const divisionOptions = useMemo(() => {
    const list = [...DIVISIONS];
    if (shippingAddress.division && !list.includes(shippingAddress.division)) {
      list.unshift(shippingAddress.division);
    }
    return list;
  }, [shippingAddress.division]);

  const districtOptions = useMemo(() => {
    const list = [...districts];
    if (shippingAddress.district && !list.includes(shippingAddress.district)) {
      list.unshift(shippingAddress.district);
    }
    return list;
  }, [districts, shippingAddress.district]);

  const upazilas = useMemo(
    () => UPAZILAS_BY_DISTRICT[shippingAddress.district] || [],
    [shippingAddress.district]
  );

  const defaultAddress = useMemo(() => {
    if (!user?.addresses?.length) return null;
    return user.addresses.find((addr) => addr.isDefault) || user.addresses[0];
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setShippingAddress((prev) => {
      const next = { ...prev };

      if (!prev.recipientName.trim() && user?.name) next.recipientName = user.name;
      if (!prev.phone.trim() && user?.number) next.phone = user.number;

      if (defaultAddress) {
        if (!prev.division.trim()) next.division = defaultAddress.division || "";
        if (!prev.district.trim()) next.district = defaultAddress.district || "";
        if (!prev.upazila.trim()) next.upazila = defaultAddress.upazila || "";
        if (!prev.area.trim()) next.area = defaultAddress.area || "";
        if (!prev.postalCode.trim()) next.postalCode = defaultAddress.postalCode || "";
        if (!prev.addressLine1.trim()) next.addressLine1 = defaultAddress.addressLine1 || "";
        if (!prev.addressLine2.trim()) next.addressLine2 = defaultAddress.addressLine2 || "";
      }

      return next;
    });
  }, [user, defaultAddress]);

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

  const handleDivisionChange = (e) => {
    const division = e.target.value;
    setShippingAddress((prev) => ({
      ...prev,
      division,
      district: "",
      upazila: "",
    }));
  };

  const handleDistrictChange = (e) => {
    const district = e.target.value;
    setShippingAddress((prev) => ({
      ...prev,
      district,
      upazila: "",
    }));
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
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute top-40 -left-16 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-3xl border border-cyan-900/10 bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-cyan-200">Checkout</div>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold">Finish your order</h1>
              <p className="mt-2 text-sm text-cyan-100">
                Fast delivery across Bangladesh. Confirm your shipping details below.
              </p>
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
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <div className="text-xs text-cyan-200">Secure checkout</div>
              <div className="text-lg font-extrabold">Trusted by tech lovers</div>
            </div>
          </div>
        </div>

        {errMsg && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errMsg}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <form onSubmit={placeOrder} className="bg-white border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-700">Step 1</div>
                <h2 className="mt-2 text-xl font-extrabold text-gray-900">Shipping details</h2>
                <p className="text-sm text-gray-500">We’ll use this to deliver your order safely.</p>
              </div>
              <div className="hidden sm:block rounded-2xl bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700">
                Delivery address
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Recipient name</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="recipientName"
                  value={shippingAddress.recipientName}
                  onChange={handleChange}
                  placeholder="Full name (optional)"
                  autoComplete="name"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Phone</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="phone"
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Division *</span>
                <select
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="division"
                  value={shippingAddress.division}
                  onChange={handleDivisionChange}
                  required
                >
                  <option value="" disabled>
                    Select division
                  </option>
                  {divisionOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">District *</span>
                <select
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="district"
                  value={shippingAddress.district}
                  onChange={handleDistrictChange}
                  required
                  disabled={!shippingAddress.division}
                >
                  <option value="" disabled>
                    {shippingAddress.division ? "Select district" : "Select division first"}
                  </option>
                  {districtOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Upazila</span>
                <select
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="upazila"
                  value={shippingAddress.upazila}
                  onChange={handleChange}
                  disabled={!shippingAddress.district}
                >
                  <option value="">
                    {shippingAddress.district ? "Select upazila" : "Select district first"}
                  </option>
                  {upazilas.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Area</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="area"
                  value={shippingAddress.area}
                  onChange={handleChange}
                  placeholder="Local area"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Postal Code</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="postalCode"
                  value={shippingAddress.postalCode}
                  onChange={handleChange}
                  placeholder="Postal code (optional)"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Address line 2</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="addressLine2"
                  value={shippingAddress.addressLine2}
                  onChange={handleChange}
                  placeholder="Apartment, floor, etc. (optional)"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-gray-600">Address line *</span>
              <input
                className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                name="addressLine1"
                value={shippingAddress.addressLine1}
                onChange={handleChange}
                placeholder="House/road/village details"
                required
              />
            </label>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-700">Step 2</div>
                  <div className="mt-2 text-lg font-extrabold text-gray-900">Payment method</div>
                </div>
                {couponCode && (
                  <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    Coupon applied: {couponCode}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {["COD", "BKASH", "NAGAD", "CARD", "BANK"].map((m) => (
                  <label
                    key={m}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2 cursor-pointer text-sm font-semibold ${
                      paymentMethod === m
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-gray-200 text-gray-700 hover:border-cyan-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m}
                      checked={paymentMethod === m}
                      onChange={() => setPaymentMethod(m)}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                canSubmit
                  ? "bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:via-sky-500 hover:to-indigo-500"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              {loading ? "Placing order..." : "Place Order"}
            </button>
          </form>

          <aside className="space-y-4">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-700">Delivering to</div>
              <div className="mt-2 text-lg font-extrabold text-gray-900">
                {shippingAddress.district || "Select district"}
              </div>
              <div className="text-sm text-gray-500">
                {shippingAddress.division || "Select division"}
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>Address: {shippingAddress.addressLine1 || "Add address line"}</div>
                <div>Phone: {shippingAddress.phone || "Add phone"}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-900/10 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-700">Why choose us</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>Verified tech products and warranty support.</li>
                <li>Fast nationwide delivery with careful packaging.</li>
                <li>Friendly support for tracking and returns.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
