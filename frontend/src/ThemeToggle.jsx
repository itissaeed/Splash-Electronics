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
      className="fixed right-3 top-1/2 z-[100] flex h-[72px] w-[72px] -translate-y-1/2 flex-col items-center justify-center rounded-full text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_18px_36px_rgba(249,115,22,0.32)] transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-200 dark:focus:ring-orange-400/40 sm:right-5 sm:h-[86px] sm:w-[86px]"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #fb923c 0%, #ea580c 100%)"
          : "linear-gradient(180deg, #f97316 0%, #ef4444 100%)",
      }}
    >
      <span className="mb-1 flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9">
        {isDark ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
            <path d="M12 17.75a.75.75 0 0 1-.75-.75V15a.75.75 0 0 1 1.5 0v2a.75.75 0 0 1-.75.75Zm0-8.75a.75.75 0 0 1-.75-.75v-2a.75.75 0 0 1 1.5 0v2A.75.75 0 0 1 12 9Zm5 3.75a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5h-2Zm-12 0a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5H5Zm9.03 4.28a.75.75 0 0 1 .53-1.28.75.75 0 0 1 .53.22l1.42 1.41a.75.75 0 1 1-1.06 1.06l-1.42-1.41Zm-8.48-8.49a.75.75 0 0 1 0-1.06.75.75 0 0 1 1.06 0l1.42 1.41a.75.75 0 0 1-1.06 1.06L5.55 8.54Zm9.54 1.42a.75.75 0 0 1-1.06-1.06l1.42-1.42a.75.75 0 1 1 1.06 1.06l-1.42 1.42Zm-8.48 8.49-1.42 1.41a.75.75 0 1 1-1.06-1.06l1.42-1.41a.75.75 0 1 1 1.06 1.06ZM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
            <path d="M21 12.8A8.99 8.99 0 0 1 11.2 3a.75.75 0 0 0-.81-.97A9 9 0 1 0 21.97 13.6a.75.75 0 0 0-.97-.8Z" />
          </svg>
        )}
      </span>
      <span className="leading-none">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
