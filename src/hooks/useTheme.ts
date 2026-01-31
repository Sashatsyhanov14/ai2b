"use client";
import { useEffect, useState } from "react";

export type Theme = "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }, []);

  function apply() {
    const root = document.documentElement;
    root.classList.remove("light");
    root.style.colorScheme = "dark";
    setTheme("dark");
  }

  return {
    theme,
    setTheme: apply,
    toggle: () => apply(),
    isLight: false,
  } as const;
}

