import { en } from "./en";
import { ja } from "./ja";

export type Locale = "en" | "ja";

export const dictionaries = { en, ja };

export const defaultLocale: Locale = typeof navigator !== "undefined" && navigator.language.startsWith("ja")
  ? "ja"
  : "en";
