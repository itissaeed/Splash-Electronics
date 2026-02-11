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
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-gray-950 text-white py-7 shadow-lg mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 flex flex-col gap-4">
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

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-gray-700">
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
                  className="group rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="relative overflow-hidden rounded-xl bg-gray-50">
                    <img
                      src={img}
                      alt={p.name}
                      className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = fallbackImg)}
                    />
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-indigo-600 font-extrabold">{money(price)}</p>
                      <span className="text-xs text-gray-500 group-hover:text-gray-700">
                        View →
                      </span>
                    </div>

                    {/* Optional hints */}
                    <p className="mt-1 text-xs text-gray-500">
                      {p?.brand?.name ? p.brand.name : ""}
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
