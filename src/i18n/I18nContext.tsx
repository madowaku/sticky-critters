import { createContext, useContext, type ReactNode } from "react";
import { useI18n } from "../hooks/useI18n";

type I18nContextType = ReturnType<typeof useI18n>;

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const i18n = useI18n();
  return (
    <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
