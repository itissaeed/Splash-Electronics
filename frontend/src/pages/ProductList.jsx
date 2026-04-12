import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Breadcrumb from "../BreadCrumb";
import {
  FaCheck,
  FaChevronDown,
  FaSearch,
  FaSlidersH,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import useCompareItems from "../utils/useCompare";
import {
  COMPARE_LIMIT,
  getCompareKey,
  toggleCompareItem,
} from "../utils/compare";
import { UserContext } from "./context/UserContext";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

const getOriginalPrice = (product) => Number(product?.originalPrice || 0);

const getProductStock = (product) =>
  (Array.isArray(product?.variants) ? product.variants : []).reduce(
    (sum, variant) => sum + Number(variant?.countInStock || 0),
    0
  );

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const joinCsv = (values = []) => Array.from(new Set(values)).filter(Boolean).join(",");

const RESERVED_PRODUCT_FILTER_KEYS = new Set([
  "page",
  "pageNumber",
  "limit",
  "keyword",
  "featured",
  "sort",
  "category",
  "brand",
  "brands",
  "minPrice",
  "maxPrice",
  "inStock",
]);

const ProductSkeleton = () => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse">
    <div className="h-44 rounded-xl bg-gray-200" />
    <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
    <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
    <div className="mt-3 h-3 w-1/3 rounded bg-gray-200" />
  </div>
);

