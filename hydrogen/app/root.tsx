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
import mlsFavicon from "./assets/mls-favicon.png";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { CartDrawer } from "./components/layout/CartDrawer";
import { AnnouncementBar } from "./components/layout/AnnouncementBar";
import { QuickBuyDrawer } from "./components/product/QuickBuyDrawer";
import { Toaster } from "./components/ui/sonner";
import { useCartSync } from "./hooks/useCartSync";
import { useCartStore } from "./stores/cartStore";
import { useLocaleStore, dirFor } from "./stores/localeStore";
import { detectLanguage } from "./lib/locale";

const DEFAULT_FAVICON = "https://cdn.shopify.com/s/files/1/0821/0202/6556/files/MLS-favicon.png?v=1693298131";

export const links: LinksFunction = (args?: any) => {
  const favicon = args?.data?.faviconUrl || DEFAULT_FAVICON;
  return [
    { rel: "icon", type: "image/png", href: favicon },
    { rel: "apple-touch-icon", href: favicon },
  ];
};

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
  twitterUrl: string;
  tiktokUrl: string;
  whatsappUrl: string;
  linkedinUrl: string;
  contactHeading: string;
  address: string;
  phone: string;
  email: string;
  copyright: string;
  bottomTagline: string;
  faviconUrl: string | null;
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

    mobileCategoriesMenu: menu(handle: "mls-mobile-categories") {
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
      nodes {
        id
        fields {
          key value
          reference { ... on MediaImage { image { url } } }
        }
      }
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
const INTERNAL_HOSTS = new Set([
  'mls-uae.myshopify.com',
  'mlsuae.ae',
  'hydrogen-lovable-48c64f68e36675c8b8e2.o2.myshopify.dev',
]);
function toPath(u: string): string {
  try {
    const parsed = new URL(u);
    if (!INTERNAL_HOSTS.has(parsed.hostname)) return u;
    // Shopify prepends a locale prefix (e.g. /ar/, /en/) when the admin menu is
    // fetched in a non-default language. Strip it — our routes have no locale prefix.
    const path = (parsed.pathname || "/").replace(/^\/[a-z]{2}(-[a-z]{2})?(\/|$)/i, "/");
    return path || "/";
  } catch { return u || "/"; }
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
    twitterUrl:     f.twitter_url?.value     ?? "",
    tiktokUrl:      f.tiktok_url?.value      ?? "",
    whatsappUrl:    f.whatsapp_url?.value    ?? "",
    linkedinUrl:    f.linkedin_url?.value    ?? "",
    contactHeading: f.contact_heading?.value ?? "",
    address:        f.address?.value         ?? "",
    phone:          f.phone?.value           ?? "",
    email:          f.email?.value           ?? "",
    copyright:      f.copyright?.value       ?? "",
    bottomTagline:  f.bottom_tagline?.value  ?? "",
    faviconUrl:     f.favicon?.reference?.image?.url ?? null,
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
  const language = detectLanguage(request);
  try {
    const [data, adminData] = await Promise.all([
      context.storefront.query(LAYOUT_QUERY, {
        variables: { language, country: "AE" as const },
        cache: context.storefront.CacheShort(),
      }),
      context.adminFetch(ADMIN_FOOTER_QUERY),
    ]);
    const mainMenu               = parseShopifyMenu(data?.mainMenu,              "main");
    const secondaryMenu          = parseShopifyMenu(data?.secondaryMenu,         "secondary");
    const mobileCategoriesMenu   = parseShopifyMenu(data?.mobileCategoriesMenu,  "mobile-cat");
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

    const faviconUrl = footerSettings?.faviconUrl ?? null;
    return { mainMenu, secondaryMenu, mobileMenu, mobileCategoriesMenu, footerSettings, footerMenuCols, announcementMessages, cartDrawerConfig, navItemImages, mobileBanners, faviconUrl, locale: (language === "AR" ? "ar" : "en") as "ar" | "en" };
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
      mobileCategoriesMenu: [] as NavEntry[],
      faviconUrl: null as string | null,
      locale: "en" as "ar" | "en",
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
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K59CLCPC');` }} />
        {/* Klaviyo Onsite JS — handles forms, page tracking, identify */}
        <script async src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=RibCBS" />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K59CLCPC"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="GTM"
          />
        </noscript>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

function CartSyncWrapper() {
  useCartSync();
  return null;
}

function RichpanelWidget() {
  useEffect(() => {
    if ((window as any).richpanel?.loaded) return;
    const w = window as any;
    w.richpanel = w.richpanel || [];
    w.richpanel.q = [];
    const methods = ["track", "debug", "atr"];
    const stub = (m: string) => (...args: any[]) => w.richpanel.q.push([m, ...args]);
    methods.forEach((m) => { w.richpanel[m] = stub(m); });
    w.richpanel.load = (clientId: string) => {
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = `https://cdn.richpanel.com/js/richpanel-root.js?appClientId=${clientId}`;
      document.head.appendChild(s);
    };
    w.richpanel.ensure_rpuid = "";
    w.richpanel.load("mlslive1884");
    w.richpanel.loaded = true;
  }, []);
  return null;
}

function PageLoader() {
  const navigation = useNavigation();
  const { faviconUrl } = useLoaderData<typeof loader>();
  const loading = navigation.state !== "idle";
  const iconSrc = faviconUrl || DEFAULT_FAVICON;
  return (
    <>
      <style>{`
        @keyframes _mls-drop {
          0%   { opacity: 0; transform: translateY(-48px) scale(1.4); }
          55%  { opacity: 1; transform: translateY(6px)  scale(0.96); }
          75%  { transform: translateY(-3px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes _mls-bar {
          0%   { transform: scaleX(0); opacity: 0; transform-origin: left; }
          100% { transform: scaleX(1); opacity: 1; transform-origin: left; }
        }
        @keyframes _mls-tag {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes _mls-logo {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes _mls-dot {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.3; }
          40%           { transform: scale(1);    opacity: 1; }
        }
      `}</style>
      <div
        aria-hidden
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity ${
          loading ? "opacity-100 duration-150" : "opacity-0 duration-300 pointer-events-none"
        }`}
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(18px)" }}
      >
        {/* Logo */}
        <div style={{ animation: "_mls-logo 0.4s ease-out 0s both", marginBottom: 28 }}>
          <img src={iconSrc} alt="" style={{ height: 52, width: "auto", objectFit: "contain" }} />
        </div>

        {/* M → L → S sequential drop-bounce */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 2, lineHeight: 1 }}>
          {(["M", "L", "S"] as const).map((letter, i) => (
            <span
              key={letter}
              style={{
                display: "block",
                fontSize: 88,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "oklch(0.18 0.005 240)",
                fontFamily: "var(--font-display, 'Georgia', serif)",
                animation: `_mls-drop 0.48s cubic-bezier(0.22,1,0.36,1) ${0.12 + i * 0.28}s both`,
              }}
            >{letter}</span>
          ))}
        </div>

        {/* Crimson line sweeps left → right after S lands */}
        <div style={{
          height: 3,
          width: 110,
          background: "oklch(0.36 0.18 27)",
          borderRadius: 9999,
          transformOrigin: "left center",
          marginTop: 8,
          animation: "_mls-bar 0.35s ease-out 1.0s both",
        }} />

        {/* Tagline */}
        <p style={{
          marginTop: 12,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.32em",
          color: "oklch(0.18 0.005 240 / 0.35)",
          textTransform: "uppercase",
          animation: "_mls-tag 0.35s ease-out 1.2s both",
        }}>Premium Quality Meats</p>

        {/* Staggered crimson dots */}
        <div style={{ display: "flex", gap: 7, marginTop: 40 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              display: "block",
              width: 7, height: 7,
              borderRadius: "50%",
              background: "oklch(0.36 0.18 27)",
              animation: `_mls-dot 1.3s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </>
  );
}

function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale);

  // Keep html[lang] and html[dir] in sync whenever locale changes.
  // The inline <script> in <head> handles the initial paint; this effect
  // covers runtime switches without a full reload edge case.
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirFor(locale);
  }, [locale]);

  return null;
}

export default function App() {
  const { mainMenu, secondaryMenu, mobileMenu, mobileCategoriesMenu, footerSettings, footerMenuCols, announcementMessages, navItemImages, mobileBanners } = useLoaderData<typeof loader>();
  return (
    <QueryClientProvider client={queryClient}>
      <PageLoader />
      <LocaleSync />
      <CartSyncWrapper />
      <RichpanelWidget />
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar messages={announcementMessages} />
        <Header mainMenu={mainMenu} secondaryMenu={secondaryMenu} navItemImages={navItemImages} mobileBanners={mobileBanners} mobileMenu={mobileMenu} mobileCategoriesMenu={mobileCategoriesMenu} />
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
