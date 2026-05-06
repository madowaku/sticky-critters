import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { RootApp } from "./RootApp";
import { I18nProvider } from "./i18n/I18nContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <RootApp />
    </I18nProvider>
  </StrictMode>
);
