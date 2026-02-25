/**
 * Locale: persist localStorage bb-locale, apply to html[lang]
 */

const KEY = "bb-locale";

export type LocaleValue = "zh-CN" | "en";

const DEFAULT: LocaleValue = "zh-CN";

export function getLocale(): LocaleValue {
  const v = localStorage.getItem(KEY);
  if (v === "zh-CN" || v === "en") return v;
  return DEFAULT;
}

export function setLocale(value: LocaleValue) {
  localStorage.setItem(KEY, value);
  document.documentElement.setAttribute("lang", value);
}

export function initLocale() {
  const v = localStorage.getItem(KEY);
  if (v === "zh-CN" || v === "en") document.documentElement.setAttribute("lang", v);
}
