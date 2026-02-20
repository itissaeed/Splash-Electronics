import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

const chip = (text) => (
  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700">
    {text}
  </span>
);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeAttributeEntries(attributes) {
  if (!attributes) return [];
  if (attributes instanceof Map) {
    return Array.from(attributes.entries()).filter(
      ([k, v]) => k && String(v || "").trim()
    );
  }
  if (typeof attributes === "object") {
    return Object.entries(attributes).filter(
      ([k, v]) => k && String(v || "").trim()
    );
  }
  return [];
}

function prettyAttrKey(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function VariantLabel({ v }) {
  const parts = normalizeAttributeEntries(v?.attributes)
    .slice(0, 3)
    .map(([k, val]) => `${prettyAttrKey(k)}: ${val}`);
  return (
    <span className="text-sm font-semibold">
      {parts.length ? parts.join(" / ") : v?.sku || "Variant"}
    </span>
  );
}

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [activeImg, setActiveImg] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        setProduct(data || null);

        const defaultVariant =
          data?.variants?.find((x) => x?.isDefault) ||
          data?.variants?.find((x) => (x?.countInStock ?? 0) > 0) ||
          data?.variants?.[0] ||
          null;

        setSelectedVariantId(defaultVariant?._id || "");

        const firstImg =
          defaultVariant?.images?.[0]?.url ||
          data?.images?.[0]?.url ||
          fallbackImg;

        setActiveImg(firstImg);
        setQty(1);
      } catch (e) {
        console.error("Failed to fetch product:", e);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const variants = useMemo(() => product?.variants || [], [product]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return (
      variants.find((v) => String(v._id) === String(selectedVariantId)) ||
      variants[0]
    );
  }, [variants, selectedVariantId]);

  // ✅ Always build gallery from selected variant images
  const gallery = useMemo(() => {
    const vImgs =
      selectedVariant?.images?.map((i) => i?.url).filter(Boolean) || [];
    return vImgs.length ? vImgs : [fallbackImg];
  }, [selectedVariant]);

  // ✅ Keep activeImg in sync with current gallery
  useEffect(() => {
    if (!gallery.length) return;

    // if activeImg is empty OR not in gallery, reset to first image of this variant
    if (!activeImg || !gallery.includes(activeImg)) {
      setActiveImg(gallery[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantId, gallery.join("|")]);

  const price = useMemo(() => {
    return selectedVariant?.price ?? product?.basePrice ?? 0;
  }, [selectedVariant, product]);

  const stock = useMemo(() => {
    const s = selectedVariant?.countInStock;
    if (typeof s === "number") return s;
    return 0;
  }, [selectedVariant]);

  const brandName = product?.brand?.name || "";
  const catName = product?.category?.name || "";
  const catSlug = product?.category?.slug || "";

  const rating = Number(product?.rating || 0);
  const reviews = Number(product?.numReviews || 0);

  const onSelectVariant = (v) => {
    setSelectedVariantId(v._id);

    // ✅ set active image to first variant image (or fallback)
    const first = v?.images?.map((i) => i?.url).filter(Boolean)?.[0] || fallbackImg;
    setActiveImg(first);

    // ✅ (optional) reset quantity when variant changes
    setQty(1);
  };

  const addToCart = async () => {
    if (!product) return;
    if (variants.length && !selectedVariant) return;
    if (!selectedVariant?._id) {
      alert("Please select an in-stock variant");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      await api.post("/cart/items", {
        productId: product._id,
        variantId: selectedVariant._id,
        qty: Number(qty) || 1,
      });
      navigate("/cart");
    } catch (e) {
      console.error("Failed to add to cart:", e);
      alert(e?.response?.data?.message || "Failed to add to cart");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-5" />
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-[520px] bg-gray-200 rounded-3xl animate-pulse" />
            <div className="lg:col-span-5 h-[520px] bg-gray-200 rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <p className="text-gray-900 font-extrabold text-xl">Product not found</p>
            <p className="text-gray-600 mt-2">
              This product may be unavailable or the link is incorrect.
            </p>
            <Link to="/products" className="inline-block mt-5 text-indigo-600 font-bold">
              ← Back to products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const outOfStock = variants.length ? stock <= 0 : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:underline">Products</Link>
          {catSlug ? (
            <>
              <span className="mx-2">/</span>
              <Link to={`/products?category=${catSlug}`} className="hover:underline">
                {catName}
              </Link>
            </>
          ) : null}
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-semibold">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* LEFT: gallery */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="rounded-2xl bg-gray-50 overflow-hidden">
                  <img
                    src={activeImg || gallery[0] || fallbackImg}
                    alt={product.name}
                    className="w-full h-[420px] sm:h-[520px] object-cover"
                    onError={(e) => (e.currentTarget.src = fallbackImg)}
                  />
                </div>

                {/* thumbnails */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((u, idx) => {
                    const isActive = (activeImg || gallery[0]) === u;
                    return (
                      <button
                        key={`${u}-${idx}`}
                        onClick={() => setActiveImg(u)}
                        className={`h-20 w-20 flex-shrink-0 rounded-2xl border overflow-hidden transition ${
                          isActive ? "ring-2 ring-indigo-500" : "hover:shadow-sm"
                        }`}
                        title="View image"
                      >
                        <img
                          src={u}
                          alt="thumb"
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.src = fallbackImg)}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Description + Specs */}
            <div className="mt-8 grid gap-6">
              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-gray-900">Description</h2>
                <p className="mt-3 text-gray-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {Array.isArray(product.highlights) && product.highlights.length > 0 && (
                <div className="rounded-3xl border bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-extrabold text-gray-900">Highlights</h2>
                  <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-gray-700">
                    {product.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-2 w-2 rounded-full bg-gray-900/60" />
                        <span>{String(h)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.specs &&
                typeof product.specs === "object" &&
                Object.keys(product.specs).length > 0 && (
                  <div className="rounded-3xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-extrabold text-gray-900">Specifications</h2>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      {Object.entries(product.specs).map(([k, v]) => (
                        <div key={k} className="rounded-2xl border bg-gray-50 p-4">
                          <p className="text-xs text-gray-500 font-semibold">{k}</p>
                          <p className="mt-1 text-sm text-gray-900 font-extrabold">
                            {String(v)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* RIGHT: buy box */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-6 space-y-6">
              <div className="rounded-3xl border bg-white p-6 shadow-sm">
                {/* Top meta */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {brandName ? chip(`Brand: ${brandName}`) : null}
                  {product?.warrantyMonths ? chip(`Warranty: ${product.warrantyMonths} mo`) : null}
                  {catName ? chip(catName) : null}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {product.name}
                </h1>

                {/* rating (optional) */}
                <div className="mt-2 text-sm text-gray-600">
                  {reviews > 0 ? (
                    <span>
                      ⭐ {rating.toFixed(1)} <span className="text-gray-400">•</span> {reviews} reviews
                    </span>
                  ) : (
                    <span className="text-gray-500">No reviews yet</span>
                  )}
                </div>

                {/* price */}
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Price</p>
                    <p className="text-3xl font-extrabold text-indigo-600">{money(price)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-semibold">Availability</p>
                    {variants.length ? (
                      outOfStock ? (
                        <p className="font-extrabold text-red-600">Out of stock</p>
                      ) : (
                        <p className="font-extrabold text-green-700">In stock ({stock})</p>
                      )
                    ) : (
                      <p className="font-extrabold text-green-700">Available</p>
                    )}
                  </div>
                </div>

                {/* Variants */}
                {variants.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-extrabold text-gray-900 mb-2">Choose Variant</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {variants.map((v) => {
                        const active = String(v._id) === String(selectedVariantId);
                        const vStock = Number(v?.countInStock || 0);
                        const disabled = vStock <= 0;

                        return (
                          <button
                            key={v._id}
                            disabled={disabled}
                            onClick={() => onSelectVariant(v)}
                            className={`text-left rounded-2xl border px-4 py-3 transition ${
                              active
                                ? "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50"
                                : "bg-white hover:bg-gray-50"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            title={disabled ? "Out of stock" : "Select variant"}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <VariantLabel v={v} />
                              <span className="text-xs font-bold text-gray-500">
                                {disabled ? "Out" : `Stock ${vStock}`}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-extrabold text-gray-900">
                              {money(v?.price ?? product?.basePrice ?? 0)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-gray-900">Quantity</p>
                  <div className="flex items-center rounded-2xl border bg-white overflow-hidden">
                    <button
                      className="px-4 py-2 hover:bg-gray-50"
                      onClick={() => setQty((q) => clamp(q - 1, 1, stock || 999))}
                    >
                      −
                    </button>
                    <input
                      value={qty}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v)) return;
                        setQty(clamp(v, 1, stock || 999));
                      }}
                      className="w-16 text-center py-2 outline-none font-bold"
                    />
                    <button
                      className="px-4 py-2 hover:bg-gray-50"
                      onClick={() => setQty((q) => clamp(q + 1, 1, stock || 999))}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={addToCart}
                    disabled={variants.length ? outOfStock : false}
                    className="rounded-2xl px-5 py-3 font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add to Cart
                  </button>
                  <Link
                    to="/products"
                    className="rounded-2xl px-5 py-3 font-extrabold border bg-white hover:bg-gray-50 text-center"
                  >
                    Back
                  </Link>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Tip: Select variant for correct price & stock (like Amazon).
                </p>
              </div>

              {/* Related products */}
              {product?.category?._id ? (
                <RelatedProducts categoryId={product.category._id} currentSlug={product.slug} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RelatedProducts({ categoryId, currentSlug }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/products", {
          params: { category: categoryId, limit: 8, pageNumber: 1 },
        });
        const list = Array.isArray(data?.products) ? data.products : [];
        setItems(list.filter((p) => p.slug !== currentSlug).slice(0, 4));
      } catch (e) {
        setItems([]);
      }
    })();
  }, [categoryId, currentSlug]);

  if (!items.length) return null;

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">Related Products</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => {
          const img =
            p?.variants?.[0]?.images?.[0]?.url ||
            p?.images?.[0]?.url ||
            fallbackImg;
          const price = p?.basePrice ?? p?.variants?.[0]?.price ?? 0;

          return (
            <Link
              key={p.slug || p._id}
              to={`/product/${p.slug}`}
              className="rounded-2xl border bg-white p-3 hover:shadow-sm transition"
            >
              <div className="rounded-xl bg-gray-50 overflow-hidden">
                <img
                  src={img}
                  alt={p.name}
                  className="h-28 w-full object-cover"
                  onError={(e) => (e.currentTarget.src = fallbackImg)}
                />
              </div>
              <div className="mt-2">
                <p className="text-sm font-bold text-gray-900 line-clamp-2">{p.name}</p>
                <p className="text-sm font-extrabold text-indigo-600">{money(price)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
