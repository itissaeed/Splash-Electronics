import React, { useState, useEffect, useContext } from "react";
import { FaSearch, FaUser, FaBars, FaTimes, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { UserContext } from "./context/UserContext";

const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const { user, logout } = useContext(UserContext);

  // Fetch featured products from backend
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const { data } = await api.get("/products/featured");
        setFeaturedProducts(data);
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      }
    };
    fetchFeaturedProducts();
  }, []);

  return (
    <>
      {/* NAVBAR */}
      <header className="bg-gray-900 shadow-lg sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between w-full">

    {/* LOGO */}
    <Link to="/" className="flex-shrink-0">
      <span className="text-indigo-300 text-2xl md:text-3xl font-extrabold hover:text-indigo-500 transition">
        Splash Electronics
      </span>
    </Link>

    {/* SEARCH BAR (Desktop) */}
    <div className="hidden md:flex flex-1 justify-center px-6">
      <div className="relative w-full max-w-2xl">
        <input
          type="text"
          placeholder="Search"
          className="w-full border border-gray-200 rounded-lg py-3 pl-4 pr-12 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500"
        />
        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" />
      </div>
    </div>

    {/* ACCOUNT BUTTON (Desktop) */}
    <div className="hidden md:flex items-center relative">
      {user ? (
        <div className="group relative">
          <button className="text-white font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            <FaUser /> Hello, {user.name.split(" ")[0]}
          </button>

          {/* DROPDOWN */}
          <div className="absolute hidden group-hover:block right-0 mt-2 w-40 bg-white shadow-lg rounded-lg py-2 text-gray-800 z-50">

            <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
              Profile
            </Link>

            <Link to="/orders" className="block px-4 py-2 hover:bg-gray-100">
              My Orders
            </Link>

            {/* Admin Only */}
            {user.isAdmin && (
              <Link
                to="/admin"
                className="block px-4 py-2 text-red-600 font-semibold hover:bg-gray-100"
              >
                Admin Panel
              </Link>
            )}

            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="flex items-center text-white hover:text-indigo-400 transition p-2 rounded-lg"
        >
          <FaUser className="mr-2 text-lg" />
          Account (Login / Sign Up)
        </Link>
      )}
    </div>

    {/* MOBILE MENU BUTTON */}
    <button
      className="text-white text-2xl md:hidden"
      onClick={() => setMenuOpen(true)}
    >
      <FaBars />
    </button>
  </div>

  {/* MOBILE MENU DRAWER */}
  <div
    className={`fixed top-0 right-0 h-full w-64 bg-gray-800 p-6 transform transition-transform duration-300 ${
      menuOpen ? "translate-x-0" : "translate-x-full"
    }`}
  >
    <button className="text-white text-2xl mb-8" onClick={() => setMenuOpen(false)}>
      <FaTimes />
    </button>

    {/* Mobile Search */}
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          placeholder="Search"
          className="w-full py-3 pl-4 pr-12 rounded-lg text-gray-800"
        />
        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" />
      </div>
    </div>

    {/* Mobile Links */}
    <nav className="flex flex-col space-y-4 text-white">
      <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>

      {user ? (
        <>
          <span className="text-lg font-semibold">Hello, {user.name}</span>

          {user.role === "admin" && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="text-red-400 font-semibold hover:text-red-500"
            >
              Admin Panel
            </Link>
          )}

          <button
            onClick={() => {
              logout();
              setMenuOpen(false);
            }}
            className="text-sm text-red-400 hover:text-red-500"
          >
            Logout
          </button>
        </>
      ) : (
        <Link
          to="/login"
          className="flex items-center"
          onClick={() => setMenuOpen(false)}
        >
          <FaUser className="mr-2" /> Account (Login / Sign Up)
        </Link>
      )}
    </nav>
  </div>
</header>


      {/* HOME PAGE CONTENT */ }
      < main className = "max-w-7xl mx-auto px-6 py-8" >
        {/* HERO BANNER */ }
        < div className = "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-10 shadow-lg mb-12" >
          <h1 className="text-4xl font-bold mb-4">Welcome to Splash Electronics</h1>
          <p className="text-lg mb-6">
            Your one-stop shop for laptops, phones, headphones, gadgets & more!
          </p>
          <Link
            to="/"
            className="bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-200"
          >
            Shop Now
          </Link>
        </div >

  {/* CATEGORIES */ }
  < h2 className = "text-2xl font-bold mb-4" > Shop by Category</h2 >
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 mb-12">
      {["Laptops", "Phones", "Keyboards", "Mouse", "Headphones", "Speakers"].map(
        (cat) => (
          <Link
            key={cat}
            to={`/products?category=${encodeURIComponent(cat)}`}
            className="bg-gray-100 p-6 rounded-xl text-center shadow hover:shadow-lg cursor-pointer font-semibold hover:bg-indigo-100 transition"
          >
            {cat}
          </Link>
        )
      )}
    </div>

{/* FEATURED PRODUCTS */ }
        <h2 className="text-2xl font-bold mb-4">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((p) => (
              <Link
                key={p._id}
                to={`/product/${p._id}`}
                className="bg-white shadow rounded-xl p-4 hover:shadow-lg transition"
              >
                <img
                  src={p.images[0]?.url || "https://via.placeholder.com/150"}
                  alt={p.name}
                  className="h-40 w-full object-cover rounded mb-4"
                />
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-indigo-600 font-bold">${p.price}</p>
              </Link>
            ))
          ) : (
            <p>Loading featured products...</p>
          )}
        </div>
      </main >

  {/* FOOTER */ }
  < footer className = "bg-[#0b1420] text-gray-300 py-12" >
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* SUPPORT */}
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

      {/* ABOUT US */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-4">ABOUT US</h3>
        <ul className="space-y-2 text-sm">
          <li>Online Delivery</li>
          <li>Refund and Return Policy</li>
          <li>Blog</li>
          <li>Privacy Policy</li>
          <li>Star Point Policy</li>
          <li>Contact Us</li>
        </ul>
      </div>

      {/* COMPANY INFO */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-4">COMPANY</h3>
        <ul className="space-y-2 text-sm">
          <li>About Us</li>
          <li>Terms and Conditions</li>
          <li>Career</li>
          <li>Brands</li>
        </ul>
      </div>

      {/* STAY CONNECTED */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-4">STAY CONNECTED</h3>
        <p className="text-sm font-bold">Splash Electronics</p>
        <p className="text-xs">Head Office: Ambottola,Jashore</p>
        <p className="mt-2 text-orange-500 font-semibold">sunjinwoo35@gmail.com</p>
      </div>
    </div>
      </footer >
    </>
  );
};

export default Home;
