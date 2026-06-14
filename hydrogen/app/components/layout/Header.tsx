import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
  ShoppingBag,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  navItemImages,
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
  // Level 1: which top-level tab is active (Categories / Collections / Boxes)
  const [tab1Idx, setTab1Idx] = useState(0);
  // Level 2: which mainMenu entry the user drilled into (null = level 1 visible)
  const [drillEntry, setDrillEntry] = useState<NavEntry | null>(null);
  // Level 2: which column tab is active inside the drilled entry
  const [tab2Idx, setTab2Idx] = useState(0);

  const tabs = mobileMenu;
  const isCategories = tabs[tab1Idx]?.label?.toLowerCase() === "categories";

  // Columns that have sub-links → become tabs; columns without → become direct links
  const drillColumns = drillEntry?.columns ?? [];
  const tabCols   = drillColumns.filter((c) => c.links.length > 0);
  const directCols = drillColumns.filter((c) => c.links.length === 0 && c.url);
  const activeColLinks = tabCols[tab2Idx]?.links ?? [];

  const handleTab1Change = (i: number) => { setTab1Idx(i); setDrillEntry(null); setTab2Idx(0); };
  const handleDrill = (entry: NavEntry) => { setDrillEntry(entry); setTab2Idx(0); };
  const handleBack  = () => { setDrillEntry(null); setTab2Idx(0); };

  return (
    <div className="flex h-full flex-col bg-background">
      <SheetTitle className="sr-only">Menu</SheetTitle>

      {/* ── Header ── */}
      {drillEntry ? (
        /* Level 2 header: back + entry title + View All */
        <div className="relative flex shrink-0 items-center justify-center border-b border-border py-3 px-12">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-[13px] font-bold text-foreground">{drillEntry.label}</span>
          {drillEntry.url && (
            <Link
              to={drillEntry.url}
              onClick={onClose}
              prefetch="intent"
              className="absolute right-4 text-[11px] font-semibold text-crimson"
            >
              View All
            </Link>
          )}
        </div>
      ) : (
        /* Level 1 header: close + logo */
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
      )}

      {/* ── Promo banners — level 1 only ── */}
      {!drillEntry && mobileBanners.length > 0 && (
        <div className="flex shrink-0 gap-2 border-b border-border bg-background px-3 py-2.5">
          {mobileBanners.map((banner) => (
            <Link key={banner.id} to={banner.url} onClick={onClose} prefetch="intent" className="relative flex-1 overflow-hidden rounded-xl">
              <img src={cdnImg(banner.imageUrl, 300)} alt={banner.altText} className="h-24 w-full object-cover" loading="eager" />
              {(banner.heading || banner.highlight) && (
                <div className="absolute inset-0 flex flex-col justify-center pl-3 pr-1">
                  {banner.heading && <span className="text-[11px] font-black leading-tight text-white drop-shadow">{banner.heading}</span>}
                  {banner.highlight && <span className="text-[13px] font-black leading-tight text-crimson drop-shadow">{banner.highlight}</span>}
                  {banner.ctaText && <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 drop-shadow">{banner.ctaText}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* ── Level 1 tab bar (Categories | Collections | Boxes) ── */}
      {!drillEntry && tabs.length > 0 && (
        <div className="flex shrink-0 border-b border-border bg-background">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTab1Change(i)}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                i === tab1Idx ? "border-b-2 border-crimson text-crimson" : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Level 2 column tabs (Shop By Cuts | By Origin | …) ── */}
      {drillEntry && tabCols.length > 1 && (
        <div className="flex shrink-0 overflow-x-auto border-b border-border bg-background scrollbar-none">
          {tabCols.map((col, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTab2Idx(i)}
              className={`shrink-0 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                i === tab2Idx ? "border-b-2 border-crimson text-crimson" : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {col.title}
            </button>
          ))}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {drillEntry ? (
          /* ── Level 2 body ── */
          <>
            {/* Active column's links */}
            {(tabCols.length > 0 ? activeColLinks : drillColumns.flatMap((c) => c.links)).map((link) => (
              <Link
                key={link.url + link.label}
                to={link.url}
                onClick={onClose}
                prefetch="intent"
                className="flex items-center gap-3 border-b border-border/40 px-4 py-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40 hover:text-crimson"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-crimson/50" />
                {link.label}
              </Link>
            ))}

            {/* Direct-link columns (no sub-links, just a URL) — shown as plain rows */}
            {directCols.length > 0 && (
              <>
                <div className="border-t border-border/40 px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Browse
                </div>
                {directCols.map((col) => (
                  <Link
                    key={col.url}
                    to={col.url!}
                    onClick={onClose}
                    prefetch="intent"
                    className="flex items-center gap-3 border-b border-border/40 px-4 py-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/40 hover:text-crimson"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-crimson/30" />
                    {col.title}
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                  </Link>
                ))}
              </>
            )}
          </>
        ) : (
          /* ── Level 1 body ── */
          <>
            {isCategories
              ? /* Categories → mainMenu entries */
                mainMenu.map((entry) => {
                  const thumbUrl = navItemImages[entry.label] ?? entry.imageUrl ?? null;
                  const initial  = (entry.label[0] ?? "•").toUpperCase();
                  const hasChildren = entry.columns.length > 0;
                  const thumb = thumbUrl ? (
                    <img src={cdnImg(thumbUrl, 120)} alt={entry.label} className="h-12 w-[3.25rem] shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-12 w-[3.25rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-crimson/15 to-crimson/5">
                      <span className="text-sm font-black text-crimson">{initial}</span>
                    </div>
                  );

                  // Has children → whole row drills in (no navigation)
                  if (hasChildren) {
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleDrill(entry)}
                        className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                      >
                        {thumb}
                        <span className="flex-1 text-[13px] font-semibold text-foreground">{entry.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      </button>
                    );
                  }

                  // No children → whole row navigates
                  return (
                    <Link
                      key={entry.id}
                      to={entry.url ?? "/"}
                      onClick={onClose}
                      prefetch="intent"
                      className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      {thumb}
                      <span className="flex-1 text-[13px] font-semibold text-foreground">{entry.label}</span>
                    </Link>
                  );
                })
              : /* Collections / Boxes → mobileMenu items */
                (tabs[tab1Idx]?.items ?? []).map((item) => {
                  const thumbUrl = navItemImages[item.title] ?? item.imageUrl ?? null;
                  const initial  = (item.title[0] ?? "•").toUpperCase();
                  const thumb = thumbUrl ? (
                    <img src={cdnImg(thumbUrl, 120)} alt={item.title} className="h-12 w-[3.25rem] shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-12 w-[3.25rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-crimson/15 to-crimson/5">
                      <span className="text-sm font-black text-crimson">{initial}</span>
                    </div>
                  );
                  return (
                    <Link
                      key={item.id}
                      to={item.url}
                      onClick={onClose}
                      prefetch="intent"
                      className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      {thumb}
                      <span className="flex-1 text-[13px] font-semibold text-foreground">{item.title}</span>
                    </Link>
                  );
                })
            }

            {/* Divider + secondary menu */}
            <div className="my-1 border-t border-border/60" />
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
          </>
        )}
      </div>

      {/* ── Login button ── */}
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
