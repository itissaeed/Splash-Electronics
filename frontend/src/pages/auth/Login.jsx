import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        window.location.href = "/";
      } else {
        console.error("Login failed:", data.message);
        alert("Login failed: " + data.message);
      }
    } catch (err) {
      console.error("Error during login:", err);
      alert("An error occurred during login.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-md px-8 py-10">
        {/* Title */}
        <h2 className="text-2xl font-semibold mb-8 text-gray-800 text-center">
          Account Login
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone / E-Mail */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="text"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              required
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-red-500 hover:underline"
              >
                Forgotten Password?
              </Link>
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-[#3F51B5] text-white py-2 rounded-md font-semibold hover:bg-[#2c3e99] transition duration-200"
          >
            Login
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-8">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-gray-500 text-sm">
            Don’t have an account?
          </span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Signup Button */}
        <Link
          to="/signup"
          className="block w-full border border-[#3F51B5] text-[#3F51B5] py-2 rounded-md text-center font-semibold hover:bg-indigo-50 transition duration-200"
        >
          Create Your Account
        </Link>
      </div>
    </div>
  );
}
