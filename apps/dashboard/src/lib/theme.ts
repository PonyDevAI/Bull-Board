/**
 * Theme: light | dark | system
 * Persist: localStorage bb-theme
 * Apply: html.dark for Tailwind darkMode class
 */

const KEY = "bb-theme";
export type ThemeValue = "light" | "dark" | "system";

function getStored(): ThemeValue {
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function apply(value: ThemeValue) {
  const root = document.documentElement;
  const isDark =
    value === "dark" ||
    (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function getTheme(): ThemeValue {
  return getStored();
}

export function setTheme(value: ThemeValue) {
  localStorage.setItem(KEY, value);
  apply(value);
}

/** Resolved: actual "light" | "dark" for current display */
export function getResolvedTheme(): "light" | "dark" {
  const v = getStored();
  if (v === "dark") return "dark";
  if (v === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Call once on app init; listen to system preference when theme is system */
export function initTheme() {
  apply(getStored());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getStored() === "system") apply("system");
  });
}
