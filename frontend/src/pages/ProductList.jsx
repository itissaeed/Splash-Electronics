import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Breadcrumb from "../BreadCrumb";
import { FaSearch } from "react-icons/fa";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

const ProductSkeleton = () => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse">
    <div className="h-44 rounded-xl bg-gray-200" />
    <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
    <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
    <div className="mt-3 h-3 w-1/3 rounded bg-gray-200" />
  </div>
);

export default function ProductListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL params
  const categoryParam = searchParams.get("category") || ""; // slug
  const keywordParam = searchParams.get("keyword") || "";
  const featuredParam = searchParams.get("featured") || ""; // "true"
  const sortParam = searchParams.get("sort") || "latest"; // latest | priceAsc | priceDesc | rating
  const pageParam = Number(searchParams.get("page") || 1);

  // Local state
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(pageParam);

  const [searchTerm, setSearchTerm] = useState(keywordParam);
  const [loading, setLoading] = useState(true);

  // Keep internal page in sync with URL changes
  useEffect(() => setPage(pageParam), [pageParam]);

  // Fetch categories from backend
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories");
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch categories:", e);
      }
    })();
  }, []);

  // Fetch products from backend (server-side filtering + pagination)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = {
          pageNumber: page,
          limit: 12,
        };

        if (keywordParam) params.keyword = keywordParam;
        if (categoryParam) params.category = categoryParam; // backend accepts slug or id (you coded it)
        if (featuredParam === "true") params.featured = "true";

        // Map UI sort → backend sort keys
        if (sortParam === "priceAsc") params.sort = "priceAsc";
        else if (sortParam === "priceDesc") params.sort = "priceDesc";
        else if (sortParam === "rating") params.sort = "rating";
        else params.sort = "latest";

        const { data } = await api.get("/products", { params });

        // Your backend returns: { products, page, pages, total }
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setPages(Number(data?.pages || 1));
      } catch (e) {
        console.error("Failed to fetch products:", e);
        setProducts([]);
        setPages(1);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, categoryParam, keywordParam, featuredParam, sortParam]);

  const selectedCategoryName = useMemo(() => {
    if (!categoryParam) return "Products";
    const found = categories.find((c) => c.slug === categoryParam);
    return found?.name || "Products";
  }, [categories, categoryParam]);

  const goWithParams = (next = {}) => {
    const p = new URLSearchParams(searchParams);

    // apply next
    Object.entries(next).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") p.delete(k);
      else p.set(k, String(v));
    });

    // if filters changed, reset page unless explicitly set
    if (!("page" in next)) p.set("page", "1");

    navigate(`/products?${p.toString()}`);
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    goWithParams({ keyword: searchTerm.trim() || "" });
  };

  const onSelectCategory = (slug) => {
    goWithParams({ category: slug || "" });
  };

  const onPageChange = (nextPage) => {
    goWithParams({ page: nextPage });
  };

  return (
    <div className="page-ambient min-h-screen">
      {/* Header */}
      <header className="relative overflow-hidden bg-[#0b1220] text-white py-8 shadow-lg mb-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24rem),radial-gradient(circle_at_left,rgba(99,102,241,0.2),transparent_22rem)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <p className="section-kicker text-cyan-200/80">Catalog</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Products</h1>
            <p className="text-white/70 text-sm mt-1">
              Browse the latest gadgets & electronics
            </p>
          </div>

          {/* Search */}
          <form onSubmit={onSearchSubmit} className="w-full sm:w-[380px]">
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-xl bg-white/95 py-3 pl-4 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Search"
              >
                <FaSearch />
              </button>
            </div>
          </form>
        </div>
      </header>

      <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-40 group">
        <Link
          to="/advisor"
          className="premium-card inline-flex items-center gap-2 rounded-full bg-slate-900/85 px-3 py-3 sm:pl-4 sm:pr-5 text-white transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
          aria-label="Open Smart Product Advisor"
          title="Open Smart Product Advisor"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M12 2a1 1 0 0 1 .95.68l1.17 3.5 3.5 1.17a1 1 0 0 1 0 1.9l-3.5 1.17-1.17 3.5a1 1 0 0 1-1.9 0l-1.17-3.5-3.5-1.17a1 1 0 0 1 0-1.9l3.5-1.17 1.17-3.5A1 1 0 0 1 12 2Zm6.5 12a.75.75 0 0 1 .71.51l.55 1.64 1.64.55a.75.75 0 0 1 0 1.42l-1.64.55-.55 1.64a.75.75 0 0 1-1.42 0l-.55-1.64-1.64-.55a.75.75 0 0 1 0-1.42l1.64-.55.55-1.64a.75.75 0 0 1 .71-.51Z" />
            </svg>
          </span>
          <span className="hidden sm:inline-block max-w-0 overflow-hidden whitespace-nowrap opacity-0 -translate-x-1 transition-all duration-300 group-hover:max-w-[220px] group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:max-w-[220px] group-focus-within:opacity-100 group-focus-within:translate-x-0">
            Smart Product Advisor
          </span>
        </Link>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Breadcrumb
          items={[
            { to: "/", label: "Home" },
            categoryParam ? { label: selectedCategoryName } : { label: "Products" },
          ]}
        />
      </div>

      {/* Filters Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="premium-card rounded-[1.75rem] p-5 sm:p-6 flex flex-col gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectCategory("")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              !categoryParam ? "bg-indigo-600 text-white shadow" : "bg-white border hover:bg-gray-50"
            }`}
          >
            All
          </button>

          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                categoryParam === cat.slug
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white border hover:bg-gray-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort + Featured */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => goWithParams({ featured: featuredParam === "true" ? "" : "true" })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                featuredParam === "true"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Featured
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-semibold">Sort:</span>
            <select
              value={sortParam}
              onChange={(e) => goWithParams({ sort: e.target.value })}
              className="rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="latest">Latest</option>
              <option value="priceAsc">Price: Low → High</option>
              <option value="priceDesc">Price: High → Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="premium-card rounded-2xl p-8 text-center text-gray-700">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => {
              const img =
                p?.variants?.[0]?.images?.[0]?.url ||
                p?.images?.[0]?.url ||
                fallbackImg;

              const price = p?.basePrice ?? p?.variants?.[0]?.price ?? p?.price ?? 0;

              // ✅ slug first, fallback to id
              const url = p?.slug ? `/product/${p.slug}` : `/product/${p._id}`;

              return (
                <Link
                  key={p.slug || p._id}
                  to={url}
                  className="premium-card premium-card-hover group rounded-[1.6rem] p-4"
                >
                  <div className="relative overflow-hidden rounded-[1.2rem] bg-gray-50">
                    <img
                      src={img}
                      alt={p.name}
                      className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = fallbackImg)}
                    />
                  </div>

                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                        {p?.brand?.name || "Tech"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-indigo-600 font-extrabold">{money(price)}</p>
                      <span className="text-xs text-gray-500 group-hover:text-gray-700">
                        View →
                      </span>
                    </div>

                    {/* Optional hints */}
                    <p className="mt-2 text-xs text-gray-500">
                      Premium picks, curated for everyday browsing.
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mt-10">
            <button
              onClick={() => onPageChange(Math.max(page - 1, 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>

            {Array.from({ length: pages }).map((_, i) => {
              const p = i + 1;
              const active = p === page;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`px-4 py-2 rounded-xl border transition ${
                    active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(Math.min(page + 1, pages))}
              disabled={page >= pages}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
