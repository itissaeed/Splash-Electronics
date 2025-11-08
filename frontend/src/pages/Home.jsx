import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-6 text-center">
      {/* Welcome Message */}
      <h1 className="text-5xl font-extrabold mb-4 text-gray-800 drop-shadow-lg">
        Welcome to Splash Electronics
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Your one-stop shop for the latest gadgets
      </p>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/shop"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition transform hover:-translate-y-1 hover:scale-105"
        >
          Shop Now
        </Link>
        <Link
          to="/login"
          className="bg-white border border-blue-600 text-blue-600 px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition transform hover:-translate-y-1 hover:scale-105"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="bg-white border border-blue-600 text-blue-600 px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition transform hover:-translate-y-1 hover:scale-105"
        >
          Signup
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-12 text-gray-500 text-sm">
        &copy; 2025 Splash Electronics. All rights reserved.
      </p>
    </div>
  );
}
