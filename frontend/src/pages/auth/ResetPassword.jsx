import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";
import Breadcrumb from "../../BreadCrumb";
import { FaEye, FaEyeSlash, FaKey, FaLock } from "react-icons/fa";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (location.state?.pendingEmail) {
      setEmail(location.state.pendingEmail);
    }
    if (location.state?.justRequestedReset) {
      setSuccessMsg("Check your email for the latest password reset code.");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (token) {
      return password.trim().length >= 6 && confirmPassword.trim().length >= 6;
    }
    return (
      email.trim().includes("@") &&
      otp.trim().length >= 6 &&
      password.trim().length >= 6 &&
      confirmPassword.trim().length >= 6
    );
  }, [confirmPassword, email, loading, otp, password, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrMsg("");

    if (password !== confirmPassword) {
      setErrMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const payload = token
        ? { token, password }
        : {
            email: email.trim().toLowerCase(),
            otp: otp.trim(),
            password,
          };

      const { data } = await api.post("/auth/reset-password", payload);

      if (data?.status === "success") {
        setSuccessMsg(data?.message || "Password reset successfully. Redirecting...");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setErrMsg(data?.message || "Reset code is invalid or expired.");
      }
    } catch (err) {
      setErrMsg(err?.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setErrMsg("Enter the same email address you used to request the reset code.");
      return;
    }

    setResendingOtp(true);
    setErrMsg("");
    setSuccessMsg("");

    try {
      const { data } = await api.post("/auth/forgot-password/resend-otp", { email: cleanEmail });
      setSuccessMsg(data?.message || "A new password reset code has been sent.");
    } catch (err) {
      setErrMsg(err?.response?.data?.message || "Failed to resend reset code.");
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Reset Password" }]} />
      </div>

      <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Set a new password</h2>
            <p className="mt-1 text-sm text-gray-500">
              {token
                ? "Use the reset link to choose your new password."
                : "Enter the reset code from your email and choose a new password."}
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!token ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Reset code
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaKey />
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit code"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm tracking-[0.3em] text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                New Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaLock />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "cursor-not-allowed bg-indigo-300"
              }`}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {!token ? (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendingOtp || loading}
              className="mt-4 w-full rounded-xl border border-indigo-600 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendingOtp ? "Resending code..." : "Resend reset code"}
            </button>
          ) : null}

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
