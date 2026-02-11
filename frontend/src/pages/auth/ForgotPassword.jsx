import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import Breadcrumb from "../../BreadCrumb";
import { FaEnvelope } from "react-icons/fa";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const canSubmit = useMemo(() => email.trim().includes("@") && !loading, [email, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrMsg("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });

      // backend returns a generic success message whether user exists or not
      setSuccessMsg(data?.message || "If that email exists, a reset link has been sent.");
    } catch (err) {
      setErrMsg(err?.response?.data?.message || "Failed to send reset link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Forgot Password" }]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex justify-center">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Reset your password</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we’ll send you a reset link.
            </p>
          </div>

          {successMsg && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          {errMsg && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errMsg}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your email
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
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition
                ${canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-300 cursor-not-allowed"}
              `}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
