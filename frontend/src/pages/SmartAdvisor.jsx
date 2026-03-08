import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBolt, FaCheckCircle, FaLayerGroup, FaMagic, FaMicrochip, FaSlidersH } from "react-icons/fa";
import api from "../utils/api";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "BDT 0";
  return `BDT ${num.toLocaleString("en-BD")}`;
};

const getDisplayPrice = (product) => {
  const variantPrices = (product?.variants || [])
    .map((v) => Number(v?.price))
    .filter((v) => Number.isFinite(v) && v > 0);
  const basePrice = Number(product?.basePrice || 0);
  if (!variantPrices.length) return basePrice;
  return Math.min(basePrice > 0 ? basePrice : Infinity, ...variantPrices);
};

const BUDGET_PRESETS = [
  { label: "15k - 25k", min: 15000, max: 25000 },
  { label: "25k - 40k", min: 25000, max: 40000 },
  { label: "40k - 60k", min: 40000, max: 60000 },
  { label: "60k+", min: 60000, max: "" },
];

const STEPS = [
  { id: 1, title: "Basics", icon: <FaLayerGroup /> },
  { id: 2, title: "Performance", icon: <FaMicrochip /> },
  { id: 3, title: "Usage", icon: <FaSlidersH /> },
];

export default function SmartAdvisor() {
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({
    brands: [],
    ramOptions: [],
    storageOptions: [],
    usageOptions: ["gaming", "study", "office", "media"],
    dynamicQuestions: [],
  });

  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [ram, setRam] = useState("");
  const [storage, setStorage] = useState("");
  const [usage, setUsage] = useState(["study", "media"]);
  const [dynamicAnswers, setDynamicAnswers] = useState({});

  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories");
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load categories:", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      try {
        const params = category ? { category } : {};
        const { data } = await api.get("/advisor/metadata", { params });
        setMeta({
          brands: Array.isArray(data?.brands) ? data.brands : [],
          ramOptions: Array.isArray(data?.ramOptions) ? data.ramOptions : [],
          storageOptions: Array.isArray(data?.storageOptions) ? data.storageOptions : [],
          usageOptions: Array.isArray(data?.usageOptions)
            ? data.usageOptions
            : ["gaming", "study", "office", "media"],
          dynamicQuestions: Array.isArray(data?.dynamicQuestions) ? data.dynamicQuestions : [],
        });

        setBrand("");
        setRam("");
        setStorage("");
        setDynamicAnswers({});
      } catch (e) {
        console.error("Failed to load advisor metadata:", e);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [category]);

  const selectedCategoryName = useMemo(() => {
    const found = categories.find((c) => c.slug === category);
    return found?.name || "All Categories";
  }, [categories, category]);

  const toggleUsage = (value) => {
    setUsage((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      return [...prev, value];
    });
  };

  const submitAdvisor = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!budgetMin && !budgetMax) {
      setError("Please enter at least a min or max budget.");
      setStep(1);
      return;
    }

    setLoadingResult(true);
    try {
      const { data } = await api.post("/advisor/recommend", {
        budgetMin,
        budgetMax,
        category,
        brand,
        ram,
        storage,
        usage,
        attributePreferences: dynamicAnswers,
      });
      setResult(data);
    } catch (e) {
      console.error("Failed to get recommendations:", e);
      setError(e?.response?.data?.message || "Could not generate recommendations.");
    } finally {
      setLoadingResult(false);
    }
  };

  const resetAll = () => {
    setBudgetMin("");
    setBudgetMax("");
    setCategory("");
    setBrand("");
    setRam("");
    setStorage("");
    setUsage(["study", "media"]);
    setDynamicAnswers({});
    setResult(null);
    setError("");
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-[#f0f5ff] relative overflow-hidden py-10">
      <div className="pointer-events-none absolute -top-28 -left-10 h-72 w-72 rounded-full bg-emerald-300/50 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-8 h-80 w-80 rounded-full bg-orange-300/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <section className="rounded-[2rem] border border-slate-900/10 bg-gradient-to-br from-[#0f1e48] via-[#163d85] to-[#1e5cc5] text-white p-7 sm:p-10 shadow-[0_20px_80px_rgba(20,50,120,0.35)]">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs tracking-wide">
              <FaMagic /> AI-like Shopping Guide
            </p>
            <h1 className="mt-4 font-display text-3xl sm:text-5xl font-extrabold leading-tight">
              Smart Product Advisor
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/90">
              Tell us your budget and needs. We score your options and show the best product matches with reasons.
            </p>
          </div>
        </section>

        <form onSubmit={submitAdvisor} className="mt-7 grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-3 rounded-[2rem] border border-slate-200 bg-white/85 backdrop-blur p-5 sm:p-7 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">Help me choose</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Adaptive questions for <span className="font-semibold text-slate-900">{selectedCategoryName}</span>
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                <FaCheckCircle /> Personalized flow
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border transition ${
                    step === s.id
                      ? "bg-slate-900 text-white border-slate-900 shadow"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {s.icon}
                  {s.id}. {s.title}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-r from-emerald-50 to-sky-50">
                  <label className="text-sm font-semibold text-slate-800">Quick Budget</label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {BUDGET_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setBudgetMin(preset.min);
                          setBudgetMax(preset.max);
                        }}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Budget Min (BDT)</label>
                    <input
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="30000"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Budget Max (BDT)</label>
                    <input
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="40000"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Brand Preference</label>
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      disabled={loadingMeta}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <option value="">Any Brand</option>
                      {meta.brands.map((b) => (
                        <option key={b._id} value={b.slug}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">RAM Need</label>
                    <select
                      value={ram}
                      onChange={(e) => setRam(e.target.value)}
                      disabled={loadingMeta}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <option value="">Any RAM</option>
                      {meta.ramOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Storage Need</label>
                    <select
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      disabled={loadingMeta}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      <option value="">Any Storage</option>
                      {meta.storageOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {meta.dynamicQuestions.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-4 bg-[#f8fbff]">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Category-Specific Preferences</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {meta.dynamicQuestions.map((q) => (
                        <div key={q.key}>
                          <label className="text-sm font-semibold text-slate-700">{q.label}</label>
                          <select
                            value={dynamicAnswers[q.key] || ""}
                            onChange={(e) =>
                              setDynamicAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                            }
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Any</option>
                            {q.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mt-5 rounded-2xl border border-slate-200 p-4 bg-gradient-to-r from-orange-50 to-amber-50">
                <label className="text-sm font-semibold text-slate-700">Usage</label>
                <p className="text-xs text-slate-500 mt-1">Pick one or more scenarios.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {meta.usageOptions.map((u) => {
                    const active = usage.includes(u);
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => toggleUsage(u)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                          active
                            ? "bg-orange-500 text-white border-orange-500 shadow"
                            : "bg-white text-slate-700 border-slate-300 hover:border-orange-400"
                        }`}
                      >
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              {step < 3 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Next
                </button>
              )}
              {step === 3 && (
                <button
                  type="submit"
                  disabled={loadingResult}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                >
                  <FaBolt />
                  {loadingResult ? "Scoring products..." : "Get Recommendations"}
                </button>
              )}
              <button
                type="button"
                onClick={resetAll}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>

          <aside className="xl:col-span-2 rounded-[2rem] border border-slate-200 bg-white/90 backdrop-blur p-5 sm:p-6 shadow-xl">
            <h3 className="font-display text-2xl font-bold text-slate-900">Top Picks</h3>
            <p className="mt-1 text-sm text-slate-600">Best 3 matches ranked by your inputs.</p>

            {!result && (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Complete the steps and generate recommendations.
              </div>
            )}

            <div className="mt-5 space-y-4">
              {(result?.recommendations || []).map((p, idx) => {
                const img = p?.variants?.[0]?.images?.[0]?.url || fallbackImg;
                const price = getDisplayPrice(p);
                return (
                  <Link
                    key={p._id}
                    to={p.slug ? `/product/${p.slug}` : "/products"}
                    className="block rounded-2xl border border-slate-200 p-3 bg-gradient-to-br from-white to-slate-50 hover:shadow-md hover:-translate-y-0.5 transition"
                  >
                    <div className="relative">
                      <img
                        src={img}
                        alt={p.name}
                        className="h-36 w-full rounded-xl object-cover bg-slate-100"
                        onError={(e) => (e.currentTarget.src = fallbackImg)}
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
                        #{idx + 1} Match
                      </span>
                    </div>

                    <h4 className="mt-3 text-sm font-bold text-slate-900 line-clamp-2">{p.name}</h4>
                    <div className="mt-1 text-sm font-extrabold text-blue-700">{money(price)}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      <FaCheckCircle /> Confidence: {p.confidence || 0}%
                    </div>

                    <ul className="mt-2 space-y-1">
                      {(p.reasons || []).map((reason) => (
                        <li key={reason} className="text-xs text-slate-600">
                          - {reason}
                        </li>
                      ))}
                    </ul>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-300">How it thinks</p>
              <p className="mt-2 text-sm text-slate-200">
                Budget fit, usage fit, RAM/storage match, and preference alignment are weighted to rank products.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
