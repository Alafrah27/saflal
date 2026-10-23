import { content } from "./content.js";

const storageKey = "saflal.website.language";
export function getInitialLanguage() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "en" || saved === "ar") return saved;
  } catch {
    /* Browser storage is optional. */
  }
  return window.navigator.language?.toLowerCase().startsWith("ar")
    ? "ar"
    : "en";
}
export function applyLanguage(language, { persist = false } = {}) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.title = content[language].metaTitle;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", content[language].metaDescription);
  if (persist) {
    try {
      window.localStorage.setItem(storageKey, language);
    } catch {
      /* Keep the in-memory selection. */
    }
  }
}
