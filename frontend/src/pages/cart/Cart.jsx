import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="h-36 rounded-3xl bg-gradient-to-r from-sky-900 via-cyan-800 to-sky-900 animate-pulse" />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5 animate-pulse h-80" />
        <div className="rounded-2xl border bg-white p-5 animate-pulse h-80" />
      </div>
    </div>
  );
}

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponStatus, setCouponStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/cart", { headers: tokenHeader() });
      setCart(data);
    } catch (e) {
      console.error(e);
      alert("Failed to load cart. Check /api/cart route + token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const itemsTotal = useMemo(() => {
    if (!cart?.items?.length) return 0;
    return cart.items.reduce(
      (sum, it) => sum + Number(it.priceAtAdd || 0) * Number(it.qty || 0),
      0
    );
  }, [cart]);

  const itemUnits = useMemo(() => {
    return cart?.items?.reduce((sum, it) => sum + Number(it.qty || 0), 0) || 0;
  }, [cart]);

  const changeQty = async (itemId, qty) => {
    if (qty < 1) return;
    try {
      await api.put(`/cart/items/${itemId}`, { qty }, { headers: tokenHeader() });
      await fetchCart();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update quantity");
    }
  };

  const removeItem = async (itemId) => {
    if (!window.confirm("Remove this item from cart?")) return;
    try {
      await api.delete(`/cart/items/${itemId}`, { headers: tokenHeader() });
      await fetchCart();
    } catch (e) {
      console.error(e);
      alert("Failed to remove item");
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Clear entire cart?")) return;
    try {
      await api.delete("/cart", { headers: tokenHeader() });
      await fetchCart();
    } catch (e) {
      console.error(e);
      alert("Failed to clear cart");
    }
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponStatus(null);
      return;
    }

    try {
      setCouponLoading(true);
      const { data } = await api.post(
        "/orders/validate-coupon",
        { couponCode: code },
        { headers: tokenHeader() }
      );
      setCouponStatus({
        valid: true,
        message: `${data?.coupon?.code || code} applied successfully.`,
        coupon: data?.coupon || null,
        totals: data?.totals || null,
      });
    } catch (e) {
      setCouponStatus({
        valid: false,
        message: e?.response?.data?.message || "Coupon could not be applied.",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const goCheckout = () => {
    const code = couponStatus?.valid ? couponStatus?.coupon?.code || couponCode.trim() : couponCode.trim();
    navigate("/checkout", { state: { couponCode: code || "" } });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-ambient min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <section className="rounded-3xl border border-cyan-900/20 bg-gradient-to-r from-sky-900 via-cyan-800 to-sky-900 text-white shadow-xl">
          <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Shopping Cart</div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">Ready to check out?</h1>
              <p className="mt-2 text-sm text-cyan-100">
                {itemUnits} unit(s) across {cart?.items?.length || 0} product(s)
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <div className="text-xs text-cyan-100">Estimated total</div>
              <div className="text-xl font-extrabold">{money(itemsTotal)}</div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Link to="/" className="font-semibold hover:text-cyan-700">Home</Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">Cart</span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/products" className="font-semibold text-cyan-700 hover:underline">
              Continue shopping --
            </Link>
            {cart?.items?.length > 0 && (
              <button
                onClick={clearCart}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-50"
              >
                Clear cart
              </button>
            )}
          </div>
        </div>

        {!cart?.items?.length ? (
          <section className="premium-card mt-6 rounded-3xl p-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-cyan-50 border border-cyan-100" />
            <h2 className="mt-4 text-xl font-extrabold text-gray-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-gray-500">Find something you love and it will appear here.</p>
            <Link
              to="/products"
              className="mt-5 inline-block rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-600"
            >
              Explore products
            </Link>
          </section>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="premium-card lg:col-span-2 rounded-3xl overflow-hidden">
              <div className="border-b px-5 py-4 font-extrabold text-gray-900">Cart items</div>
              <div className="divide-y">
                {cart.items.map((it) => {
                  const variant = Array.isArray(it?.product?.variants)
                    ? it.product.variants.find((v) => String(v?._id) === String(it?.variantId))
                    : null;

                  const image =
                    it?.imageSnapshot || variant?.images?.[0]?.url || "https://via.placeholder.com/96";
                  const name = it?.nameSnapshot || it?.product?.name || "Product";
                  const sku = it?.skuSnapshot || variant?.sku || "-";
                  const lineTotal = Number(it.priceAtAdd || 0) * Number(it.qty || 0);

                  return (
                    <article key={it._id} className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                      <img
                        src={image}
                        alt={name}
                        className="h-24 w-24 rounded-2xl border object-cover bg-gray-50"
                      />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 line-clamp-2">{name}</h3>
                        <p className="mt-1 text-xs text-gray-500">SKU: {sku}</p>
                        <p className="mt-2 text-sm font-extrabold text-cyan-700">{money(it.priceAtAdd)}</p>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => changeQty(it._id, it.qty - 1)}
                            className="h-9 w-9 rounded-xl border border-gray-200 font-bold hover:bg-gray-50"
                          >
                            -
                          </button>
                          <div className="h-9 min-w-[44px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center font-bold">
                            {it.qty}
                          </div>
                          <button
                            onClick={() => changeQty(it._id, it.qty + 1)}
                            className="h-9 w-9 rounded-xl border border-gray-200 font-bold hover:bg-gray-50"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItem(it._id)}
                            className="ml-auto rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-xs text-gray-500">Subtotal</div>
                        <div className="text-lg font-extrabold text-gray-900">{money(lineTotal)}</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="premium-card rounded-3xl p-5 h-fit lg:sticky lg:top-24">
              <div className="text-lg font-extrabold text-gray-900">Order summary</div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items total</span>
                  <span className="font-bold text-gray-900">{money(itemsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-bold text-gray-900">{money(0)}</span>
                </div>
                {couponStatus?.valid && couponStatus?.totals?.discountTotal > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-bold text-green-700">
                      -{money(couponStatus.totals.discountTotal)}
                    </span>
                  </div>
                ) : null}
                <div className="pt-3 mt-3 border-t flex justify-between">
                  <span className="font-extrabold text-gray-900">Estimated total</span>
                  <span className="font-extrabold text-cyan-700">
                    {money(couponStatus?.valid ? couponStatus?.totals?.grandTotal : itemsTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-semibold text-gray-700">Coupon code</label>
                <input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponStatus(null);
                  }}
                  placeholder="e.g. SAVE200"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-50"
                  >
                    {couponLoading ? "Checking..." : "Apply"}
                  </button>
                  {couponStatus?.valid ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCouponCode("");
                        setCouponStatus(null);
                      }}
                      className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {couponStatus ? (
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      couponStatus.valid ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {couponStatus.message}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">Apply a code here to preview the discount.</p>
                )}
                {couponStatus?.valid && couponStatus?.totals ? (
                  <div className="mt-3 rounded-2xl border border-green-100 bg-green-50 p-3 text-xs text-green-900">
                    Estimated discount: {money(couponStatus.totals.discountTotal)}
                  </div>
                ) : null}
              </div>

              <button
                onClick={goCheckout}
                className="mt-5 w-full rounded-xl bg-cyan-700 py-3 text-sm font-semibold text-white hover:bg-cyan-600"
              >
                Proceed to checkout
              </button>

              <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-xs text-gray-600">
                Secure checkout. Cash on delivery supported nationwide in Bangladesh.
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
