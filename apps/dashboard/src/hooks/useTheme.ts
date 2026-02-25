import { useState, useEffect, useCallback } from "react";
import * as theme from "@/lib/theme";

export type ThemeValue = theme.ThemeValue;

export function useTheme() {
  const [value, setValueState] = useState<theme.ThemeValue>(() => theme.getTheme());
  const [resolved, setResolved] = useState<"light" | "dark">(() => theme.getResolvedTheme());

  useEffect(() => {
    theme.initTheme();
    setValueState(theme.getTheme());
    setResolved(theme.getResolvedTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setValueState(theme.getTheme());
      setResolved(theme.getResolvedTheme());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((v: theme.ThemeValue) => {
    theme.setTheme(v);
    setValueState(theme.getTheme());
    setResolved(theme.getResolvedTheme());
  }, []);

  return { theme: value, setTheme, resolved } as const;
}
