import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import { useNonce } from "@shopify/hydrogen";
import styles from "./styles.css?url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { CartDrawer } from "./components/layout/CartDrawer";
import { AnnouncementBar } from "./components/layout/AnnouncementBar";
import { QuickBuyDrawer } from "./components/product/QuickBuyDrawer";
import { Toaster } from "./components/ui/sonner";
import { useCartSync } from "./hooks/useCartSync";
import { useLocaleStore, dirFor } from "./stores/localeStore";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

// ── Nav types ────────────────────────────────────────────────────────────────
export interface NavLink {
  label: string;
  url: string;
}

export interface NavColumn {
  title: string;
  links: NavLink[];
}

export interface NavEntry {
  id: string;
  label: string;
  url: string | null;
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
    items {
      id title url type
      items {
        id title url type
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

    footerShop: menu(handle: "footer-shop") {
      id title items { id title url }
    }

    footerHelp: menu(handle: "footer-help") {
      id title items { id title url }
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
        links: (col.items ?? []).map((lk: any): NavLink => ({
          label: lk.title,
          url: toPath(lk.url),
        })),
      }));
    } else if (item.items?.length > 0) {
      columns = [{ title: "", links: item.items.map((lk: any): NavLink => ({ label: lk.title, url: toPath(lk.url) })) }];
    }
    return { id: item.id, label: item.title, url: toPath(item.url), menu: menuName, position: idx, columns };
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

function parseCartDrawerConfig(nodes: any[]): { freeShippingThreshold: number; deliveryItems: string[] } {
  const node = nodes[0];
  if (!node) return { freeShippingThreshold: 350, deliveryItems: [] };
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    freeShippingThreshold: parseInt(f.free_shipping_threshold?.value ?? "350", 10) || 350,
    deliveryItems: [
      f.delivery_item_1?.value, f.delivery_item_2?.value, f.delivery_item_3?.value,
      f.delivery_item_4?.value, f.delivery_item_5?.value, f.delivery_item_6?.value,
    ].filter((v): v is string => typeof v === "string" && v.trim().length > 0),
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

    return { mainMenu, secondaryMenu, footerSettings, footerMenuCols, announcementMessages, cartDrawerConfig };
  } catch {
    return {
      mainMenu: [] as NavEntry[],
      secondaryMenu: [] as NavEntry[],
      footerSettings: null as FooterSettings | null,
      footerMenuCols: [] as { heading: string; links: FooterLink[] }[],
      announcementMessages: [] as string[],
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
    <html lang="en" dir="ltr">
      <head>
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
  return null;
}

function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirFor(locale);
  }, [locale]);
  return null;
}

export default function App() {
  const { mainMenu, secondaryMenu, footerSettings, footerMenuCols, announcementMessages } = useLoaderData<typeof loader>();
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleSync />
      <CartSyncWrapper />
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar messages={announcementMessages} />
        <Header mainMenu={mainMenu} secondaryMenu={secondaryMenu} />
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
