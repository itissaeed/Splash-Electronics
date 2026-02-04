import React, { useEffect, useMemo, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaUser,
  FaBars,
  FaTimes,
  FaPhone,
  FaMapMarkerAlt,
  FaTruck,
  FaShieldAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import api from "../utils/api";
import { UserContext } from "./context/UserContext";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

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

const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  // Close mobile menu on escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch featured products
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/products/featured");
        setFeaturedProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      }
    })();
  }, []);

  // Fetch categories
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories");
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
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

  return (
    <>
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <span className="text-indigo-200 text-xl sm:text-2xl font-extrabold tracking-tight hover:text-indigo-100 transition">
              Splash Electronics
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
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
                  <FaUser />
                  <span className="text-sm font-medium">Hello, {firstName}</span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 hidden group-hover:block">
                  <Link to="/profile" className="block px-4 py-3 text-sm hover:bg-gray-50">
                    Profile
                  </Link>
                  <Link to="/orders" className="block px-4 py-3 text-sm hover:bg-gray-50">
                    My Orders
                  </Link>

                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Admin Panel
                    </Link>
                  )}

                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
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

            {/* CTA */}
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

        {/* Mobile overlay */}
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

          {/* Mobile search */}
          <div className="mt-5">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                type="text"
                placeholder="Search products…"
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

          <nav className="mt-6 flex flex-col gap-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
              Home
            </Link>
            <Link to="/products" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
              Shop
            </Link>

            <div className="h-px bg-white/10 my-2" />

            {user ? (
              <>
                <div className="px-3 text-sm text-white/70">Signed in as</div>
                <div className="px-3 font-semibold">{user.name}</div>

                <Link to="/profile" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
                  Profile
                </Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/10">
                  My Orders
                </Link>

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
      <main className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow-xl">
            <div className="p-8 sm:p-12">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  New arrivals • Best deals • Genuine products
                </p>
                <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight">
                  Upgrade your tech with <span className="text-indigo-100">Splash Electronics</span>
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
                    to="/products?featured=true"
                    className="rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/15 transition"
                  >
                    View Featured
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <FaMoneyBillWave />
                    <div>
                      <div className="text-sm font-semibold">Cash on Delivery</div>
                      <div className="text-xs text-white/80">Easy checkout</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <FaShieldAlt />
                    <div>
                      <div className="text-sm font-semibold">Warranty Support</div>
                      <div className="text-xs text-white/80">Genuine products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                    <FaTruck />
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
              <Link to="/products" className="group rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 mb-3" />
                <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">All</div>
                <div className="mt-1 text-xs text-gray-500">Browse everything</div>
              </Link>

              {categories.length === 0 ? (
                Array.from({ length: 11 }).map((_, i) => <CategorySkeleton key={i} />)
              ) : (
                categories.slice(0, 11).map((cat) => (
                  <Link
                    key={cat._id || cat.slug || cat.name}
                    to={`/products?category=${encodeURIComponent(cat.slug || cat.name)}`}
                    className="group rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 mb-3" />
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                      {cat.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Explore {String(cat.name).toLowerCase()}</div>
                  </Link>
                ))
              )}
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

                  // ✅ Use BOTH: slug for SEO, fallback to _id if slug missing
                  const productKey = p?.slug || p?._id;
                  const url = p?.slug ? `/product/${p.slug}` : `/product/${p._id}`;

                  return (
                    <Link
                      key={productKey}
                      to={url}
                      className="group rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition"
                    >
                      <div className="relative overflow-hidden rounded-xl bg-gray-50">
                        <img
                          src={img}
                          alt={p.name}
                          className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = fallbackImg;
                          }}
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow">
                          Featured
                        </span>
                      </div>

                      <div className="mt-3">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{p.name}</h3>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-indigo-600 font-extrabold">{money(price)}</p>
                          <span className="text-xs text-gray-500 group-hover:text-gray-700">View →</span>
                        </div>
                      </div>
                    </Link>
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
                <p className="text-xs">9 AM - 8 PM</p>
                <p className="text-orange-500 font-bold text-lg">01751160811</p>
              </div>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="mr-3" />
              <div>
                <p className="text-xs">Store Locator</p>
                <p className="text-orange-500 font-semibold cursor-pointer">We will have a store!</p>
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
            <p className="text-sm font-bold">Splash Electronics</p>
            <p className="text-xs text-gray-400">Head Office: Ambottola, Jashore</p>
            <p className="mt-2 text-orange-500 font-semibold">sunjinwoo35@gmail.com</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Home;
