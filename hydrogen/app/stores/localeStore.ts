import { create } from "zustand";
import { useRouteLoaderData } from "react-router";

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

      let target: string;
      if (locale === "ar") {
        target = "/ar";
      } else {
        const current = window.location.pathname;
        target = current.startsWith("/ar/") ? current.slice(3) || "/" : current === "/ar" ? "/" : current;
        target += window.location.search;
      }

      // Replace the current history entry so the browser back button does not
      // land on the pre-switch locale URL after switching language.
      window.location.replace(target);
    }
  },
}));

export const dirFor = (l: Locale): Dir => (l === "ar" ? "rtl" : "ltr");

/**
 * Returns a function that prefixes internal paths with /ar/ when the locale
 * is Arabic. Uses the root loader data (server-safe, no hydration mismatch).
 */
export function useLocalePath() {
  const data = useRouteLoaderData("root") as { locale?: "ar" | "en" } | undefined;
  const locale = data?.locale ?? "en";
  return (path: string): string => {
    if (locale !== "ar") return path;
    if (path.startsWith("/ar")) return path; // already prefixed
    return `/ar${path.startsWith("/") ? path : `/${path}`}`;
  };
}
