import { useState, useRef } from "react";
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
import type { NavEntry } from "~/root";

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
}

export function Header({ mainMenu = [], secondaryMenu = [], navItemImages = {} }: HeaderProps) {
  const totalItems = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0)
  );
  const setCartOpen = useCartStore((s) => s.setOpen);
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
  onClose,
}: {
  mainMenu: NavEntry[];
  secondaryMenu: NavEntry[];
  navItemImages: Record<string, string>;
  onClose: () => void;
}) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [openCols, setOpenCols] = useState<Set<number>>(new Set());
  const [openSecondary, setOpenSecondary] = useState<Set<string>>(new Set());

  // Entries with sub-links → tabs
  const tabbedEntries = mainMenu.filter((e) => e.columns.length > 0);
  // Top-level flat links (no sub-items) — Dutch Veal, Whole Carcass, etc.
  const flatMainEntries = mainMenu.filter((e) => e.columns.length === 0);
  const activeEntry = tabbedEntries[activeTabIdx];
  const activeColumns = activeEntry?.columns ?? [];

  // Whether the active tab uses accordion or flat-list rendering
  const isAccordion =
    activeColumns.length > 1 || (activeColumns.length === 1 && !!activeColumns[0].title);
  const flatLinks = !isAccordion ? (activeColumns[0]?.links ?? []) : [];

  const handleTabSwitch = (i: number) => {
    setActiveTabIdx(i);
    setOpenCols(new Set());
  };
  const toggleCol = (i: number) =>
    setOpenCols((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="flex h-full flex-col bg-background">
      <SheetTitle className="sr-only">Menu</SheetTitle>

      {/* ── Header ── */}
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

      {/* ── Scrollable tab bar — single-line, no wrap ── */}
      {tabbedEntries.length > 0 && (
        <div className="flex shrink-0 overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {tabbedEntries.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTabSwitch(i); }}
              className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                i === activeTabIdx
                  ? "bg-crimson text-white"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── ACCORDION mode: each column is either expandable (has sub-links) or a direct link ── */}
        {isAccordion
          ? activeColumns.map((col, colIdx) => {
              const hasSubLinks = col.links.length > 0;
              const isOpen = openCols.has(colIdx);
              const initial = (col.title?.[0] ?? "•").toUpperCase();

              // No sub-links → render as a plain navigable row (no expand button)
              if (!hasSubLinks) {
                return (
                  <Link
                    key={col.title + colIdx}
                    to={col.url ?? "/"}
                    onClick={onClose}
                    prefetch="intent"
                    className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    {col.imageUrl ? (
                      <div className="h-11 w-12 shrink-0 overflow-hidden rounded-md">
                        <img
                          src={cdnImg(col.imageUrl)}
                          alt={col.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-11 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-crimson/15 to-crimson/5 flex items-center justify-center">
                        <span className="text-sm font-black text-crimson">{initial}</span>
                      </div>
                    )}
                    <span className="flex-1 text-[13px] font-semibold text-foreground">{col.title}</span>
                  </Link>
                );
              }

              // Has sub-links → accordion row
              return (
                <div key={col.title + colIdx}>
                  <button
                    type="button"
                    onClick={() => toggleCol(colIdx)}
                    className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    {col.imageUrl ? (
                      <div className="h-11 w-12 shrink-0 overflow-hidden rounded-md">
                        <img
                          src={cdnImg(col.imageUrl)}
                          alt={col.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-11 w-12 shrink-0 flex items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-crimson/15 to-crimson/5">
                        <span className="text-sm font-black text-crimson">{initial}</span>
                      </div>
                    )}
                    <span className="flex-1 text-[13px] font-semibold text-foreground">{col.title}</span>
                    <span className="w-5 text-center text-base font-light leading-none text-muted-foreground">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-b border-border/40 bg-muted/20">
                      {col.links.map((link) => (
                        <Link
                          key={link.url + link.label}
                          to={link.url}
                          onClick={onClose}
                          prefetch="intent"
                          className="block border-b border-border/20 py-2 pl-5 pr-4 text-[12px] font-medium text-foreground/65 last:border-0 transition-colors hover:text-crimson"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          : /* ── FLAT list mode: single untitled column ── */
            flatLinks.map((link) => {
              const initial = (link.label?.[0] ?? "•").toUpperCase();
              return (
                <Link
                  key={link.url + link.label}
                  to={link.url}
                  onClick={onClose}
                  prefetch="intent"
                  className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-muted/40"
                >
                  {link.imageUrl ? (
                    <div className="h-11 w-12 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={cdnImg(link.imageUrl)}
                        alt={link.label}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="h-11 w-12 shrink-0 flex items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-crimson/15 to-crimson/5">
                      <span className="text-sm font-black text-crimson">{initial}</span>
                    </div>
                  )}
                  <span className="flex-1 text-[13px] font-semibold text-foreground">{link.label}</span>
                </Link>
              );
            })}

        {/* ── Flat top-level links with no sub-items (Dutch Veal, etc.) — NO icon ── */}
        {flatMainEntries.length > 0 && (
          <div className="my-0.5 border-t border-border/60" />
        )}
        {flatMainEntries.map((entry) => {
          const initial = (entry.label?.[0] ?? "•").toUpperCase();
          // metaobject image takes priority, then Shopify resource image
          const imgUrl = navItemImages[entry.label] ?? entry.imageUrl ?? null;
          return (
            <Link
              key={entry.id}
              to={entry.url ?? "/"}
              onClick={onClose}
              prefetch="intent"
              className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="h-11 w-12 shrink-0 overflow-hidden rounded-md">
                {imgUrl ? (
                  <img
                    src={cdnImg(imgUrl)}
                    alt={entry.label}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-crimson/15 to-crimson/5">
                    <span className="text-sm font-black text-crimson">{initial}</span>
                  </div>
                )}
              </div>
              <span className="flex-1 text-[13px] font-semibold text-foreground">{entry.label}</span>
            </Link>
          );
        })}

        {/* ── Secondary menu (Customer Reviews, About MLS, etc.) ── */}
        {secondaryMenu.length > 0 && (
          <div className="my-0.5 border-t border-border/60" />
        )}
        {secondaryMenu.map((entry) => {
          const Icon = pickIcon(entry.label, entry.url ?? "");
          const hasChildren = entry.columns.length > 0;
          // Flatten all links across columns for secondary accordion
          const allLinks: { label: string; url: string }[] = entry.columns.flatMap((col) =>
            col.links.length > 0
              ? col.links.map((l) => ({ label: l.label, url: l.url }))
              : col.url
              ? [{ label: col.title, url: col.url }]
              : []
          );
          const isSecOpen = openSecondary.has(entry.id);

          if (hasChildren) {
            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSecondary((prev) => {
                      const next = new Set(prev);
                      next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
                      return next;
                    })
                  }
                  className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 text-[13px] font-semibold">{entry.label}</span>
                  <span className="w-5 text-center text-base font-light leading-none text-muted-foreground">
                    {isSecOpen ? "−" : "+"}
                  </span>
                </button>
                {isSecOpen && (
                  <div className="border-b border-border/40 bg-muted/20">
                    {allLinks.map((link) => (
                      <Link
                        key={link.url + link.label}
                        to={link.url}
                        onClick={onClose}
                        prefetch="intent"
                        className="block border-b border-border/20 py-2 pl-5 pr-4 text-[12px] font-medium text-foreground/65 last:border-0 transition-colors hover:text-crimson"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

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

      {/* ── Bottom button ── */}
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
