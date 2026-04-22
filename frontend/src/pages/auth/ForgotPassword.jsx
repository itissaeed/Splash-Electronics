import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import Breadcrumb from "../../BreadCrumb";
import { FaEnvelope } from "react-icons/fa";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const navigate = useNavigate();

  const canSubmit = useMemo(() => email.trim().includes("@") && !loading, [email, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrMsg("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data } = await api.post("/auth/forgot-password", { email: cleanEmail });

      setSuccessMsg(data?.message || "If that email exists, a password reset code has been sent.");
      navigate("/reset-password", {
        state: {
          pendingEmail: data?.email || cleanEmail,
          justRequestedReset: true,
        },
      });
    } catch (err) {
      setErrMsg(err?.response?.data?.message || "Failed to send reset code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Forgot Password" }]} />
      </div>

      <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Reset your password</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we&apos;ll send you a reset code.
            </p>
          </div>

          {successMsg ? (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMsg}
            </div>
          ) : null}

          {errMsg ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errMsg}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
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
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "cursor-not-allowed bg-indigo-300"
              }`}
            >
              {loading ? "Sending code..." : "Send reset code"}
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
