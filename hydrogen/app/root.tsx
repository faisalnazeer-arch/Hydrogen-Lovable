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

export interface FooterColumn {
  id: string;
  heading: string;
  position: number;
  links: FooterLink[];
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
      items { id title url }
    }

    footerHelp: menu(handle: "footer-help") {
      items { id title url }
    }

    footerSettings: metaobjects(type: "mls_footer_settings", first: 1) {
      nodes {
        id
        fields { key value }
      }
    }

    footerColumns: metaobjects(type: "mls_footer_column", first: 10) {
      nodes {
        id
        fields {
          key
          value
          references(first: 20) {
            nodes {
              ... on Metaobject {
                id
                fields { key value }
              }
            }
          }
        }
      }
    }

    announcementBar: metaobjects(type: "mls_announcement_bar", first: 1) {
      nodes {
        id
        fields { key value }
      }
    }
  }
` as const;

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

function parseFooterColumns(nodes: any[]): FooterColumn[] {
  return nodes
    .map((node) => {
      const fm = Object.fromEntries(node.fields.map((f: any) => [f.key, f]));
      const links: FooterLink[] = (fm.links?.references?.nodes ?? []).map((lk: any) => {
        const lf = Object.fromEntries(lk.fields.map((x: any) => [x.key, x]));
        return {
          label: lf.label?.value ?? "",
          url: lf.url?.value ?? "/",
        };
      });
      return {
        id: node.id as string,
        heading: fm.heading?.value ?? "",
        position: parseInt(fm.position?.value ?? "0", 10),
        links,
      };
    })
    .sort((a, b) => a.position - b.position);
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
    const data = await context.storefront.query(LAYOUT_QUERY, {
      variables: { language, country: "AE" as const },
    });
    const mainMenu      = parseShopifyMenu(data?.mainMenu,      "main");
    const secondaryMenu = parseShopifyMenu(data?.secondaryMenu, "secondary");
    const footerSettings = parseFooterSettings(data?.footerSettings?.nodes ?? []);
    const footerColumns  = parseFooterColumns(data?.footerColumns?.nodes ?? []);
    const announcementMessages = parseAnnouncementMessages(data?.announcementBar?.nodes ?? []);

    const footerShop: FooterLink[] = (data?.footerShop?.items ?? []).map((item: any) => ({
      label: item.title,
      url: toPath(item.url),
    }));
    const footerHelp: FooterLink[] = (data?.footerHelp?.items ?? []).map((item: any) => ({
      label: item.title,
      url: toPath(item.url),
    }));

    return { mainMenu, secondaryMenu, footerSettings, footerColumns, footerShop, footerHelp, announcementMessages };
  } catch {
    return {
      mainMenu: [] as NavEntry[],
      secondaryMenu: [] as NavEntry[],
      footerSettings: null as FooterSettings | null,
      footerColumns: [] as FooterColumn[],
      footerShop: [] as FooterLink[],
      footerHelp: [] as FooterLink[],
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
  const { mainMenu, secondaryMenu, footerSettings, footerColumns, footerShop, footerHelp, announcementMessages } = useLoaderData<typeof loader>();
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
        <Footer settings={footerSettings} columns={footerColumns} shopLinks={footerShop ?? []} helpLinks={footerHelp ?? []} />
      </div>
      <CartDrawer />
      <QuickBuyDrawer />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
