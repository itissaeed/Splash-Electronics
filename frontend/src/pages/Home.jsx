import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaUser,
  FaBars,
  FaTimes,
  FaShoppingCart,
  FaPhone,
  FaMapMarkerAlt,
  FaTruck,
  FaShieldAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import api from "../utils/api";
import { UserContext } from "./context/UserContext";
import useCompareItems from "../utils/useCompare";
import {
  COMPARE_LIMIT,
  getCompareKey,
  toggleCompareItem,
} from "../utils/compare";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

const getOriginalPrice = (product) => Number(product?.originalPrice || 0);

const CategorySkeleton = () => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse">
    <div className="h-1 w-12 rounded-full bg-gray-200 mb-3" />
    <div className="h-4 w-2/3 rounded bg-gray-200" />
    <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
  </div>
);

const ProductSkeleton = () => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse">
    <div className="h-44 rounded-xl bg-gray-200" />
    <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
    <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
  </div>
);

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const accountMenuRef = useRef(null);
  const compareItems = useCompareItems();

  const compareKeys = useMemo(
    () => new Set(compareItems.map((item) => getCompareKey(item))),
    [compareItems]
  );

  // NEW: public settings from admin panel
  const [settings, setSettings] = useState(null);

  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };
    const onMouseDown = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  // Load PUBLIC settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings/public");
        setSettings(data);
      } catch (e) {
        console.error("Failed to load public settings", e);
        setSettings(null);
      }
    })();
  }, []);

  // Featured products
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/products/featured");
        setFeaturedProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch featured products:", e);
      }
    })();
  }, []);

  // Categories
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

  const firstName = useMemo(() => {
    if (!user?.name) return "";
    return user.name.split(" ")[0];
  }, [user]);

  const goSearch = () => {
    const q = search.trim();
    if (!q) return;
    navigate(`/products?keyword=${encodeURIComponent(q)}`);
    setMenuOpen(false);
  };

  const storeName = settings?.storeName || "Splash Electronics";
  const supportPhone = settings?.supportPhone || "01751160811";
  const supportHours = settings?.supportHours || "9 AM - 8 PM";
  const supportEmail = settings?.supportEmail || "sunjinwoo35@gmail.com";
  const addressText = [settings?.addressLine1, settings?.district, settings?.country]
    .filter(Boolean)
    .join(", ") || "Ambottola, Jashore";

  // Optional maintenance mode
  if (settings?.maintenanceEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white border rounded-3xl p-8 shadow-sm text-center">
          <div className="text-2xl font-extrabold text-gray-900">{storeName}</div>
          <p className="mt-3 text-gray-600">{settings?.maintenanceMessage}</p>
          <div className="mt-6 text-sm text-gray-500">
            Need help? Call <span className="font-semibold">{supportPhone}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Announcement Bar */}
      {settings?.announcementBarText ? (
        <div className="bg-indigo-600 text-white text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center">
            {settings.announcementBarText}
          </div>
        </div>
      ) : null}

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={storeName}
                className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/20"
              />
            ) : null}
            <span className="text-indigo-200 text-xl sm:text-2xl font-extrabold tracking-tight hover:text-indigo-100 transition">
              {storeName}
            </span>
          </Link>

          {/* Search (Desktop) */}
          <div className="hidden md:flex flex-1 justify-center px-6">
            <div className="relative w-full max-w-2xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                type="text"
                placeholder="Search phones, laptops, gadgets…"
                className="w-full rounded-xl bg-white/95 py-3 pl-4 pr-12 text-sm text-gray-900 outline-none ring-1 ring-transparent focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={goSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Search"
              >
                <FaSearch />
              </button>
            </div>
          </div>

          {/* Account (Desktop) */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <Link
              to={user ? "/cart" : "/login"}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition"
            >
              <FaShoppingCart />
              <span className="text-sm font-medium">Cart</span>
            </Link>

            {user ? (
              <div ref={accountMenuRef} className="relative">
                <button
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition"
                >
                  <FaUser />
                  <span className="text-sm font-medium">Hello, {firstName}</span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                    <Link
                      to="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      Profile
                    </Link>

                    {!user.isAdmin && (
                      <Link
                        to="/orders"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        My Orders
                      </Link>
                    )}

                    {user.isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Admin Panel
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition"
              >
                <FaUser />
                <span className="text-sm font-medium">Login / Sign Up</span>
              </Link>
            )}

            <Link
              to="/products"
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition"
            >
              Shop
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden ml-auto rounded-xl p-2 text-white/90 hover:bg-white/10 hover:text-white transition"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <FaBars className="text-xl" />
          </button>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 bg-black/60 md:hidden" onClick={() => setMenuOpen(false)} />
        )}

        {/* Mobile drawer */}
        <div
          className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-950 text-white p-5 md:hidden transform transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg">Menu</span>
            <button
              className="rounded-xl p-2 hover:bg-white/10 transition"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          <div className="mt-5">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                type="text"
                placeholder="Search products…"
                className="w-full rounded-xl bg-white/95 py-3 pl-4 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={goSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Search"
              >
                <FaSearch />
              </button>
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
              Home
            </Link>
            <Link to="/products" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
              Shop
            </Link>
            <Link to={user ? "/cart" : "/login"} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
              Cart
            </Link>

            <div className="h-px bg-white/10 my-2" />

            {user ? (
              <>
                <div className="px-3 text-sm text-white/70">Signed in as</div>
                <div className="px-3 font-semibold">{user.name}</div>

                <Link to="/profile" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
                  Profile
                </Link>

                {!user.isAdmin && (
                  <Link to="/orders" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
                    My Orders
                  </Link>
                )}

                {user.isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2 text-red-300 hover:bg-red-500/10"
                  >
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="text-left rounded-xl px-3 py-2 text-red-300 hover:bg-red-500/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 hover:bg-white/10 flex items-center gap-2"
              >
                <FaUser /> Login / Sign Up
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="page-ambient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-[#08111f] via-[#0f3556] to-[#126b78] text-white shadow-xl">
            <div className="p-8 sm:p-12">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {settings?.homepageBannerText || "New arrivals • Best deals • Genuine products"}
                </p>
                <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight">
                  Upgrade your tech with <span className="text-indigo-100">{storeName}</span>
                </h1>
                <p className="mt-4 text-white/90 text-base sm:text-lg">
                  Phones, laptops, earbuds, smart watches and more — delivered across Bangladesh.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/products"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow hover:bg-gray-100 transition"
                  >
                    Shop Now
                  </Link>
                  <Link
                    to="/advisor"
                    className="rounded-xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-cyan-200 transition"
                  >
                    Help me choose
                  </Link>
                  <Link
                    to="/products?featured=true"
                    className="rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/15 transition"
                  >
                    View Featured
                  </Link>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <FaMoneyBillWave className="text-cyan-200" />
                    <div>
                      <div className="text-sm font-semibold">Cash on Delivery</div>
                      <div className="text-xs text-white/80">Easy checkout</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <FaShieldAlt className="text-cyan-200" />
                    <div>
                      <div className="text-sm font-semibold">Warranty Support</div>
                      <div className="text-xs text-white/80">Genuine products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <FaTruck className="text-emerald-200" />
                    <div>
                      <div className="text-sm font-semibold">Fast Delivery</div>
                      <div className="text-xs text-white/80">Nationwide</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-black/10 blur-2xl" />
          </section>

          {/* CATEGORIES */}
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Shop by Category</h2>
              <Link to="/products" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                View all
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <Link to="/products" className="premium-card premium-card-hover group rounded-2xl p-4">
                <div className="h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 mb-3" />
                <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">All</div>
                <div className="mt-1 text-xs text-gray-500">Browse everything</div>
              </Link>

              {categories.length === 0
                ? Array.from({ length: 11 }).map((_, i) => <CategorySkeleton key={i} />)
                : categories.slice(0, 11).map((cat) => (
                    <Link
                      key={cat._id || cat.slug || cat.name}
                      to={`/products?category=${encodeURIComponent(cat.slug || cat.name)}`}
                      className="premium-card premium-card-hover group rounded-2xl p-4"
                    >
                      <div className="h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 mb-3" />
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                        {cat.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Explore {String(cat.name).toLowerCase()}</div>
                    </Link>
                  ))}
            </div>
          </section>

          {/* FEATURED PRODUCTS */}
          <section className="mt-10 pb-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Featured Products</h2>
              <Link to="/products?featured=true" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                See more
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              ) : (
                featuredProducts.map((p) => {
                  const img =
                    p?.variants?.[0]?.images?.[0]?.url ||
                    p?.images?.[0]?.url ||
                    fallbackImg;

                  const price = p?.basePrice ?? p?.variants?.[0]?.price ?? p?.price ?? 0;
                  const originalPrice = getOriginalPrice(p);
                  const hasDiscount = originalPrice > price;
                  const saveAmount = hasDiscount ? originalPrice - price : 0;
                  const productKey = p?.slug || p?._id;
                  const url = p?.slug ? `/product/${p.slug}` : `/product/${p._id}`;
                  const compareKey = getCompareKey(p);
                  const isCompared = compareKeys.has(compareKey);
                  const compareFull = compareItems.length >= COMPARE_LIMIT && !isCompared;

                  return (
                    <div key={productKey} className="relative">
                      <Link
                        to={url}
                        className="premium-card premium-card-hover group block rounded-2xl p-4"
                      >
                        <div className="relative overflow-hidden rounded-xl bg-gray-50">
                          <img
                            src={img}
                            alt={p.name}
                            className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                            onError={(e) => (e.currentTarget.src = fallbackImg)}
                          />
                          <div className="absolute left-3 top-3 flex max-w-[75%] flex-col gap-1">
                            <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow">
                              Featured
                            </span>
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
                          </div>
                        </div>

                        <div className="mt-3">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="flex items-baseline gap-2">
                              <p className="text-indigo-600 font-extrabold">{money(price)}</p>
                              {hasDiscount ? (
                                <span className="text-sm font-semibold text-gray-400 line-through">
                                  {money(originalPrice)}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs text-gray-500 group-hover:text-gray-700">View →</span>
                          </div>
                        </div>
                      </Link>

                        <button
                          type="button"
                          disabled={compareFull}
                          onClick={() => {
                            const res = toggleCompareItem(p);
                            if (!res.ok && res.reason === "limit") {
                              alert(`You can compare up to ${COMPARE_LIMIT} products.`);
                            }
                          }}
                        className={`absolute right-5 top-5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ring-1 ${
                          isCompared
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-amber-300"
                            : "bg-gradient-to-r from-slate-900/90 to-slate-700/90 text-white ring-white/40 shadow-lg shadow-slate-900/20"
                        } ${compareFull ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"}`}
                        >
                          {isCompared ? "Compared" : "Compare"}
                        </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0b1420] text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-sm font-semibold mb-4">SUPPORT</h3>
            <div className="flex items-center mb-4">
              <FaPhone className="mr-3" />
              <div>
                <p className="text-xs">{supportHours}</p>
                <p className="text-cyan-300 font-bold text-lg">{supportPhone}</p>
              </div>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="mr-3" />
              <div>
                <p className="text-xs">Store Address</p>
                <p className="text-cyan-300 font-semibold">{addressText}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-4">ABOUT US</h3>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white cursor-pointer">Online Delivery</li>
              <li className="hover:text-white cursor-pointer">Refund & Return Policy</li>
              <li className="hover:text-white cursor-pointer">Blog</li>
              <li className="hover:text-white cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white cursor-pointer">Star Point Policy</li>
              <li className="hover:text-white cursor-pointer">Contact Us</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-4">COMPANY</h3>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white cursor-pointer">About Us</li>
              <li className="hover:text-white cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-white cursor-pointer">Career</li>
              <li className="hover:text-white cursor-pointer">Brands</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-4">STAY CONNECTED</h3>
            <p className="text-sm font-bold">{storeName}</p>
            <p className="text-xs text-gray-400">{addressText}</p>
            <p className="mt-2 text-cyan-300 font-semibold">{supportEmail}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
