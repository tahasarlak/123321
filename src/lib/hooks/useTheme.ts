// src/hooks/useTheme.ts (اگر نداری)
"use client";
import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    document.documentElement.classList.toggle("dark");
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return { theme, toggle };
}