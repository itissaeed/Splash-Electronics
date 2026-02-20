import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [couponCode, setCouponCode] = useState("");
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
      (sum, it) =>
        sum + Number(it.priceAtAdd || 0) * Number(it.qty || 0),
      0
    );
  }, [cart]);

  const changeQty = async (itemId, qty) => {
    if (qty < 1) return;
    try {
      await api.put(
        `/cart/items/${itemId}`,
        { qty },
        { headers: tokenHeader() }
      );
      await fetchCart();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update quantity");
    }
  };

  const removeItem = async (itemId) => {
    if (!window.confirm("Remove this item from cart?")) return;
    try {
      await api.delete(`/cart/items/${itemId}`, {
        headers: tokenHeader(),
      });
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

  const goCheckout = () => {
    const code = couponCode.trim();
    navigate("/checkout", { state: { couponCode: code || "" } });
  };

  if (loading)
    return <div className="p-6 text-gray-600">Loading cart…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="font-semibold hover:text-indigo-600">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800">Cart</span>
      </div>

      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Your Cart
          </h1>
          <p className="text-sm text-gray-500">
            Review items before checkout
          </p>
        </div>

        <div className="flex gap-3">
          {cart?.items?.length > 0 && (
            <button
              onClick={clearCart}
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Clear cart
            </button>
          )}
          <Link
            to="/products"
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            Continue shopping →
          </Link>
        </div>
      </div>

      {!cart?.items?.length ? (
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="text-gray-900 font-bold">
            Cart is empty
          </div>
          <Link
            to="/products"
            className="mt-3 inline-block rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 bg-white border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b font-extrabold text-gray-900">
              Items
            </div>
            <div className="divide-y">
              {cart.items.map((it) => {
                const variant = Array.isArray(it?.product?.variants)
                  ? it.product.variants.find(
                      (v) =>
                        String(v?._id) ===
                        String(it?.variantId)
                    )
                  : null;

                const image =
                  it?.imageSnapshot ||
                  variant?.images?.[0]?.url ||
                  "https://via.placeholder.com/96";

                const name =
                  it?.nameSnapshot ||
                  it?.product?.name ||
                  "Product";

                const sku =
                  it?.skuSnapshot ||
                  variant?.sku ||
                  "-";

                return (
                  <div key={it._id} className="p-4 flex gap-4">
                    <img
                      src={image}
                      alt={name}
                      className="h-24 w-24 rounded-xl object-cover border"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 line-clamp-2">
                        {name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        SKU: {sku}
                      </div>

                      <div className="mt-2 font-extrabold text-indigo-600">
                        {money(it.priceAtAdd)}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() =>
                            changeQty(it._id, it.qty - 1)
                          }
                          className="h-9 w-9 rounded-xl border hover:bg-gray-50"
                        >
                          −
                        </button>

                        <div className="h-9 min-w-[44px] rounded-xl border flex items-center justify-center font-bold">
                          {it.qty}
                        </div>

                        <button
                          onClick={() =>
                            changeQty(it._id, it.qty + 1)
                          }
                          className="h-9 w-9 rounded-xl border hover:bg-gray-50"
                        >
                          +
                        </button>

                        <button
                          onClick={() => removeItem(it._id)}
                          className="ml-auto rounded-xl border px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        Subtotal
                      </div>
                      <div className="font-extrabold text-gray-900">
                        {money(
                          Number(it.priceAtAdd || 0) *
                            Number(it.qty || 0)
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border rounded-2xl p-5 h-fit">
            <div className="font-extrabold text-gray-900">
              Summary
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Items total
                </span>
                <span className="font-bold text-gray-900">
                  {money(itemsTotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Shipping
                </span>
                <span className="font-bold text-gray-900">
                  {money(0)}
                </span>
              </div>

              <div className="pt-2 border-t flex justify-between">
                <span className="font-extrabold text-gray-900">
                  Estimated total
                </span>
                <span className="font-extrabold text-gray-900">
                  {money(itemsTotal)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-700">
                Coupon (optional)
              </label>
              <input
                value={couponCode}
                onChange={(e) =>
                  setCouponCode(e.target.value)
                }
                placeholder="e.g. SAVE200"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                Coupon is validated when creating order.
              </p>
            </div>

            <button
              onClick={goCheckout}
              className="mt-4 w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-500"
            >
              Proceed to Checkout
            </button>

            <p className="mt-3 text-xs text-gray-500">
              COD supported nationwide in Bangladesh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
