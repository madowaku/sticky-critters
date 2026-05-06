import { useState, useCallback, useEffect, useRef } from "react";
import type { Locale } from "../i18n";
import { dictionaries, defaultLocale } from "../i18n";
import { loadSettings, saveSettings } from "../lib/storage";

export function useI18n() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [isI18nLoaded, setIsI18nLoaded] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    async function init() {
      const settings = await loadSettings();
      if (settings.locale === "en" || settings.locale === "ja") {
        setLocale(settings.locale);
      }
      setIsI18nLoaded(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (isInitialMount.current || !isI18nLoaded) {
      if (isI18nLoaded) {
        isInitialMount.current = false;
      }
      return;
    }
    saveSettings({ locale });
  }, [locale, isI18nLoaded]);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "ja" ? "en" : "ja"));
  }, []);

  const t = useCallback(
    (path: string) => {
      const keys = path.split(".");
      let current: unknown = dictionaries[locale];
      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return path;
        }
      }
      return typeof current === "string" ? current : path;
    },
    [locale]
  );

  return { locale, setLocale, toggleLocale, t, isI18nLoaded };
}
