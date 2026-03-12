import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "./pages/context/ThemeContext";

const STORAGE_KEY = "splash_theme_toggle_pos";
const DEFAULT_MARGIN = 20;
const MIN_MARGIN = 8;

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const buttonRef = useRef(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerIdRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const [position, setPosition] = useState({ left: null, top: null });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.left === "number" && typeof parsed?.top === "number") {
          setPosition(parsed);
          return;
        }
      } catch {
        // ignore bad data
      }
    }

    const setDefaultPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 180;
      const height = rect?.height ?? 56;
      const left = Math.max(
        MIN_MARGIN,
        window.innerWidth - width - DEFAULT_MARGIN
      );
      const top = Math.max(
        MIN_MARGIN,
        window.innerHeight - height - DEFAULT_MARGIN
      );
      setPosition({ left, top });
    };

    setDefaultPosition();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (position.left === null || position.top === null) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition((prev) => {
        if (prev.left === null || prev.top === null) return prev;
        const maxLeft = Math.max(MIN_MARGIN, window.innerWidth - rect.width - MIN_MARGIN);
        const maxTop = Math.max(MIN_MARGIN, window.innerHeight - rect.height - MIN_MARGIN);
        return {
          left: Math.min(Math.max(MIN_MARGIN, prev.left), maxLeft),
          top: Math.min(Math.max(MIN_MARGIN, prev.top), maxTop),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (event) => {
    if (position.left === null || position.top === null) return;
    const target = event.currentTarget;
    pointerIdRef.current = event.pointerId;
    target.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    movedRef.current = false;
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: position.left,
      top: position.top,
    };
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== event.pointerId) return;

    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;

    const rect = buttonRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    const maxLeft = Math.max(MIN_MARGIN, window.innerWidth - width - MIN_MARGIN);
    const maxTop = Math.max(MIN_MARGIN, window.innerHeight - height - MIN_MARGIN);

    setPosition({
      left: Math.min(Math.max(MIN_MARGIN, startRef.current.left + dx), maxLeft),
      top: Math.min(Math.max(MIN_MARGIN, startRef.current.top + dy), maxTop),
    });
  };

  const handlePointerUp = (event) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== event.pointerId) return;
    draggingRef.current = false;
    setIsDragging(false);
    pointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    toggleTheme();
  };

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed z-[100] premium-card premium-card-hover inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-100"
      style={{
        left: position.left ?? undefined,
        top: position.top ?? undefined,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
      }}
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
