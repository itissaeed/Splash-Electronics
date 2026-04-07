import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import useCompareItems from "../utils/useCompare";
import {
  clearCompareItems,
  removeCompareItem,
  COMPARE_LIMIT,
  getCompareKey,
} from "../utils/compare";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "à§³0";
  return `à§³${num.toLocaleString("en-BD")}`;
};

const normalizeAttributeEntries = (attributes) => {
  if (!attributes) return [];
  if (attributes instanceof Map) {
    return Array.from(attributes.entries()).filter(([k, v]) => k && String(v || "").trim());
  }
  if (typeof attributes === "object") {
    return Object.entries(attributes).filter(([k, v]) => k && String(v || "").trim());
  }
  return [];
};

const prettyAttrKey = (key) =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const getDefaultVariant = (product) => {
  const variants = product?.variants || [];
  if (!variants.length) return null;
  return (
    variants.find((v) => v?.isDefault) ||
    variants.find((v) => (v?.countInStock ?? 0) > 0) ||
    variants[0]
  );
};

const getAttributeMap = (product) => {
  const variant = getDefaultVariant(product);
  return normalizeAttributeEntries(variant?.attributes).reduce((acc, [k, v]) => {
    acc[k] = String(v);
    return acc;
  }, {});
};

const getSpecsMap = (product) => {
  const specsRaw = product?.specs;
  if (!specsRaw || typeof specsRaw !== "object") return {};
  const entries = specsRaw instanceof Map ? Array.from(specsRaw.entries()) : Object.entries(specsRaw);
  return entries.reduce((acc, [k, v]) => {
    if (!k || String(v || "").trim() === "") return acc;
    acc[k] = String(v);
    return acc;
  }, {});
};

const getPrice = (product) =>
  product?.basePrice ?? product?.variants?.[0]?.price ?? product?.price ?? 0;

const getImage = (product, fallback) =>
  product?.variants?.[0]?.images?.[0]?.url ||
  product?.images?.[0]?.url ||
  fallback;

const getAvailability = (product) => {
  const variants = product?.variants || [];
  if (!variants.length) return "Available";
  const inStock = variants.some((v) => (v?.countInStock ?? 0) > 0);
  return inStock ? "In stock" : "Out of stock";
};

