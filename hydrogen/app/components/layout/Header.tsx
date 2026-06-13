import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  ShoppingBag,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
  Beef,
  Drumstick,
  Star,
  Tag,
  Flame,
  Sandwich,
  Package,
  Boxes,
  Info,
  Compass,
  Globe,
  MapPin,
  Crown,
  Gift,
  Percent,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { MegaMenu } from "./MegaMenu";
import { SearchAutosuggest } from "./SearchAutosuggest";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useLocaleStore, dirFor } from "@/stores/localeStore";
import { useT } from "@/i18n/strings";
import logo from "@/assets/mls-logo.png";
import type { NavEntry, MobileBanner } from "~/root";

function pickIcon(title: string, url: string): LucideIcon {
  const s = `${title} ${url}`.toLowerCase();
  if (/beef|steak|wagyu|angus/.test(s)) return Beef;
  if (/lamb|mutton/.test(s)) return Drumstick;
  if (/review/.test(s)) return Star;
  if (/offer|sale|deal|redeem/.test(s)) return Percent;
  if (/bbq|grill|mishkak/.test(s)) return Flame;
  if (/burger|sandwich/.test(s)) return Sandwich;
  if (/box|bundle/.test(s)) return Boxes;
  if (/build|package/.test(s)) return Package;
  if (/about|info/.test(s)) return Info;
  if (/location|store/.test(s)) return MapPin;
  if (/subscription|subscribe/.test(s)) return Crown;
  if (/reward|loyalty/.test(s)) return Gift;
  return Compass;
}

interface HeaderProps {
  mainMenu?: NavEntry[];
  secondaryMenu?: NavEntry[];
  navItemImages?: Record<string, string>;
  mobileBanners?: MobileBanner[];
  mobileMenu?: import("~/root").MobileMenuTab[];
}

export function Header({ mainMenu = [], secondaryMenu = [], navItemImages = {}, mobileBanners = [], mobileMenu = [] }: HeaderProps) {
  const rawTotal = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const setCartOpen = useCartStore((s) => s.setOpen);
  // Defer cart count display until after client hydration so SSR (always 0)
  // matches the initial client render, preventing React hydration errors.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const totalItems = hydrated ? rawTotal : 0;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = useT();
  const drawerSide = dirFor(locale) === "rtl" ? "right" : "left";
  const closeMobile = () => setMobileNavOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {/* Top bar */}
      <div className="container relative mx-auto flex items-center gap-3 px-4 py-3">
        {/* Mobile menu */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.menu")}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          {/* [&>button:first-child]:hidden hides Sheet's built-in close button — we have our own */}
          <SheetContent side={drawerSide} className="w-[320px] p-0 flex flex-col [&>button:first-child]:hidden">
            <MobileMenuDrawer
              mainMenu={mainMenu}
              secondaryMenu={secondaryMenu}
              navItemImages={navItemImages}
              mobileBanners={mobileBanners}
              mobileMenu={mobileMenu}
              onClose={closeMobile}
            />
          </SheetContent>
        </Sheet>

        <Link
          to="/"
          aria-label="MLS — Muscat Livestock Store"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center lg:static lg:translate-x-0 lg:translate-y-0"
        >
          <img
            src={logo}
            alt="Muscat Livestock Store"
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <div className="ms-4 hidden flex-1 lg:block">
          <div className="mx-auto max-w-xl">
            <SearchAutosuggest />
          </div>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-0.5 rounded-full border border-border px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            <Globe className="ms-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`rounded-full px-2 py-0.5 transition-colors ${
                locale === "en" ? "bg-crimson text-crimson-foreground" : "hover:text-crimson"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("ar")}
              aria-pressed={locale === "ar"}
              lang="ar"
              className={`rounded-full px-2 py-0.5 transition-colors ${
                locale === "ar" ? "bg-crimson text-crimson-foreground" : "hover:text-crimson"
              }`}
            >
              العربية
            </button>
          </div>
          <a
            href="https://mlsuae.ae/customer_authentication/redirect?locale=en&region_country=AE"
            aria-label={t("nav.account")}
          >
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t("nav.cart")}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1 text-[10px] font-bold text-crimson-foreground">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="border-t border-border bg-card px-4 py-2 lg:hidden">
        <SearchAutosuggest />
      </div>

      {/* Nav rows (desktop) */}
      <nav className="hidden border-t border-border bg-card lg:block">
        <div className="container relative mx-auto flex items-center justify-center gap-6 px-4 py-2">
          {mainMenu.map((entry) =>
            entry.columns.length > 0 ? (
              <NavItem
                key={entry.id}
                label={entry.label}
                Icon={pickIcon(entry.label, entry.url ?? "")}
                mega={entry.columns}
              />
            ) : (
              <NavLink
                key={entry.id}
                to={entry.url ?? "/"}
                label={entry.label}
                Icon={pickIcon(entry.label, entry.url ?? "")}
              />
            )
          )}
        </div>
        <div className="container relative mx-auto flex items-center justify-center gap-6 border-t border-border/60 px-4 py-2">
          {secondaryMenu.map((entry) =>
            entry.columns.length > 0 ? (
              <SecondaryNavItem
                key={entry.id}
                label={entry.label}
                Icon={pickIcon(entry.label, entry.url ?? "")}
                mega={entry.columns}
              />
            ) : (
              <SecondaryNavLink
                key={entry.id}
                to={entry.url ?? "/"}
                label={entry.label}
                Icon={pickIcon(entry.label, entry.url ?? "")}
              />
            )
          )}
        </div>
      </nav>
    </header>
  );
}