const FilterSection = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  action,
  children,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-start justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <span
          className={`mt-1 rounded-full bg-slate-100 p-2 text-slate-500 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <FaChevronDown className="text-xs" />
        </span>
      </button>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {isOpen ? <div className="mt-4">{children}</div> : null}
  </div>
);

export default function ProductListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  // URL params
  const categoryParam = searchParams.get("category") || ""; // slug
  const keywordParam = searchParams.get("keyword") || "";
  const featuredParam = searchParams.get("featured") || ""; // "true"
  const sortParam = searchParams.get("sort") || "latest"; // latest | priceAsc | priceDesc | rating
  const pageParam = Number(searchParams.get("page") || 1);
  const minPriceParam = searchParams.get("minPrice") || "";
  const maxPriceParam = searchParams.get("maxPrice") || "";
  const brandsParam = searchParams.get("brands") || "";
  const inStockParam = searchParams.get("inStock") || "";

  // Local state
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filterMeta, setFilterMeta] = useState({
    priceRange: { min: 0, max: 0 },
    attributeFilters: [],
    category: null,
  });
  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(pageParam);
  const [openSections, setOpenSections] = useState({
    categories: true,
    price: true,
    availability: true,
    brands: true,
    specs: true,
  });

  const [searchTerm, setSearchTerm] = useState(keywordParam);
  const [draftMinPrice, setDraftMinPrice] = useState(minPriceParam);
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPriceParam);
  const [selectedBrands, setSelectedBrands] = useState(splitCsv(brandsParam));
  const [inStockOnly, setInStockOnly] = useState(inStockParam === "true");
  const [loading, setLoading] = useState(true);
  const compareItems = useCompareItems();
  const isAdmin = Boolean(user?.isAdmin);

  const compareKeys = useMemo(
    () => new Set(compareItems.map((item) => getCompareKey(item))),
    [compareItems]
  );

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

  // Keep local filter controls synced with URL
  useEffect(() => setSearchTerm(keywordParam), [keywordParam]);
  useEffect(() => {
    setDraftMinPrice(minPriceParam);
  }, [minPriceParam]);
  useEffect(() => {
    setDraftMaxPrice(maxPriceParam);
  }, [maxPriceParam]);
  useEffect(() => setSelectedBrands(splitCsv(brandsParam)), [brandsParam]);
  useEffect(() => setInStockOnly(inStockParam === "true"), [inStockParam]);

  useEffect(() => {
    (async () => {
      try {
        const params = categoryParam ? { category: categoryParam } : {};
        const { data } = await api.get("/products/filters", { params });
        setFilterMeta({
          priceRange: {
            min: Number(data?.priceRange?.min || 0),
            max: Number(data?.priceRange?.max || 0),
          },
          attributeFilters: Array.isArray(data?.attributeFilters) ? data.attributeFilters : [],
          category: data?.category || null,
        });
        if (Array.isArray(data?.brands)) {
          setBrands(data.brands);
        }
      } catch (e) {
        console.error("Failed to fetch product filters:", e);
      }
    })();
  }, [categoryParam, minPriceParam, maxPriceParam]);

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
        if (minPriceParam) params.minPrice = minPriceParam;
        if (maxPriceParam) params.maxPrice = maxPriceParam;
        if (brandsParam) params.brands = brandsParam;
        if (inStockParam === "true") params.inStock = "true";
        Array.from(searchParams.entries()).forEach(([key, value]) => {
          if (RESERVED_PRODUCT_FILTER_KEYS.has(key)) return;
          if (String(value || "").trim()) params[key] = value;
        });

        // Map UI sort → backend sort keys
        if (sortParam === "priceAsc") params.sort = "priceAsc";
        else if (sortParam === "priceDesc") params.sort = "priceDesc";
        else if (sortParam === "rating") params.sort = "rating";
        else params.sort = "latest";

        const { data } = await api.get("/products", { params });

        // Your backend returns: { products, page, pages, total }
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setPages(Number(data?.pages || 1));
        setTotalProducts(Number(data?.total || 0));
      } catch (e) {
        console.error("Failed to fetch products:", e);
        setProducts([]);
        setPages(1);
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, categoryParam, keywordParam, featuredParam, sortParam, minPriceParam, maxPriceParam, brandsParam, inStockParam, searchParams]);

  const selectedCategoryName = useMemo(() => {
    if (!categoryParam) return "Products";
    const found = categories.find((c) => c.slug === categoryParam);
    return found?.name || "Products";
  }, [categories, categoryParam]);

  const categoryFilterTitle = filterMeta?.category?.name || selectedCategoryName;
  const priceMinBound = Number.isFinite(Number(filterMeta?.priceRange?.min))
    ? Number(filterMeta.priceRange.min)
    : 0;
  const priceMaxBound = Number.isFinite(Number(filterMeta?.priceRange?.max))
    ? Number(filterMeta.priceRange.max)
    : 0;
  const activeDynamicFilters = filterMeta.attributeFilters.filter((item) => {
    const value = searchParams.get(item.key);
    return value && value.trim();
  });
  const activeFilterCount =
    Number(Boolean(categoryParam)) +
    Number(Boolean(keywordParam)) +
    Number(Boolean(minPriceParam || maxPriceParam)) +
    Number(Boolean(featuredParam === "true")) +
    Number(Boolean(inStockParam === "true")) +
    selectedBrands.length +
    activeDynamicFilters.length;
  const quickPriceRanges = useMemo(() => {
    const safeMin = Math.max(0, Number(priceMinBound) || 0);
    const safeMax = Math.max(safeMin, Number(priceMaxBound) || 0);
    if (safeMax <= safeMin) return [];

    const first = Math.round(safeMax * 0.25);
    const second = Math.round(safeMax * 0.5);
    const third = Math.round(safeMax * 0.75);
    return [
      { label: `Under ${money(first)}`, min: "", max: String(first) },
      { label: `${money(first)} - ${money(second)}`, min: String(first), max: String(second) },
      { label: `${money(second)} - ${money(third)}`, min: String(second), max: String(third) },
      { label: `${money(third)} & Above`, min: String(third), max: "" },
    ];
  }, [priceMinBound, priceMaxBound]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const goWithParams = (next = {}, options = {}) => {
    const p = new URLSearchParams(searchParams);

    if (options.clearDynamicFilters) {
      Array.from(p.keys()).forEach((key) => {
        if (!RESERVED_PRODUCT_FILTER_KEYS.has(key)) p.delete(key);
      });
    }

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

  const applyPriceFilter = () => {
    const normalizedMin = String(draftMinPrice || "").trim();
    const normalizedMax = String(draftMaxPrice || "").trim();
    const min = normalizedMin === "" ? null : Number(normalizedMin);
    const max = normalizedMax === "" ? null : Number(normalizedMax);

    if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) {
      return;
    }

    if (min !== null && max !== null && min > max) {
      const swappedMin = String(max);
      const swappedMax = String(min);
      setDraftMinPrice(swappedMin);
      setDraftMaxPrice(swappedMax);
      goWithParams({
        minPrice: swappedMin,
        maxPrice: swappedMax,
      });
      return;
    }

    goWithParams({
      minPrice: normalizedMin,
      maxPrice: normalizedMax,
    });
  };

  const toggleBrand = (slug) => {
    const next = selectedBrands.includes(slug)
      ? selectedBrands.filter((value) => value !== slug)
      : [...selectedBrands, slug];
    setSelectedBrands(next);
    goWithParams({ brands: joinCsv(next) });
  };

  const toggleInStock = () => {
    const next = !inStockOnly;
    setInStockOnly(next);
    goWithParams({ inStock: next ? "true" : "" });
  };

	  const clearFilters = () => {
	    setDraftMinPrice("");
	    setDraftMaxPrice("");
	    setSelectedBrands([]);
    setInStockOnly(false);
    setSearchTerm("");
    goWithParams({
      minPrice: "",
      maxPrice: "",
      brands: "",
      inStock: "",
      featured: "",
      category: "",
      keyword: "",
      sort: "latest",
    }, { clearDynamicFilters: true });
  };

  const onPageChange = (nextPage) => {
    goWithParams({ page: nextPage });
  };

  const removeFilterChip = (type, value) => {
    if (type === "category") return goWithParams({ category: "" });
    if (type === "keyword") return goWithParams({ keyword: "" });
    if (type === "price") return goWithParams({ minPrice: "", maxPrice: "" });
    if (type === "inStock") return goWithParams({ inStock: "" });
    if (type === "featured") return goWithParams({ featured: "" });
    if (type === "brand") return toggleBrand(value);
    if (type === "dynamic") return goWithParams({ [value]: "" });
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 sm:px-6 xl:grid-cols-[235px_minmax(0,1fr)] items-start">
          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200/80">Filters</p>
                  <h2 className="mt-2 flex items-center gap-2 text-lg font-extrabold">
                    <FaSlidersH className="text-cyan-300" />
                    Refine results
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Narrow down by department, budget, brand, and key specs.
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
                  <div className="text-base font-extrabold">{activeFilterCount}</div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Active</div>
                </div>
              </div>
            </div>

            <FilterSection
              title="Department"
              subtitle="Shop by category like a storefront aisle."
              isOpen={openSections.categories}
              onToggle={() => toggleSection("categories")}
            >
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => goWithParams({ category: "" })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    !categoryParam
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <span className="font-semibold">All Products</span>
                  {!categoryParam ? <FaCheck className="text-xs" /> : null}
                </button>
                {categories.map((category) => {
                  const active = category.slug === categoryParam;
                  return (
                    <button
                      key={category._id || category.slug}
                      type="button"
                      onClick={() => goWithParams({ category: category.slug })}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      <span className="font-semibold">{category.name}</span>
                      {active ? <FaCheck className="text-xs" /> : null}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection
              title="Price"
              subtitle="Use quick ranges or set your own budget."
              isOpen={openSections.price}
              onToggle={() => toggleSection("price")}
              action={
	                <button
	                  type="button"
	                  onClick={() => {
	                    setDraftMinPrice("");
	                    setDraftMaxPrice("");
	                    goWithParams({ minPrice: "", maxPrice: "" });
	                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Reset
                </button>
              }
            >
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {quickPriceRanges.length > 0 ? (
                  <div className="space-y-2">
                    {quickPriceRanges.map((range) => {
                      const active =
                        String(minPriceParam || "") === String(range.min || "") &&
                        String(maxPriceParam || "") === String(range.max || "");
                      return (
	                        <button
	                          key={`${range.label}-${range.min}-${range.max}`}
	                          type="button"
	                          onClick={() => {
	                            setDraftMinPrice(String(range.min || ""));
	                            setDraftMaxPrice(String(range.max || ""));
	                            goWithParams({
	                              minPrice: String(range.min || ""),
	                              maxPrice: String(range.max || ""),
                            });
                          }}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
                            active
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          <span>{range.label}</span>
                          {active ? <FaCheck className="text-xs" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Custom range</span>
                    <span>0 - {money(priceMaxBound)}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="min-w-0">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Min
                      </label>
	                      <input
	                        value={draftMinPrice}
	                        onChange={(e) => setDraftMinPrice(e.target.value)}
	                        onKeyDown={(e) => {
	                          if (e.key === "Enter") applyPriceFilter();
	                        }}
	                        type="text"
	                        inputMode="numeric"
	                        placeholder="0"
	                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
	                      />
                    </div>

                    <div className="min-w-0">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Max
                      </label>
	                      <input
	                        value={draftMaxPrice}
	                        onChange={(e) => setDraftMaxPrice(e.target.value)}
	                        onKeyDown={(e) => {
	                          if (e.key === "Enter") applyPriceFilter();
	                        }}
	                        type="text"
	                        inputMode="numeric"
	                        placeholder={String(priceMaxBound || 0)}
	                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
	                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Min: {money(0)}</span>
                  <span>Max: {money(priceMaxBound)}</span>
                </div>

                <button
                  type="button"
                  onClick={applyPriceFilter}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Apply price
                </button>
              </div>
            </FilterSection>

            <FilterSection
              title="Availability"
              subtitle="Focus on products you can buy right away."
              isOpen={openSections.availability}
              onToggle={() => toggleSection("availability")}
            >
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                    inStockOnly
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={toggleInStock}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold">In stock only</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                    featuredParam === "true"
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={featuredParam === "true"}
                    onChange={() => goWithParams({ featured: featuredParam === "true" ? "" : "true" })}
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-2 font-semibold">
                    <FaStar className="text-xs" />
                    Featured deals
                  </span>
                </label>
              </div>
            </FilterSection>

            {filterMeta.attributeFilters.length > 0 && (
              <FilterSection
                title={`${categoryFilterTitle} filters`}
                subtitle={`${activeDynamicFilters.length} active controls`}
                isOpen={openSections.specs}
                onToggle={() => toggleSection("specs")}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      filterMeta.attributeFilters.forEach((field) => next.delete(field.key));
                      next.set("page", "1");
                      navigate(`/products?${next.toString()}`);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Clear
                  </button>
                }
              >
                <div className="space-y-4">
                  {filterMeta.attributeFilters.map((field) => {
                    const value = searchParams.get(field.key) || "";
                    return (
                      <div key={field.key}>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {field.label}
                        </label>
                        <select
                          value={value}
                          onChange={(e) => goWithParams({ [field.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="">{field.placeholder}</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </FilterSection>
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FaTimes />
              Clear all filters
            </button>
          </aside>

	          <div className="space-y-5">
		            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Results</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Browse like a real storefront with department, deal, budget, and brand filters.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                    {loading ? "Loading..." : `${totalProducts || products.length} items`} • Page {page} of {pages}
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
                    <span className="text-sm font-semibold text-slate-700">Sort by</span>
                    <select
                      value={sortParam}
                      onChange={(e) => goWithParams({ sort: e.target.value })}
                      className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="latest">Latest</option>
                      <option value="priceAsc">Price: Low to High</option>
                      <option value="priceDesc">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </label>
                </div>
              </div>

		              <div className="mt-4 flex flex-wrap gap-2">
                {categoryParam ? (
                  <button
                    type="button"
                    onClick={() => removeFilterChip("category")}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                  >
                    Category: {selectedCategoryName}
                  </button>
                ) : null}
                {keywordParam ? (
                  <button
                    type="button"
                    onClick={() => removeFilterChip("keyword")}
                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800"
                  >
                    Search: {keywordParam}
                  </button>
                ) : null}
                {minPriceParam || maxPriceParam ? (
                  <button
                    type="button"
                    onClick={() => removeFilterChip("price")}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                  >
                    Price: {minPriceParam || "0"} - {maxPriceParam || "Any"}
                  </button>
                ) : null}
                {inStockOnly ? (
                  <button
                    type="button"
                    onClick={() => removeFilterChip("inStock")}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    In stock only
                  </button>
                ) : null}
                {featuredParam === "true" ? (
                  <button
                    type="button"
                    onClick={() => removeFilterChip("featured")}
                    className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700"
                  >
                    Featured only
                  </button>
                ) : null}
                {selectedBrands.map((slug) => {
                  const found = brands.find((brand) => brand.slug === slug);
                  return (
                    <button
                      type="button"
                      onClick={() => removeFilterChip("brand", slug)}
                      key={slug}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Brand: {found?.name || slug}
                    </button>
                  );
                })}
                {activeDynamicFilters.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => removeFilterChip("dynamic", field.key)}
                    className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                  >
                    {field.label}: {searchParams.get(field.key)}
                  </button>
                ))}
		              </div>
		            </div>

		            {brands.length > 0 ? (
		              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
		                <div className="flex flex-col items-center gap-2">
		                  <p className="text-sm font-semibold text-slate-900">
		                    {categoryParam ? `${selectedCategoryName} brands` : "Shop by brand"}
		                  </p>
		                  <p className="text-xs text-slate-500">
		                    {categoryParam
		                      ? "All brands for the selected category."
		                      : "Browse brands across the catalog."}
		                  </p>
		                  {selectedBrands.length > 0 ? (
		                    <button
		                      type="button"
		                      onClick={() => goWithParams({ brands: "" })}
		                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
		                    >
		                      Clear brand filter
		                    </button>
		                  ) : null}
		                </div>
		                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
		                  {brands.map((brand) => {
		                    const active = selectedBrands.includes(brand.slug);
		                    return (
		                      <button
		                        key={`top-brand-${brand._id || brand.slug}`}
		                        type="button"
		                        onClick={() => toggleBrand(brand.slug)}
		                        aria-pressed={active}
		                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
		                          active
		                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
		                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
		                        }`}
		                      >
		                        {brand.name}
		                      </button>
		                    );
		                  })}
		                </div>
		              </div>
		            ) : null}
      {/* Grid */}
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
              const originalPrice = getOriginalPrice(p);
              const hasDiscount = originalPrice > price;
              const saveAmount = hasDiscount ? originalPrice - price : 0;
              const stockCount = getProductStock(p);
              const inStock = stockCount > 0;

              // ✅ slug first, fallback to id
              const url = p?.slug ? `/product/${p.slug}` : `/product/${p._id}`;
              const compareKey = getCompareKey(p);
              const isCompared = compareKeys.has(compareKey);
              const compareFull = compareItems.length >= COMPARE_LIMIT && !isCompared;

              return (
                <div key={p.slug || p._id} className="relative h-full">
                  <Link
                    to={url}
                    className="premium-card premium-card-hover group flex h-full flex-col rounded-[1.6rem] p-4"
                  >
                    <div className="relative overflow-hidden rounded-[1.2rem] bg-gray-50">
                      <img
                        src={img}
                        alt={p.name}
                        className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(e) => (e.currentTarget.src = fallbackImg)}
                      />
                      <div className="absolute left-3 top-3 z-10 flex max-w-[58%] flex-col gap-1">
                        {hasDiscount ? (
                          <span className="rounded-full bg-purple-700 px-3 py-1 text-xs font-bold text-white shadow">
                            Save: {money(saveAmount)}
                          </span>
                        ) : null}
                        {p?.promoLabel ? (
                          <span className="rounded-full bg-fuchsia-700 px-3 py-1 text-xs font-bold text-white shadow">
                            {p.promoLabel}
                          </span>
                        ) : null}
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold shadow ${
                              inStock ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"
                            }`}
                          >
                          {inStock ? `In stock (${stockCount})` : "Out of stock"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-1 flex-col">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-full bg-gradient-to-r from-amber-100 via-amber-50 to-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900 ring-1 ring-amber-200/80">
                          {p?.brand?.name || "Tech"}
                        </span>
                      </div>
                      <h3 className="min-h-[3.5rem] text-[1.05rem] font-semibold leading-7 text-gray-900 line-clamp-2">
                        {p.name}
                      </h3>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-baseline gap-2">
                          <p className="text-indigo-600 font-extrabold">{money(price)}</p>
                          {hasDiscount ? (
                            <span className="text-sm font-semibold text-gray-400 line-through">
                              {money(originalPrice)}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-gray-500 group-hover:text-gray-700">
                          View →
                        </span>
                      </div>

                    </div>
                  </Link>

		                  {!isAdmin ? (
		                    <button
		                      type="button"
		                      disabled={compareFull}
                      onClick={() => {
                        const res = toggleCompareItem(p);
                        if (!res.ok && res.reason === "limit") {
                          alert(`You can compare up to ${COMPARE_LIMIT} products.`);
                        }
                      }}
		                      className={`absolute right-3 top-3 z-20 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ring-1 ${
		                        isCompared
		                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-amber-300"
		                          : "bg-gradient-to-r from-slate-900/90 to-slate-700/90 text-white ring-white/40 shadow-lg shadow-slate-900/20"
	                      } ${compareFull ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"}`}
	                    >
	                      {isCompared ? "Compared" : "Compare"}
	                    </button>
	                  ) : null}
                </div>
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
    </div>
  );
}

