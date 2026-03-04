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
      className="fixed bottom-5 right-5 z-[100] rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-100 hover:scale-[1.02] transition"
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
