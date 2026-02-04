import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../../BreadCrumb";
import api from "../../utils/api"; // ✅ adjust path if needed
import { FaUser, FaEnvelope, FaPhoneAlt, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const navigate = useNavigate();

  const fullName = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    return [fn, ln].filter(Boolean).join(" ");
  }, [firstName, lastName]);

  const canSubmit = useMemo(() => {
    return (
      fullName.length >= 2 &&
      email.trim().includes("@") &&
      phone.trim().length >= 7 &&
      password.trim().length >= 6 &&
      !loading
    );
  }, [fullName, email, phone, password, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);

    try {
      await api.post("/auth/signup", {
        name: fullName,
        email: email.trim(),
        number: phone.trim(),
        password,
      });

      // ✅ redirect to login after successful registration
      navigate("/login", { state: { justSignedUp: true } });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred during registration.";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Register" }]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: brand panel */}
          <div className="hidden lg:block">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-10 text-white shadow-xl">
              <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                Create your account
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight">
                Join Splash Electronics
              </h1>
              <p className="mt-3 text-white/90">
                Faster checkout, order tracking, and exclusive deals — made for Bangladesh.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <div className="font-semibold">Track your orders</div>
                  <div className="text-sm text-white/80">Delivery updates & history</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <div className="font-semibold">Save your address</div>
                  <div className="text-sm text-white/80">Quick checkout next time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  Register Account
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create an account in less than a minute
                </p>
              </div>

              {errMsg && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errMsg}
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <FaUser />
                      </span>
                      <input
                        type="text"
                        placeholder="Md."
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Sayed"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

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

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone (Bangladesh)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaPhoneAlt />
                    </span>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      required
                      autoComplete="tel"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Example: 017XXXXXXXX or +88017XXXXXXXX
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaLock />
                    </span>

                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      required
                      autoComplete="new-password"
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
                    Minimum 6 characters.
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
                  {loading ? "Creating account..." : "Continue"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                  Login
                </Link>
              </div>

              <p className="mt-6 text-center text-xs text-gray-500">
                By creating an account, you agree to our{" "}
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
