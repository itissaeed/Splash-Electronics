import React, { useMemo, useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Breadcrumb from "../../BreadCrumb";
import { UserContext } from "../context/UserContext";
import api from "../../utils/api";
import { FaEye, FaEyeSlash, FaLock, FaEnvelope } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Show success message after redirect from signup
  useEffect(() => {
    if (location.state?.justSignedUp) {
      setSuccessMsg("Registration successful! Please login.");
      // clear state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loading;
  }, [email, password, loading]);

  const from = location.state?.from?.pathname || "/";

const handleSubmit = async (e) => {
  e.preventDefault();
  setErrMsg("");
  setSuccessMsg("");
  setLoading(true);

  try {
    const { data } = await api.post("/auth/login", {
      email: email.trim(),
      password,
    });

    if (data?.status === "success") {
      login(data.user, data.token);

      // ✅ go back to the page user originally wanted
      navigate(from, { replace: true });
      return;
    }

    setErrMsg(data?.message || "Login failed. Please try again.");
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "An error occurred during login.";
    setErrMsg(msg);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Login" }]} />
      </div>

      {/* Page */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: Brand panel */}
          <div className="hidden lg:block">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-10 text-white shadow-xl">
              <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                Welcome back
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight">
                Sign in to Splash Electronics
              </h1>
              <p className="mt-3 text-white/90">
                Track orders, manage your profile, and enjoy a faster checkout experience.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <div className="font-semibold">Cash on Delivery</div>
                  <div className="text-sm text-white/80">Nationwide delivery</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <div className="font-semibold">Warranty Support</div>
                  <div className="text-sm text-white/80">Genuine tech products</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-gray-900">Account Login</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your email and password to continue
                </p>
              </div>

              {/* ✅ success message */}
              {successMsg && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMsg}
                </div>
              )}

              {/* error message */}
              {errMsg && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    E-Mail
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaEnvelope />
                    </span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Forgotten Password?
                    </Link>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaLock />
                    </span>

                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      required
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-50"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Tip: password is case-sensitive.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition
                    ${canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-300 cursor-not-allowed"}
                  `}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-500">New here?</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <Link
                to="/signup"
                className="block w-full rounded-xl border border-indigo-600 py-3 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
              >
                Create Your Account
              </Link>

              <p className="mt-6 text-center text-xs text-gray-500">
                By continuing, you agree to our{" "}
                <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                  Terms
                </span>{" "}
                and{" "}
                <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                  Privacy Policy
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
