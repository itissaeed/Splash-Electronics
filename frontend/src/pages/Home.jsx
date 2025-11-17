import React, { useState } from "react";
import { FaSearch, FaUser, FaBars, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";

const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-gray-900 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">

        {/* NAVBAR FLEX CONTAINER */}
        <div className="flex items-center justify-between w-full">

          {/* LEFT — LOGO */}
          <Link to="/" className="flex-shrink-0">
            <span className="text-indigo-300 text-2xl md:text-3xl font-extrabold font-poppins tracking-wide 
              hover:text-indigo-500 transition duration-300 whitespace-nowrap">
              Splash Electronics
            </span>
          </Link>

          {/* MOBILE MENU BUTTON */}
          <button
            className="text-white text-2xl md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <FaBars />
          </button>

          {/* CENTER — SEARCH BAR (Hidden on mobile) */}
          <div className="hidden md:flex flex-1 justify-center px-6">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Search"
                className="w-full border border-gray-200 rounded-lg py-3 pl-4 pr-12 text-sm 
                  text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 
                  focus:border-indigo-500 transition"
              />
              <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer" />
            </div>
          </div>

          {/* RIGHT — ACCOUNT (Hidden on mobile) */}
          <div className="hidden md:flex">
            <Link
              to="/login"
              className="flex items-center text-white hover:text-indigo-400 transition p-2 rounded-lg whitespace-nowrap"
            >
              <FaUser className="mr-2 text-lg" />
              <span className="font-medium text-sm">Account (Login / Sign up)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE MENU DRAWER */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-800 p-6 transform transition-transform duration-300 
          ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Close Button */}
        <button
          className="text-white text-2xl mb-8"
          onClick={() => setMenuOpen(false)}
        >
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
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          <Link to="/login" className="flex items-center" onClick={() => setMenuOpen(false)}>
            <FaUser className="mr-2" /> Account (Login / Sign up)
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Home;
