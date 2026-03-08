import React from "react";
import { useTheme } from "./pages/context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-5 right-5 z-[100] premium-card premium-card-hover inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-100"
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
          isDark ? "bg-cyan-100 text-cyan-700" : "bg-slate-900 text-white"
        }`}
      >
        {isDark ? "L" : "D"}
      </span>
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
