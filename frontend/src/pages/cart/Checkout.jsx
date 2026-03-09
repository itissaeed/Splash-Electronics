import React, { useMemo, useState, useContext, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { UserContext } from "../context/UserContext";
import { DIVISIONS, DISTRICTS_BY_DIVISION, UPAZILAS_BY_DISTRICT } from "../../data/bdLocations";

const tokenHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;
const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCouponCode = location?.state?.couponCode || "";
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
  const [deliveryOption, setDeliveryOption] = useState("STANDARD");
  const [cartTotals, setCartTotals] = useState({ itemsTotal: 0, itemCount: 0 });
  const [shippingQuote, setShippingQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [couponCode, setCouponCode] = useState(initialCouponCode);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponState, setCouponState] = useState(null);
  const formRef = useRef(null);

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

  useEffect(() => {
    const fetchCartTotals = async () => {
      try {
        const { data } = await api.get("/cart", { headers: tokenHeader() });
        const items = Array.isArray(data?.items) ? data.items : [];
        const itemsTotal = items.reduce(
          (sum, item) => sum + Number(item?.priceAtAdd || 0) * Number(item?.qty || 0),
          0
        );
        const itemCount = items.reduce((sum, item) => sum + Number(item?.qty || 0), 0);
        setCartTotals({ itemsTotal, itemCount });
      } catch (err) {
        setCartTotals({ itemsTotal: 0, itemCount: 0 });
      }
    };

    fetchCartTotals();
  }, []);

  useEffect(() => {
    const loadQuote = async () => {
      if (!shippingAddress.division) {
        setShippingQuote(null);
        return;
      }

      setQuoteLoading(true);
      try {
        const { data } = await api.post("/shipping/quote", {
          division: shippingAddress.division,
          district: shippingAddress.district,
          itemsTotal: cartTotals.itemsTotal,
          deliveryOption,
        });
        setShippingQuote(data || null);
      } catch (err) {
        setShippingQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    loadQuote();
  }, [shippingAddress.division, shippingAddress.district, cartTotals.itemsTotal, deliveryOption]);

  const validateCouponCode = useCallback(async (codeOverride) => {
    const code = String(codeOverride ?? couponCode).trim();
    if (!code) {
      setCouponState(null);
      return null;
    }

    try {
      setCouponLoading(true);
      const { data } = await api.post(
        "/orders/validate-coupon",
        {
          couponCode: code,
          shippingAddress,
          deliveryOption,
        },
        { headers: tokenHeader() }
      );

      const nextState = {
        valid: true,
        message: `${data?.coupon?.code || code} applied successfully.`,
        coupon: data?.coupon || null,
        totals: data?.totals || null,
      };
      setCouponState(nextState);
      return nextState;
    } catch (err) {
      const nextState = {
        valid: false,
        message: err?.response?.data?.message || "Coupon could not be applied.",
      };
      setCouponState(nextState);
      return nextState;
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, shippingAddress, deliveryOption]);

  useEffect(() => {
    if (!couponCode.trim()) {
      setCouponState(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      validateCouponCode();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [couponCode, shippingAddress.division, shippingAddress.district, deliveryOption, cartTotals.itemsTotal, validateCouponCode]);

  const canSubmit = useMemo(() => {
    const hasValidPhone = BD_PHONE_REGEX.test(shippingAddress.phone.trim());
    return (
      shippingAddress.recipientName.trim() &&
      hasValidPhone &&
      shippingAddress.division.trim() &&
      shippingAddress.district.trim() &&
      shippingAddress.addressLine1.trim() &&
      !quoteLoading &&
      !loading
    );
  }, [shippingAddress, quoteLoading, loading]);

  const discountTotal = Number(couponState?.valid ? couponState?.totals?.discountTotal : 0);
  const shippingFee = Number(
    couponState?.valid
      ? couponState?.totals?.shippingFee
      : shippingQuote?.shippingFee || 0
  );
  const grandTotal = Number(
    couponState?.valid
      ? couponState?.totals?.grandTotal
      : cartTotals.itemsTotal + shippingFee
  );

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
      if (paymentMethod === "SSLCOMMERZ") {
        const { data } = await api.post(
          "/payments/sslcommerz/init",
          {
            shippingAddress,
            deliveryOption,
            couponCode: couponState?.valid ? couponState?.coupon?.code || couponCode : undefined,
          },
          { headers: tokenHeader() }
        );

        if (data?.gatewayUrl) {
          window.location.href = data.gatewayUrl;
          return;
        }

        throw new Error("Failed to start payment session");
      } else {
        const { data } = await api.post(
          "/orders",
          {
            shippingAddress,
            paymentMethod,
            deliveryOption,
            couponCode: couponState?.valid ? couponState?.coupon?.code || couponCode : undefined,
          },
          { headers: tokenHeader() }
        );

        // data is the created order
        navigate(`/order-success/${data.orderNo}`);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to place order";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFormKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target;
    if (target.tagName === "TEXTAREA") return;
    if (target.type === "submit") return;
    if (!formRef.current) return;

    const focusables = Array.from(
      formRef.current.querySelectorAll(
        "input:not([type='hidden']), select, textarea, button"
      )
    ).filter((el) => !el.disabled && el.tabIndex !== -1);

    const idx = focusables.indexOf(target);
    if (idx === -1) return;
    const next = focusables[idx + 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div className="page-ambient min-h-screen relative overflow-hidden">
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute top-40 -left-16 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />

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
          <div
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
            aria-live="polite"
          >
            {errMsg}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <form
            ref={formRef}
            onSubmit={placeOrder}
            onKeyDown={handleFormKeyDown}
            className="premium-card rounded-3xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-700">Step 1</div>
                <h2 className="mt-2 text-xl font-extrabold text-gray-900">Shipping details</h2>
                <p className="text-sm text-gray-500">We will use this address to deliver your order safely.</p>
              </div>
              <div className="hidden sm:block rounded-2xl bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700">
                Delivery address
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Recipient name *</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="recipientName"
                  value={shippingAddress.recipientName}
                  onChange={handleChange}
                  placeholder="Full name"
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={!shippingAddress.recipientName.trim()}
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600">Phone *</span>
                <input
                  className="rounded-2xl border border-gray-200 px-3 py-2.5 w-full bg-white outline-none focus:ring-2 focus:ring-cyan-400"
                  name="phone"
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  aria-required="true"
                  aria-invalid={
                    shippingAddress.phone.trim()
                      ? !BD_PHONE_REGEX.test(shippingAddress.phone.trim())
                      : true
                  }
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
                  aria-required="true"
                  aria-invalid={!shippingAddress.division.trim()}
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
                  aria-required="true"
                  aria-invalid={shippingAddress.division ? !shippingAddress.district.trim() : false}
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
                  inputMode="numeric"
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
                aria-required="true"
                aria-invalid={!shippingAddress.addressLine1.trim()}
                autoComplete="address-line1"
              />
            </label>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-700">Step 2</div>
                  <div className="mt-2 text-lg font-extrabold text-gray-900">Delivery option</div>
                </div>
                {couponState?.valid ? (
                  <div className="rounded-2xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                    Coupon applied: {couponState?.coupon?.code || couponCode}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Coupon code
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponState(null);
                    }}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => validateCouponCode()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
                  >
                    {couponLoading ? "Checking..." : "Apply"}
                  </button>
                </div>
                {couponState ? (
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      couponState.valid ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {couponState.message}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Valid coupons update your order total before payment.
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { value: "STANDARD", label: "Standard Delivery", eta: "Estimated 2-6 days" },
                  { value: "EXPRESS", label: "Express Delivery", eta: "Estimated 1-4 days" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2 cursor-pointer text-sm font-semibold ${
                      deliveryOption === option.value
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-gray-200 text-gray-700 hover:border-cyan-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryOption"
                      value={option.value}
                      checked={deliveryOption === option.value}
                      onChange={() => setDeliveryOption(option.value)}
                    />
                    <span>
                      {option.label}
                      <span className="ml-2 text-xs font-medium text-gray-500">{option.eta}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-[0.2em]">
                  Live delivery quote
                </div>
                {quoteLoading ? (
                  <p className="mt-2 text-sm text-slate-500">Updating delivery estimate...</p>
                ) : shippingQuote ? (
                  <div className="mt-2 text-sm text-slate-700 space-y-1">
                    <div>Delivery fee: <span className="font-semibold">{money(shippingQuote.shippingFee)}</span></div>
                    <div>
                      Estimated delivery: {shippingQuote.estimatedDaysMin}-{shippingQuote.estimatedDaysMax} days
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Select a division to get a delivery quote.</p>
                )}
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-700">Step 3</div>
                <div className="mt-2 text-lg font-extrabold text-gray-900">Payment method</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { value: "COD", label: "Cash on Delivery" },
                  { value: "SSLCOMMERZ", label: "Online Payment (SSLCOMMERZ)" },
                ].map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2 cursor-pointer text-sm font-semibold ${
                      paymentMethod === m.value
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-gray-200 text-gray-700 hover:border-cyan-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.value}
                      checked={paymentMethod === m.value}
                      onChange={() => setPaymentMethod(m.value)}
                    />
                    <span>{m.label}</span>
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
            {!BD_PHONE_REGEX.test(shippingAddress.phone.trim()) && (
              <p className="text-xs text-red-600">
                Use a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.
              </p>
            )}
          </form>

          <aside className="space-y-4">
            <div className="premium-card rounded-3xl p-5">
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
                <div>Mode: {deliveryOption === "EXPRESS" ? "Express delivery" : "Standard delivery"}</div>
              </div>
              <div className="mt-4 border-t pt-3 space-y-1 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Items ({cartTotals.itemCount})</span>
                  <span>{money(cartTotals.itemsTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span>
                    {quoteLoading
                      ? "Calculating..."
                      : shippingAddress.division
                      ? money(shippingFee)
                      : "Select division"}
                  </span>
                </div>
                {discountTotal > 0 ? (
                  <div className="flex items-center justify-between text-green-700">
                    <span>Coupon discount</span>
                    <span>-{money(discountTotal)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span>Estimated total</span>
                  <span>{money(grandTotal)}</span>
                </div>
                {shippingQuote && (
                  <div className="text-xs text-gray-500 pt-1">
                    ETA: {shippingQuote.estimatedDaysMin}-{shippingQuote.estimatedDaysMax} days
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-900/10 bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-5">
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
