import { create } from "zustand";

export type Locale = "en" | "ar";
export type Dir = "ltr" | "rtl";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

function readInitialLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)lang=([a-z]{2})/);
  return m?.[1] === "ar" ? "ar" : "en";
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: readInitialLocale(),
  setLocale: (locale) => {
    set({ locale });
    if (typeof document !== "undefined") {
      const secure = window.location.protocol === "https:" ? ";Secure" : "";
      document.cookie = `lang=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax${secure}`;
      if (locale === "ar") {
        // Navigate to /ar so the URL reflects the Arabic locale.
        window.location.href = "/ar";
      } else {
        // Strip /ar prefix if present, otherwise reload at current path without it.
        const current = window.location.pathname;
        const stripped = current.startsWith("/ar/") ? current.slice(3) : current === "/ar" ? "/" : current;
        window.location.href = stripped + window.location.search;
      }
    }
  },
}));

export const dirFor = (l: Locale): Dir => (l === "ar" ? "rtl" : "ltr");
