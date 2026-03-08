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

function toAttributeMap(attributes) {
  return normalizeAttributeEntries(attributes).reduce((acc, [k, v]) => {
    acc[k] = String(v);
    return acc;
  }, {});
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

function StarRating({ value = 0, sizeClass = "h-4 w-4", interactive = false, onChange }) {
  const roundedValue = Math.round(Number(value) || 0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = interactive ? star <= value : star <= roundedValue;

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange?.(star)}
              className={`transition ${active ? "text-amber-400" : "text-gray-300 hover:text-amber-300"}`}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={sizeClass} aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 0 0 .95-.69l1.07-3.292Z" />
              </svg>
            </button>
          );
        }

        return (
          <span key={star} className={active ? "text-amber-400" : "text-gray-300"}>
            <svg viewBox="0 0 20 20" fill="currentColor" className={sizeClass} aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 0 0 .95-.69l1.07-3.292Z" />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

function formatReviewDate(date) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [activeImg, setActiveImg] = useState("");
  const [qty, setQty] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

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

  const variantAttributeKeys = useMemo(() => {
    const keys = new Set();
    variants.forEach((v) => {
      normalizeAttributeEntries(v?.attributes).forEach(([k]) => {
        if (k) keys.add(k);
      });
    });
    return Array.from(keys);
  }, [variants]);

  const variantOptionsByKey = useMemo(() => {
    const map = {};
    for (const key of variantAttributeKeys) {
      const values = new Set();
      variants.forEach((v) => {
        const attrMap = toAttributeMap(v?.attributes);
        const value = String(attrMap[key] || "").trim();
        if (value) values.add(value);
      });
      map[key] = Array.from(values);
    }
    return map;
  }, [variantAttributeKeys, variants]);

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
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "null");
    } catch {
      return null;
    }
  }, []);

  const sortedReviews = useMemo(() => {
    return [...(product?.reviews || [])].sort(
      (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
    );
  }, [product]);

  const existingUserReview = useMemo(() => {
    if (!currentUser?._id) return null;
    return sortedReviews.find((review) => String(review.user) === String(currentUser._id)) || null;
  }, [currentUser, sortedReviews]);

  const ratingBreakdown = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: sortedReviews.filter((review) => Number(review.rating) === star).length,
    }));

    return buckets.map((bucket) => ({
      ...bucket,
      percent: reviews ? Math.round((bucket.count / reviews) * 100) : 0,
    }));
  }, [reviews, sortedReviews]);

  useEffect(() => {
    if (!existingUserReview) {
      setReviewRating(5);
      setReviewTitle("");
      setReviewComment("");
      return;
    }
    setReviewRating(Number(existingUserReview.rating) || 5);
    setReviewTitle(existingUserReview.title || "");
    setReviewComment(existingUserReview.comment || "");
  }, [existingUserReview]);

  const onSelectVariant = (v) => {
    setSelectedVariantId(v._id);

    // ✅ set active image to first variant image (or fallback)
    const first = v?.images?.map((i) => i?.url).filter(Boolean)?.[0] || fallbackImg;
    setActiveImg(first);

    // ✅ (optional) reset quantity when variant changes
    setQty(1);
  };

  const findBestVariantForSelection = (nextSelection = {}) => {
    if (!variants.length) return null;

    const matches = variants.filter((v) => {
      const attrs = toAttributeMap(v?.attributes);
      return Object.entries(nextSelection).every(([k, val]) => {
        if (!val) return true;
        return String(attrs[k] || "") === String(val);
      });
    });

    if (!matches.length) return null;

    return (
      matches.find((v) => String(v?._id) === String(selectedVariantId)) ||
      matches.find((v) => Number(v?.countInStock || 0) > 0) ||
      matches[0]
    );
  };

  const onSelectAttribute = (key, value) => {
    const currentSelection = toAttributeMap(selectedVariant?.attributes);
    const nextSelection = { ...currentSelection, [key]: value };
    const nextVariant = findBestVariantForSelection(nextSelection);
    if (nextVariant) onSelectVariant(nextVariant);
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

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!reviewComment.trim()) {
      setReviewError("Please write a review comment.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const { data } = await api.post(`/products/${product._id}/reviews`, {
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });

      setProduct(data || product);
      setReviewSuccess(existingUserReview ? "Your review was updated." : "Your review was posted.");
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
    } catch (e) {
      console.error("Failed to submit review:", e);
      setReviewError(e?.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
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
    <div className="page-ambient min-h-screen">
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
            <div className="premium-card rounded-3xl overflow-hidden">
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
              <div className="premium-card rounded-3xl p-6">
                <h2 className="text-lg font-extrabold text-gray-900">Description</h2>
                <p className="mt-3 text-gray-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {selectedVariant && normalizeAttributeEntries(selectedVariant.attributes).length > 0 && (
                <div className="premium-card rounded-3xl p-6">
                  <h2 className="text-lg font-extrabold text-gray-900">Selected Configuration</h2>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {normalizeAttributeEntries(selectedVariant.attributes).map(([k, v]) => (
                      <div key={k} className="rounded-2xl border bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 font-semibold">{prettyAttrKey(k)}</p>
                        <p className="mt-1 text-sm text-gray-900 font-extrabold">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(product.highlights) && product.highlights.length > 0 && (
                <div className="premium-card rounded-3xl p-6">
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
                  <div className="premium-card rounded-3xl p-6">
                    <h2 className="text-lg font-extrabold text-gray-900">Specifications</h2>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      {Object.entries(product.specs).map(([k, v]) => (
                        <div key={k} className="rounded-2xl border bg-gray-50 p-4">
                          <p className="text-xs text-gray-500 font-semibold">{prettyAttrKey(k)}</p>
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
              <div className="premium-card rounded-3xl p-6">
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

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 font-semibold">Brand</p>
                    <p className="text-sm text-gray-900 font-extrabold">{brandName || "N/A"}</p>
                  </div>
                  <div className="rounded-2xl border bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 font-semibold">Category</p>
                    <p className="text-sm text-gray-900 font-extrabold">{catName || "N/A"}</p>
                  </div>
                  <div className="rounded-2xl border bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 font-semibold">Warranty</p>
                    <p className="text-sm text-gray-900 font-extrabold">
                      {product?.warrantyMonths ? `${product.warrantyMonths} months` : "Standard"}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 font-semibold">SKU</p>
                    <p className="text-sm text-gray-900 font-extrabold">
                      {selectedVariant?.sku || "Auto"}
                    </p>
                  </div>
                </div>

                {variantAttributeKeys.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {variantAttributeKeys.map((key) => {
                      const selectedValue =
                        toAttributeMap(selectedVariant?.attributes)?.[key] || "";
                      const options = variantOptionsByKey[key] || [];

                      return (
                        <div key={key}>
                          <p className="text-sm font-extrabold text-gray-900 mb-2">
                            {prettyAttrKey(key)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {options.map((value) => {
                              const preview = findBestVariantForSelection({
                                ...toAttributeMap(selectedVariant?.attributes),
                                [key]: value,
                              });
                              const disabled = !preview || Number(preview?.countInStock || 0) <= 0;
                              const active = String(value) === String(selectedValue);

                              return (
                                <button
                                  key={`${key}-${value}`}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onSelectAttribute(key, value)}
                                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                    active
                                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                      : "bg-white hover:bg-gray-50 text-gray-800"
                                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Variants */}
                {variants.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-extrabold text-gray-900 mb-2">All Variants</p>
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
                  Secure checkout, fast shipping, and easy return support.
                </p>
              </div>

              {/* Related products */}
              {product?.category?._id ? (
                <RelatedProducts categoryId={product.category._id} currentSlug={product.slug} />
              ) : null}
            </div>
          </div>
        </div>

        <section className="premium-card mt-10 rounded-3xl p-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="lg:w-[340px]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                Ratings & Reviews
              </p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-extrabold text-gray-900">{rating.toFixed(1)}</p>
                <div className="pb-1">
                  <StarRating value={rating} sizeClass="h-5 w-5" />
                  <p className="mt-1 text-sm text-gray-500">
                    Based on {reviews} review{reviews === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {ratingBreakdown.map((bucket) => (
                  <div key={bucket.star} className="flex items-center gap-3">
                    <span className="w-12 text-sm font-semibold text-gray-700">{bucket.star} star</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${bucket.percent}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm text-gray-500">{bucket.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-3xl border bg-gray-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {existingUserReview ? "Edit your review" : "Write a review"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Share your experience with build quality, performance, and delivery.
                  </p>
                </div>
                {!currentUser ? (
                  <Link
                    to="/login"
                    className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Login to review
                  </Link>
                ) : null}
              </div>

              <form onSubmit={submitReview} className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Your rating</p>
                  <div className="mt-2 flex items-center gap-3">
                    <StarRating
                      value={reviewRating}
                      sizeClass="h-7 w-7"
                      interactive
                      onChange={setReviewRating}
                    />
                    <span className="text-sm font-semibold text-gray-600">{reviewRating}/5</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Review title</label>
                  <input
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    maxLength={120}
                    placeholder="Summarize your experience"
                    disabled={!currentUser || reviewSubmitting}
                    className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Your review</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={5}
                    placeholder="How is the product in real use?"
                    disabled={!currentUser || reviewSubmitting}
                    className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                  />
                </div>

                {reviewError ? <p className="text-sm font-semibold text-red-600">{reviewError}</p> : null}
                {reviewSuccess ? <p className="text-sm font-semibold text-green-700">{reviewSuccess}</p> : null}

                <button
                  type="submit"
                  disabled={!currentUser || reviewSubmitting}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewSubmitting ? "Submitting..." : existingUserReview ? "Update Review" : "Post Review"}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 border-t pt-8">
            <h3 className="text-xl font-extrabold text-gray-900">Customer comments</h3>
            {!sortedReviews.length ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-6 text-sm text-gray-500">
                No reviews yet. Be the first to comment on this product.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {sortedReviews.map((review) => (
                  <article key={review._id} className="rounded-3xl border bg-white p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-extrabold text-gray-900">{review.name}</p>
                          {review.verifiedPurchase ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              Verified Purchase
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <StarRating value={review.rating} />
                          <span className="text-xs text-gray-500">{formatReviewDate(review.createdAt)}</span>
                        </div>
                        {review.title ? (
                          <p className="mt-3 text-sm font-extrabold text-gray-900">{review.title}</p>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {review.comment}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
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
    <div className="premium-card rounded-3xl p-6">
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
              className="premium-card premium-card-hover rounded-2xl p-3"
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
