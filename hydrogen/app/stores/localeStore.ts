import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "ar";
export type Dir = "ltr" | "rtl";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") {
          document.cookie = `lang=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
          // Reload so the SSR loader re-fetches Shopify content in the new language
          window.location.reload();
        }
      },
    }),
    { name: "mls_locale" }
  )
);

export const dirFor = (l: Locale): Dir => (l === "ar" ? "rtl" : "ltr");
