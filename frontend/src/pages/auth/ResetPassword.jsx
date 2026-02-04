import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";
import Breadcrumb from "../../BreadCrumb";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const canSubmit = useMemo(() => {
    return password.trim().length >= 6 && confirmPassword.trim().length >= 6 && !loading;
  }, [password, confirmPassword, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrMsg("");

    if (password !== confirmPassword) {
      setErrMsg("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        password,
      });

      if (data?.status === "success") {
        setSuccessMsg(data?.message || "Password reset successfully. Redirecting...");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setErrMsg(data?.message || "Token is invalid or expired.");
      }
    } catch (err) {
      setErrMsg(err?.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Reset Password" }]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex justify-center">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Set a new password</h2>
            <p className="mt-1 text-sm text-gray-500">Minimum 6 characters.</p>
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition
                ${canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-300 cursor-not-allowed"}
              `}
            >
              {loading ? "Resetting..." : "Reset Password"}
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