export default function Compare() {
  const compareItems = useCompareItems();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!compareItems.length) {
        setProducts([]);
        return;
      }
      setLoading(true);
      const results = await Promise.all(
        compareItems.map(async (item) => {
          if (!item?.slug && !item?.id) return null;
          const path = item.slug ? `/products/${item.slug}` : `/products/id/${item.id}`;
          try {
            const { data } = await api.get(path);
            return data || null;
          } catch {
            return null;
          }
        })
      );
      if (!active) return;
      setProducts(results);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [compareItems]);

  const safeProducts = useMemo(() => {
    return compareItems.map((item, index) => {
      const product = products[index];
      if (product) return product;
      return {
        _missing: true,
        name: item?.name || "Unavailable product",
        slug: item?.slug,
        _id: item?.id,
        brand: { name: item?.brand || "" },
        basePrice: item?.price ?? 0,
        images: item?.image ? [{ url: item.image }] : [],
        variants: [],
        specs: {},
      };
    });
  }, [compareItems, products]);

  const attributeKeys = useMemo(() => {
    const keys = new Set();
    safeProducts.forEach((product) => {
      Object.keys(getAttributeMap(product)).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [safeProducts]);

  const specKeys = useMemo(() => {
    const keys = new Set();
    safeProducts.forEach((product) => {
      Object.keys(getSpecsMap(product)).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [safeProducts]);

  const labelCell =
    "px-4 py-3 font-semibold text-gray-700 bg-white/90 border border-white/60 first:rounded-l-2xl dark:bg-slate-900/80 dark:text-slate-200 dark:border-slate-800/60";
  const valueCell =
    "px-4 py-3 text-gray-800 bg-white/90 border border-white/60 last:rounded-r-2xl dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-800/60";

  if (!compareItems.length) {
    return (
      <div className="page-ambient min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="premium-card rounded-3xl p-8 text-center">
            <p className="text-lg font-extrabold text-gray-900">No products selected</p>
            <p className="mt-2 text-sm text-gray-600">
              Add up to {COMPARE_LIMIT} products from the catalog to compare side by side.
            </p>
            <Link
              to="/products"
              className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              Browse products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-ambient min-h-screen">
      <header className="relative overflow-hidden bg-[#0b1220] text-white py-10 shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_26rem),radial-gradient(circle_at_left,rgba(251,191,36,0.18),transparent_24rem)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker text-cyan-200/80">Compare</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Product Comparison</h1>
            <p className="text-white/70 text-sm mt-1 max-w-md">
              See the best spec match at a glance. Mix phones, laptops, or accessories and compare
              in one polished view.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                Selected: {compareItems.length}/{COMPARE_LIMIT}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                Rows: {attributeKeys.length + specKeys.length + 6}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/products"
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Add more
            </Link>
            <button
              type="button"
              onClick={clearCompareItems}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              Clear all
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="premium-card rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-2xl backdrop-blur sm:p-6 dark:border-slate-800/60 dark:bg-slate-950/70">
          {loading ? (
            <div className="text-sm text-gray-500">Loading comparison data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left">
                    <th className="w-56 px-4 py-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                      Feature
                    </th>
                    {safeProducts.map((product, idx) => (
                      <th key={getCompareKey(product) || idx} className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/90 p-3 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/80">
                          <div className="relative overflow-hidden rounded-2xl">
                            <img
                              src={getImage(product, fallbackImg)}
                              alt={product?.name}
                              className="h-32 w-full object-cover"
                              onError={(e) => (e.currentTarget.src = fallbackImg)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                            <button
                              type="button"
                              onClick={() => removeCompareItem(getCompareKey(product))}
                              className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-rose-600 shadow"
                            >
                              Remove
                            </button>
                            <span className="absolute left-2 bottom-2 rounded-full bg-slate-900/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                              {getAvailability(product)}
                            </span>
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 line-clamp-2 dark:text-slate-100">{product?.name}</p>
                            {product?._missing ? (
                              <p className="text-xs text-rose-500">Currently unavailable</p>
                            ) : (
                              <Link
                                to={product?.slug ? `/product/${product.slug}` : `/product/${product?._id}`}
                                className="text-xs font-semibold text-indigo-600 hover:underline"
                              >
                                View product
                              </Link>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className={labelCell}>Price</td>
                    {safeProducts.map((product, idx) => (
                      <td key={`price-${idx}`} className={`${valueCell} font-extrabold text-indigo-600`}>
                        {money(getPrice(product))}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={labelCell}>Brand</td>
                    {safeProducts.map((product, idx) => (
                      <td key={`brand-${idx}`} className={valueCell}>
                        {product?.brand?.name || product?.brand || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={labelCell}>Category</td>
                    {safeProducts.map((product, idx) => (
                      <td key={`cat-${idx}`} className={valueCell}>
                        {product?.category?.name || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={labelCell}>Availability</td>
                    {safeProducts.map((product, idx) => (
                      <td key={`avail-${idx}`} className={valueCell}>
                        {getAvailability(product)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={labelCell}>Rating</td>
                    {safeProducts.map((product, idx) => (
                      <td key={`rating-${idx}`} className={valueCell}>
                        {Number(product?.rating || 0).toFixed(1)} ({product?.numReviews || 0})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className={labelCell}>Warranty</td>
                    {safeProducts.map((product, idx) => (
                      <td key={`warranty-${idx}`} className={valueCell}>
                        {product?.warrantyMonths ? `${product.warrantyMonths} mo` : "—"}
                      </td>
                    ))}
                  </tr>

                  {attributeKeys.length > 0 && (
                    <tr>
                      <td
                        colSpan={safeProducts.length + 1}
                        className="px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500"
                      >
                        Default Variant Attributes
                      </td>
                    </tr>
                  )}
                  {attributeKeys.map((key) => (
                    <tr key={`attr-${key}`}>
                      <td className={labelCell}>{prettyAttrKey(key)}</td>
                      {safeProducts.map((product, idx) => (
                        <td key={`attr-${key}-${idx}`} className={valueCell}>
                          {getAttributeMap(product)[key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {specKeys.length > 0 && (
                    <tr>
                      <td
                        colSpan={safeProducts.length + 1}
                        className="px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500"
                      >
                        Product Specs
                      </td>
                    </tr>
                  )}
                  {specKeys.map((key) => (
                    <tr key={`spec-${key}`}>
                      <td className={labelCell}>{prettyAttrKey(key)}</td>
                      {safeProducts.map((product, idx) => (
                        <td key={`spec-${key}-${idx}`} className={valueCell}>
                          {getSpecsMap(product)[key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

