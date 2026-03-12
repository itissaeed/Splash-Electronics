import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import useCompareItems from "../utils/useCompare";
import { clearCompareItems, removeCompareItem, COMPARE_LIMIT } from "../utils/compare";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

export default function CompareBar() {
  const location = useLocation();
  const items = useCompareItems();

  const hidden = useMemo(() => {
    return location.pathname.startsWith("/admin") || location.pathname.startsWith("/login");
  }, [location.pathname]);

  if (hidden || items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-4 z-50 w-[360px] max-w-[92vw]">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-2xl backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/85">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_14rem),radial-gradient(circle_at_left,rgba(251,191,36,0.14),transparent_12rem)]" />
        <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/60 dark:border-slate-800/60">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Compare
            </p>
            <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">
              Product shortlist
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {items.length}/{COMPARE_LIMIT} selected
            </p>
          </div>
          <button
            type="button"
            onClick={clearCompareItems}
            className="rounded-full border border-rose-200/60 bg-rose-50/80 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            Clear
          </button>
        </div>

        <div className="relative px-4 pt-3 pb-4">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <div
                key={item.key || item.slug || item.id}
                className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-2 py-1 text-xs shadow-sm dark:border-slate-800/60 dark:bg-slate-900/80"
              >
                <img
                  src={item.image || fallbackImg}
                  alt={item.name}
                  className="h-9 w-9 rounded-xl object-cover"
                  onError={(e) => (e.currentTarget.src = fallbackImg)}
                />
                <span className="max-w-[140px] truncate font-semibold text-gray-800 dark:text-slate-200">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeCompareItem(item.key || item.slug || item.id)}
                  className="ml-1 rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 dark:border-slate-800/60 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <Link
            to="/compare"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            Compare Now
          </Link>
        </div>
      </div>
    </div>
  );
}