function NavItem({
  label,
  mega,
  Icon,
}: {
  label: string;
  mega: any[];
  Icon?: LucideIcon;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };

  const handleClose = () => {
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  const isMega = mega.length > 1 || (mega.length === 1 && !!mega[0].title);

  const handleLinkClick = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <div className={isMega ? undefined : "relative"} onMouseEnter={handleOpen} onMouseLeave={handleClose}>
      <button
        className={`flex items-center gap-1 py-1 text-[13px] font-semibold uppercase tracking-wider transition-colors hover:text-crimson ${open ? "text-crimson" : ""}`}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <MegaMenu
          columns={mega}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onLinkClick={handleLinkClick}
        />
      )}
    </div>
  );
}

function NavLink({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon?: LucideIcon;
}) {
  return (
    <Link
      to={to}
      prefetch="intent"
      className="flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wider transition-colors hover:text-crimson"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </Link>
  );
}

function SecondaryNavItem({
  label,
  mega,
  Icon,
}: {
  label: string;
  mega: any[];
  Icon?: LucideIcon;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMega = mega.length > 1 || (mega.length === 1 && !!mega[0].title);

  const handleOpen = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const handleClose = () => { timer.current = setTimeout(() => setOpen(false), 150); };
  const handleLinkClick = () => { if (timer.current) clearTimeout(timer.current); setOpen(false); };

  return (
    <div className={isMega ? undefined : "relative"} onMouseEnter={handleOpen} onMouseLeave={handleClose}>
      <button className={`flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-crimson ${open ? "text-crimson" : "text-muted-foreground"}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <MegaMenu columns={mega} onMouseEnter={handleOpen} onMouseLeave={handleClose} onLinkClick={handleLinkClick} />
      )}
    </div>
  );
}

function SecondaryNavLink({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon?: LucideIcon;
}) {
  return (
    <Link
      to={to}
      prefetch="intent"
      className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-crimson"
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
    </Link>
  );
}

// ── Mobile drawer ──────────────────────────────────────────────────────────────

/** Append Shopify CDN width param safely regardless of whether ?v= already present */
function cdnImg(url: string, w = 120) {
  if (!url) return url;
  return url.includes("?") ? `${url}&width=${w}` : `${url}?width=${w}`;
}

function MobileMenuDrawer({
  mainMenu,
  secondaryMenu,
  mobileBanners,
  mobileMenu,
  onClose,
}: {
  mainMenu: NavEntry[];
  secondaryMenu: NavEntry[];
  navItemImages: Record<string, string>;
  mobileBanners: MobileBanner[];
  mobileMenu: import("~/root").MobileMenuTab[];
  onClose: () => void;
}) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const tabs = mobileMenu.length > 0 ? mobileMenu : [];
  const activeItems = tabs[activeTabIdx]?.items ?? [];

  // Build title → flat sub-links from desktop mainMenu columns
  const subLinksMap = useMemo(() => {
    const map: Record<string, { label: string; url: string }[]> = {};
    for (const entry of mainMenu) {
      const links = entry.columns.flatMap((col) =>
        col.links.length > 0
          ? col.links.map((l) => ({ label: l.label, url: l.url }))
          : col.url
          ? [{ label: col.title, url: col.url }]
          : []
      );
      if (links.length > 0) map[entry.label.toLowerCase()] = links;
    }
    return map;
  }, [mainMenu]);

  // Close accordion when tab changes
  const handleTabChange = (i: number) => {
    setActiveTabIdx(i);
    setOpenItemId(null);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <SheetTitle className="sr-only">Menu</SheetTitle>

      {/* Header */}
      <div className="relative flex shrink-0 items-center justify-center border-b border-border py-3 px-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <img src={logo} alt="MLS" className="h-8 w-auto" />
      </div>

      {/* Promo banners */}
      {mobileBanners.length > 0 && (
        <div className="flex shrink-0 gap-2 border-b border-border bg-background px-3 py-2.5">
          {mobileBanners.map((banner) => (
            <Link key={banner.id} to={banner.url} onClick={onClose} prefetch="intent" className="relative flex-1 overflow-hidden rounded-xl">
              <img src={cdnImg(banner.imageUrl, 300)} alt={banner.altText} className="h-20 w-full object-cover" loading="eager" />
            </Link>
          ))}
        </div>
      )}

      {/* Tab bar */}
      {tabs.length > 0 && (
        <div className="flex shrink-0 border-b border-border bg-background">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabChange(i)}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                i === activeTabIdx
                  ? "border-b-2 border-crimson text-crimson"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Category / collection image rows */}
        {activeItems.map((item) => {
          const initial = (item.title[0] ?? "•").toUpperCase();
          const subLinks = subLinksMap[item.title.toLowerCase()] ?? [];
          const hasSubLinks = subLinks.length > 0;
          const isOpen = openItemId === item.id;

          return (
            <div key={item.id}>
              {/* Row */}
              <div className={`flex items-center gap-3 border-b px-4 py-2.5 transition-colors ${isOpen ? "border-border bg-muted/30" : "border-border/50 hover:bg-muted/40"}`}>
                {/* Thumbnail — navigates to collection */}
                <Link to={item.url} onClick={onClose} prefetch="intent" className="h-12 w-[3.25rem] shrink-0 overflow-hidden rounded-lg">
                  {item.imageUrl ? (
                    <img src={cdnImg(item.imageUrl, 120)} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-crimson/15 to-crimson/5">
                      <span className="text-sm font-black text-crimson">{initial}</span>
                    </div>
                  )}
                </Link>
                {/* Title — navigates to collection */}
                <Link to={item.url} onClick={onClose} prefetch="intent" className="flex-1 text-[13px] font-semibold text-foreground">
                  {item.title}
                </Link>
                {/* "+" toggle — expands sub-links if available, else navigates */}
                {hasSubLinks ? (
                  <button
                    type="button"
                    onClick={() => setOpenItemId(isOpen ? null : item.id)}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[14px] font-light leading-none transition-colors ${
                      isOpen ? "border-crimson bg-crimson text-white" : "border-border text-muted-foreground hover:border-crimson hover:text-crimson"
                    }`}
                  >
                    {isOpen ? "−" : "+"}
                  </button>
                ) : (
                  <span className="text-lg font-light text-muted-foreground/40">+</span>
                )}
              </div>

              {/* Sub-links accordion */}
              {hasSubLinks && isOpen && (
                <div className="border-b border-border/40 bg-muted/20">
                  {subLinks.map((link) => (
                    <Link
                      key={link.url + link.label}
                      to={link.url}
                      onClick={onClose}
                      prefetch="intent"
                      className="flex items-center gap-2 border-b border-border/20 py-2.5 pl-[4.5rem] pr-4 text-[12px] font-medium text-foreground/70 last:border-0 transition-colors hover:text-crimson"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-crimson/50" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Divider before secondary links */}
        <div className="my-1 border-t border-border/60" />

        {/* Secondary menu — Customer Reviews, Store Locations, etc. */}
        {secondaryMenu.map((entry) => {
          const Icon = pickIcon(entry.label, entry.url ?? "");
          return (
            <Link
              key={entry.id}
              to={entry.url ?? "/"}
              onClick={onClose}
              prefetch="intent"
              className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="flex-1 text-[13px] font-semibold">{entry.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Login button */}
      <div className="shrink-0 border-t border-border p-3">
        <a
          href="https://mlsuae.ae/customer_authentication/redirect?locale=en&region_country=AE"
          className="flex w-full items-center justify-center rounded-lg bg-crimson py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-crimson/90"
        >
          Login / Sign Up
        </a>
      </div>
    </div>
  );
}
