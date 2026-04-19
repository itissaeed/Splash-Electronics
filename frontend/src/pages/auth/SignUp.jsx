import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Breadcrumb from "../../BreadCrumb";
import api from "../../utils/api";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import { UserContext } from "../context/UserContext";
import { FaUser, FaEnvelope, FaPhoneAlt, FaLock, FaEye, FaEyeSlash, FaKey } from "react-icons/fa";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [stage, setStage] = useState("form");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

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

  const canVerifyOtp = useMemo(() => otp.trim().length >= 6 && !loading, [otp, loading]);

  useEffect(() => {
    if (location.state?.pendingEmail) {
      setPendingEmail(location.state.pendingEmail);
      setEmail(location.state.pendingEmail);
      setStage("otp");
      setSuccessMsg("Check your email for the latest verification code.");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/signup", {
        name: fullName,
        email: email.trim(),
        number: phone.trim(),
        password,
      });

      setPendingEmail(data?.email || email.trim().toLowerCase());
      setStage("otp");
      setSuccessMsg(data?.message || "We sent a verification code to your email.");
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/signup/verify-otp", {
        email: pendingEmail || email.trim(),
        otp: otp.trim(),
      });

      login(data.user, data.token);
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to verify the code.";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/signup/resend-otp", {
        email: pendingEmail || email.trim(),
      });
      setSuccessMsg(data?.message || "A new verification code has been sent.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resend verification code.";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setErrMsg("");
    setSuccessMsg("");

    const { data } = await api.post("/auth/google", { credential });
    login(data.user, data.token);
    navigate("/", { replace: true });
  };

  const handleGoogleError = (error) => {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Google sign-in failed. Please try again.";
    setErrMsg(msg);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <Breadcrumb items={[{ to: "/login", label: "Account" }, { label: "Register" }]} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="hidden lg:block">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-10 text-white shadow-xl">
              <p className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                {stage === "otp" ? "Verify your email" : "Create your account"}
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight">
                {stage === "otp" ? "One step left to get started" : "Join Splash Electronics"}
              </h1>
              <p className="mt-3 text-white/90">
                {stage === "otp"
                  ? "Enter the code from your inbox to activate your account and sign in instantly."
                  : "Faster checkout and exclusive deals made for Bangladesh."}
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <div className="font-semibold">Verified signup</div>
                  <div className="text-sm text-white/80">Email OTP keeps fake accounts out</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <div className="font-semibold">Google sign-in</div>
                  <div className="text-sm text-white/80">Create or access your account in one click</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  {stage === "otp" ? "Verify Your Email" : "Register Account"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {stage === "otp"
                    ? `We sent a 6-digit code to ${pendingEmail || email.trim()}.`
                    : "Create an account in less than a minute"}
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

              {stage === "form" ? (
                <>
                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                        canSubmit ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-300 cursor-not-allowed"
                      }`}
                    >
                      {loading ? "Sending verification code..." : "Continue with Email OTP"}
                    </button>
                  </form>

                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs text-gray-500">or</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <GoogleSignInButton
                    disabled={loading}
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                  />
                </>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <FaKey />
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm tracking-[0.3em] text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      The code verifies your email and activates your account.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!canVerifyOtp}
                    className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                      canVerifyOtp ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-300 cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Verifying..." : "Verify and Sign In"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="w-full rounded-xl border border-indigo-600 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resend Code
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStage("form");
                      setOtp("");
                      setErrMsg("");
                      setSuccessMsg("");
                    }}
                    disabled={loading}
                    className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Edit signup details
                  </button>
                </form>
              )}

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
