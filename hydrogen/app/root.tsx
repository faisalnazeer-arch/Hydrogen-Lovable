import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { LinksFunction, LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from "react-router";
import { useEffect } from "react";
import { useNonce } from "@shopify/hydrogen";
import styles from "./styles.css?url";
import mlsLogo from "./assets/mls-logo.png";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { CartDrawer } from "./components/layout/CartDrawer";
import { AnnouncementBar } from "./components/layout/AnnouncementBar";
import { QuickBuyDrawer } from "./components/product/QuickBuyDrawer";
import { Toaster } from "./components/ui/sonner";
import { useCartSync } from "./hooks/useCartSync";
import { useCartStore } from "./stores/cartStore";
import { useLocaleStore, dirFor, type Locale } from "./stores/localeStore";

export const links: LinksFunction = () => [
  // Stylesheet is injected directly in Layout with suppressHydrationWarning
  // to prevent Vite dev-mode ?t= timestamp causing a hydration cascade
  { rel: "icon", type: "image/png", href: mlsLogo },
  { rel: "apple-touch-icon", href: mlsLogo },
];

// ── Nav types ────────────────────────────────────────────────────────────────
export interface NavLink {
  label: string;
  url: string;
  imageUrl?: string | null;
}

export interface NavColumn {
  title: string;
  url?: string | null;
  imageUrl?: string | null;
  links: NavLink[];
}

export interface NavEntry {
  id: string;
  label: string;
  url: string | null;
  imageUrl?: string | null;
  menu: string;
  position: number;
  columns: NavColumn[];
}

// ── Footer types ─────────────────────────────────────────────────────────────
export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterSettings {
  brandText: string;
  instagramUrl: string;
  facebookUrl: string;
  contactHeading: string;
  address: string;
  phone: string;
  email: string;
  copyright: string;
  bottomTagline: string;
}

// ── GraphQL ───────────────────────────────────────────────────────────────────
const LAYOUT_QUERY = `#graphql
  fragment MenuFields on MenuItem {
    id title url type
    resource {
      ... on Collection {
        image { url altText }
      }
      ... on Product {
        featuredImage { url altText }
      }
    }
    items {
      id title url type
      resource {
        ... on Collection {
          image { url altText }
        }
        ... on Product {
          featuredImage { url altText }
        }
      }
      items {
        id title url type
        resource {
          ... on Collection {
            image { url altText }
          }
          ... on Product {
            featuredImage { url altText }
          }
        }
      }
    }
  }
  query LayoutData($language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {

    mainMenu: menu(handle: "main-menu") {
      items { ...MenuFields }
    }

    secondaryMenu: menu(handle: "secondary-menu") {
      items { ...MenuFields }
    }

    mobileMenu: menu(handle: "mls-mobile-menu") {
      items { ...MenuFields }
    }

    footerShop: menu(handle: "footer-shop") {
      id title items { id title url }
    }

    footerHelp: menu(handle: "footer-help") {
      id title items { id title url }
    }

    navItemImages: metaobjects(type: "mls_nav_item_image", first: 50) {
      nodes {
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image { url altText }
            }
          }
        }
      }
    }

    mobileBanners: metaobjects(type: "mls_mobile_banner", first: 2) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image { url altText }
            }
          }
        }
      }
    }

  }
` as const;

const ADMIN_FOOTER_QUERY = `
  query {
    footerSettings: metaobjects(type: "mls_footer_settings", first: 1) {
      nodes { id fields { key value } }
    }
    announcementBar: metaobjects(type: "mls_announcement_bar", first: 1) {
      nodes { id fields { key value } }
    }
    cartDrawer: metaobjects(type: "mls_cart_drawer_config", first: 1) {
      nodes { id fields { key value } }
    }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function toPath(u: string): string {
  try { return new URL(u).pathname || "/"; } catch { return u || "/"; }
}

// ── Nav parser — native Shopify Menu API ──────────────────────────────────────
// Level 1 → NavEntry  (top nav item, url, columns)
// Level 2 → NavColumn (mega-menu column header, links)  if it has children
//         → flat link added to a single unnamed column   if no children
// Level 3 → NavLink   (link inside column)
function parseShopifyMenu(menu: any, menuName = "main"): NavEntry[] {
  if (!menu?.items?.length) return [];
  return (menu.items as any[]).map((item: any, idx: number): NavEntry => {
    const hasColumns = item.items?.some((c: any) => c.items?.length > 0);
    let columns: NavColumn[] = [];
    if (hasColumns) {
      columns = item.items.map((col: any) => ({
        title: col.title,
        url: toPath(col.url) || null,
        imageUrl: col.resource?.image?.url ?? col.resource?.featuredImage?.url ?? null,
        links: (col.items ?? []).map((lk: any): NavLink => ({
          label: lk.title,
          url: toPath(lk.url),
          imageUrl: lk.resource?.image?.url ?? lk.resource?.featuredImage?.url ?? null,
        })),
      }));
    } else if (item.items?.length > 0) {
      columns = [{ title: "", url: null, imageUrl: null, links: item.items.map((lk: any): NavLink => ({
        label: lk.title,
        url: toPath(lk.url),
        imageUrl: lk.resource?.image?.url ?? lk.resource?.featuredImage?.url ?? null,
      })) }];
    }
    const imageUrl = item.resource?.image?.url ?? item.resource?.featuredImage?.url ?? null;
    return { id: item.id, label: item.title, url: toPath(item.url), imageUrl, menu: menuName, position: idx, columns };
  });
}

// ── Footer parsers ────────────────────────────────────────────────────────────
function parseFooterSettings(nodes: any[]): FooterSettings | null {
  const node = nodes[0];
  if (!node) return null;
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    brandText:      f.brand_text?.value      ?? "",
    instagramUrl:   f.instagram_url?.value   ?? "",
    facebookUrl:    f.facebook_url?.value    ?? "",
    contactHeading: f.contact_heading?.value ?? "",
    address:        f.address?.value         ?? "",
    phone:          f.phone?.value           ?? "",
    email:          f.email?.value           ?? "",
    copyright:      f.copyright?.value       ?? "",
    bottomTagline:  f.bottom_tagline?.value  ?? "",
  };
}

function parseCartDrawerConfig(nodes: any[]) {
  const node = nodes[0];
  if (!node) return { freeShippingThreshold: 350, deliveryItems: [], freeGiftSubVariantId: "", freeGiftCarVariantId: "" };
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    freeShippingThreshold: parseInt(f.free_shipping_threshold?.value ?? "350", 10) || 350,
    deliveryItems: [
      f.delivery_item_1?.value, f.delivery_item_2?.value, f.delivery_item_3?.value,
      f.delivery_item_4?.value, f.delivery_item_5?.value, f.delivery_item_6?.value,
    ].filter((v): v is string => typeof v === "string" && v.trim().length > 0),
    freeGiftSubVariantId: f.free_gift_subscription_variant_id?.value ?? "",
    freeGiftCarVariantId: f.free_gift_carcass_variant_id?.value ?? "",
  };
}

function parseAnnouncementMessages(nodes: any[]): string[] {
  const node = nodes[0];
  if (!node) return [];
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return [
    f.message_1?.value, f.message_2?.value, f.message_3?.value,
    f.message_4?.value, f.message_5?.value,
  ].filter((m): m is string => typeof m === "string" && m.trim().length > 0);
}

export interface MobileMenuSubItem {
  id: string;
  title: string;
  url: string;
}

export interface MobileMenuItem {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  subItems: MobileMenuSubItem[];
}

export interface MobileMenuTab {
  label: string;
  items: MobileMenuItem[];
}

function parseMobileMenu(menuData: any): MobileMenuTab[] {
  if (!menuData?.items?.length) return [];
  return menuData.items.map((tab: any) => ({
    label: tab.title as string,
    items: (tab.items ?? []).map((item: any) => ({
      id: item.id as string,
      title: item.title as string,
      url: toPath(item.url),
      imageUrl: (item.resource?.image?.url ?? null) as string | null,
      subItems: (item.items ?? []).map((sub: any) => ({
        id: sub.id as string,
        title: sub.title as string,
        url: toPath(sub.url),
      })),
    })),
  }));
}

export interface MobileBanner {
  id: string;
  imageUrl: string;
  url: string;
  altText: string;
  heading: string;
  highlight: string;
  ctaText: string;
}

function parseMobileBanners(nodes: any[]): MobileBanner[] {
  return nodes
    .map((node: any) => {
      const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
      const imageUrl: string | undefined = f.image?.reference?.image?.url;
      if (!imageUrl) return null;
      return {
        id: node.id as string,
        imageUrl,
        url: (f.url?.value ?? "/") as string,
        altText: (f.image?.reference?.image?.altText ?? "") as string,
        heading: (f.heading?.value ?? "") as string,
        highlight: (f.highlight?.value ?? "") as string,
        ctaText: (f.cta_text?.value ?? "Shop Now") as string,
      };
    })
    .filter((b): b is MobileBanner => b !== null);
}

function parseNavItemImages(nodes: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const node of nodes ?? []) {
    const fields = Object.fromEntries((node.fields ?? []).map((f: any) => [f.key, f]));
    const label: string = fields.nav_label?.value?.trim();
    const imageUrl: string | undefined = fields.image?.reference?.image?.url;
    if (label && imageUrl) map[label] = imageUrl;
  }
  return map;
}

// Skip re-fetching root layout data on every client navigation.
// Menus, footer, and announcement bar rarely change — initial data is reused for the session.
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
  // Only revalidate when navigating back to the root itself (e.g. after a form action)
  return currentUrl.pathname === nextUrl.pathname;
}

// ── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ context, request }: LoaderFunctionArgs) {
  const lang = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";
  try {
    const [data, adminData] = await Promise.all([
      context.storefront.query(LAYOUT_QUERY, {
        variables: { language, country: "AE" as const },
        cache: context.storefront.CacheShort(),
      }),
      context.adminFetch(ADMIN_FOOTER_QUERY),
    ]);
    const mainMenu       = parseShopifyMenu(data?.mainMenu,      "main");
    const secondaryMenu  = parseShopifyMenu(data?.secondaryMenu, "secondary");
    const footerSettings = parseFooterSettings(adminData?.footerSettings?.nodes ?? []);
    const announcementMessages = parseAnnouncementMessages(adminData?.announcementBar?.nodes ?? []);
    const cartDrawerConfig = parseCartDrawerConfig(adminData?.cartDrawer?.nodes ?? []);

    function menuToCol(menu: any): { heading: string; links: FooterLink[] } | null {
      if (!menu?.items?.length) return null;
      const heading = (menu.title as string).replace(/^footer\s+/i, "").trim();
      return {
        heading,
        links: menu.items.map((item: any) => ({ label: item.title, url: toPath(item.url) })),
      };
    }

    const footerMenuCols = [
      menuToCol(data?.footerShop),
      menuToCol(data?.footerHelp),
    ].filter((c): c is { heading: string; links: FooterLink[] } => c !== null);

    const navItemImages = parseNavItemImages(data?.navItemImages?.nodes ?? []);
    const mobileBanners = parseMobileBanners(data?.mobileBanners?.nodes ?? []);
    const mobileMenu = parseMobileMenu(data?.mobileMenu);

    return { mainMenu, secondaryMenu, mobileMenu, footerSettings, footerMenuCols, announcementMessages, cartDrawerConfig, navItemImages, mobileBanners };
  } catch {
    return {
      mainMenu: [] as NavEntry[],
      secondaryMenu: [] as NavEntry[],
      footerSettings: null as FooterSettings | null,
      footerMenuCols: [] as { heading: string; links: FooterLink[] }[],
      announcementMessages: [] as string[],
      cartDrawerConfig: { freeShippingThreshold: 350, deliveryItems: [], freeGiftSubVariantId: "", freeGiftCarVariantId: "" },
      navItemImages: {} as Record<string, string>,
      mobileBanners: [] as MobileBanner[],
      mobileMenu: [] as MobileMenuTab[],
    };
  }
}

// ── App shell ─────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Critical CSS — inlined before external stylesheet so variables apply on first paint */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root{--radius:.5rem;--crimson:oklch(0.36 0.18 27);--rich-red:oklch(0.52 0.21 28);--off-white:oklch(0.985 0.005 80);--bone:oklch(0.96 0.008 80);--charcoal:oklch(0.18 0.005 240);--charcoal-foreground:oklch(0.985 0.005 60);--gold:oklch(0.74 0.11 80);--background:var(--off-white);--foreground:var(--charcoal);--card:oklch(1 0 0);--card-foreground:var(--charcoal);--border:oklch(0.9 0.008 80);--muted:oklch(0.94 0.006 80);--muted-foreground:oklch(0.45 0.01 60);}
          *,::before,::after{box-sizing:border-box}
          body{margin:0;background-color:var(--background);color:var(--foreground);font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
          a{color:inherit;text-decoration:none}
        ` }} />
        {/* Stylesheet via direct <link> with suppressHydrationWarning — prevents Vite dev-mode
            from adding a ?t= timestamp that mismatches the SSR-rendered href and triggers a
            full hydration failure + client re-render cascade */}
        <link rel="stylesheet" href={styles} suppressHydrationWarning />
        {/* Inline script — sets lang/dir from cookie before React paints, eliminating Arabic flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)lang=([a-z]{2})/);if(m&&m[1]==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl';}}catch(e){}})();` }} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta
          name="description"
          content="Premium beef, lamb, mutton & specialty cuts. 100% Halal certified. Same-day delivery across the UAE & Oman."
        />
        <title>MLS — Muscat Livestock Store · Premium Fresh Meat Delivery</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

function CartSyncWrapper() {
  useCartSync();
  // Rehydrate the persisted cart store from localStorage after mount.
  // skipHydration:true in the store prevents auto-rehydrate during SSR,
  // which would cause a hydration mismatch (server sees 0 items, client sees persisted cart).
  useEffect(() => {
    useCartStore.persist.rehydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function PageLoader() {
  const navigation = useNavigation();
  const loading = navigation.state !== "idle";

  return (
    <>
      <style>{`
        @keyframes mls-spin     { to { transform: rotate(360deg); } }
        @keyframes mls-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes mls-logo-pulse {
          0%,100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(220,38,38,0)); }
          50%      { transform: scale(1.06); filter: drop-shadow(0 0 18px rgba(220,38,38,0.7)) drop-shadow(0 0 6px rgba(212,160,23,0.4)); }
        }
        @keyframes mls-orbit-a {
          from { transform: rotate(0deg)   translateY(-94px); }
          to   { transform: rotate(360deg) translateY(-94px); }
        }
        @keyframes mls-orbit-b {
          from { transform: rotate(120deg) translateY(-94px); }
          to   { transform: rotate(480deg) translateY(-94px); }
        }
        @keyframes mls-orbit-c {
          from { transform: rotate(240deg) translateY(-94px); }
          to   { transform: rotate(600deg) translateY(-94px); }
        }
        @keyframes mls-shimmer {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
        @keyframes mls-ambient {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes mls-dot {
          0%,100% { transform: scaleY(0.4); opacity: 0.3; }
          50%      { transform: scaleY(1);   opacity: 1; }
        }
        @keyframes mls-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        aria-hidden
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity ${
          loading ? "opacity-100 duration-150" : "opacity-0 duration-200 pointer-events-none"
        }`}
        style={{ background: "rgba(10,10,10,0.94)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)" }}
      >
        {/* Ambient radial glow blob */}
        <div style={{
          position: "absolute", width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.14) 0%, rgba(212,160,23,0.04) 45%, transparent 70%)",
          animation: "mls-ambient 3.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Spinner stage */}
        <div style={{ position: "relative", width: 210, height: 210 }}>

          {/* Outermost slow counter-spin dashed ring */}
          <div style={{
            position: "absolute", inset: -28, borderRadius: "50%",
            border: "1px dashed rgba(212,160,23,0.18)",
            animation: "mls-spin-rev 18s linear infinite",
          }} />

          {/* Mid counter-spin ring */}
          <div style={{
            position: "absolute", inset: -14, borderRadius: "50%",
            border: "1.5px dashed rgba(220,38,38,0.22)",
            animation: "mls-spin-rev 10s linear infinite",
          }} />

          {/* Primary conic gradient ring — crimson → gold → crimson sweep */}
          <div style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0%, #dc2626 20%, #ef4444 35%, #d4a017 50%, #ef4444 65%, #dc2626 80%, transparent 100%)",
            animation: "mls-spin 1.7s linear infinite",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }} />

          {/* Inner thin accent ring */}
          <div style={{
            position: "absolute", inset: 8, borderRadius: "50%",
            border: "1px solid rgba(220,38,38,0.12)",
            animation: "mls-spin 4s linear infinite",
          }} />

          {/* Orbiting particle A — crimson */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 10, height: 10, marginTop: -5, marginLeft: -5,
            borderRadius: "50%",
            background: "radial-gradient(circle, #ff6b6b, #dc2626)",
            boxShadow: "0 0 12px rgba(220,38,38,1), 0 0 28px rgba(220,38,38,0.5)",
            animation: "mls-orbit-a 3s linear infinite",
          }} />

          {/* Orbiting particle B — gold */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 7, height: 7, marginTop: -3.5, marginLeft: -3.5,
            borderRadius: "50%",
            background: "radial-gradient(circle, #ffe066, #d4a017)",
            boxShadow: "0 0 10px rgba(212,160,23,1), 0 0 22px rgba(212,160,23,0.5)",
            animation: "mls-orbit-b 3s linear infinite",
          }} />

          {/* Orbiting particle C — small crimson */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 5, height: 5, marginTop: -2.5, marginLeft: -2.5,
            borderRadius: "50%",
            background: "#ef4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.9)",
            animation: "mls-orbit-c 3s linear infinite",
          }} />

          {/* Logo — white backing disc + logo image */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 130, height: 130, borderRadius: "50%",
              background: "radial-gradient(circle at 40% 35%, #ffffff 60%, #f3f0e8 100%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.15), 0 8px 40px rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img
                src={mlsLogo}
                alt=""
                style={{ height: 82, width: "auto", animation: "mls-logo-pulse 2.6s ease-in-out infinite" }}
              />
            </div>
          </div>
        </div>

        {/* Shimmer tagline */}
        <div
          style={{
            marginTop: 44,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.45em",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.85) 30%, #ef4444 48%, #d4a017 52%, rgba(255,255,255,0.85) 70%, rgba(255,255,255,0.15) 100%)",
            backgroundSize: "250% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "mls-shimmer 2.2s linear infinite, mls-fade-in 0.6s ease-out 0.1s both",
          }}
        >
          Premium Cuts
        </div>

        {/* Audio-bar style pulse indicator */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: 18, height: 20, animation: "mls-fade-in 0.4s ease-out 0.25s both", opacity: 0 }}>
          {[12, 18, 10, 20, 8, 16, 12].map((h, i) => (
            <span
              key={i}
              style={{
                display: "block", width: 3, borderRadius: 2,
                height: h,
                background: i === 3 ? "linear-gradient(to top, #dc2626, #d4a017)" : "rgba(220,38,38,0.7)",
                animation: `mls-dot 0.9s ease-in-out ${i * 0.1}s infinite`,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale);

  // On first client mount, read the lang cookie the server already set and sync
  // the store. This bridges the SSR→hydration gap: the server used the cookie for
  // Shopify queries; the store now matches it so useT() renders the right language.
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lang=([a-z]{2})/);
    const cookieLocale = match?.[1] === "ar" ? "ar" : "en";
    if (cookieLocale !== useLocaleStore.getState().locale) {
      useLocaleStore.setState({ locale: cookieLocale as Locale });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirFor(locale);
  }, [locale]);

  return null;
}

export default function App() {
  const { mainMenu, secondaryMenu, mobileMenu, footerSettings, footerMenuCols, announcementMessages, navItemImages, mobileBanners } = useLoaderData<typeof loader>();
  return (
    <QueryClientProvider client={queryClient}>
      <PageLoader />
      <LocaleSync />
      <CartSyncWrapper />
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar messages={announcementMessages} />
        <Header mainMenu={mainMenu} secondaryMenu={secondaryMenu} navItemImages={navItemImages} mobileBanners={mobileBanners} mobileMenu={mobileMenu} />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer settings={footerSettings} menuCols={footerMenuCols} />
      </div>
      <CartDrawer />
      <QuickBuyDrawer />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
