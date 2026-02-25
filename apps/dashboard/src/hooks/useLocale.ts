import { useState, useEffect, useCallback } from "react";
import * as locale from "@/lib/locale";

export type LocaleValue = locale.LocaleValue;

export function useLocale() {
  const [value, setValueState] = useState<locale.LocaleValue>(() => locale.getLocale());

  useEffect(() => {
    locale.initLocale();
    setValueState(locale.getLocale());
  }, []);

  const setLocale = useCallback((v: locale.LocaleValue) => {
    locale.setLocale(v);
    setValueState(locale.getLocale());
  }, []);

  return { locale: value, setLocale } as const;
}
