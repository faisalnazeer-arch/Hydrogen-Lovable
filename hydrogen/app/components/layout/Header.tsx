import { useState, useRef } from "react";
import { Link } from "react-router";
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  ChevronDown,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { Button } from "@/components/ui/button";
import { MegaMenu } from "./MegaMenu";
import { SearchAutosuggest } from "./SearchAutosuggest";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useLocaleStore, dirFor } from "@/stores/localeStore";
import { useT } from "@/i18n/strings";
import logo from "@/assets/mls-logo.png";
import type { NavEntry } from "~/root";

function pickIcon(title: string, url: string): LucideIcon {
  const s = `${title} ${url}`.toLowerCase();
  if (/beef|steak|wagyu|angus/.test(s)) return Beef;
  if (/lamb|mutton/.test(s)) return Drumstick;
  if (/review/.test(s)) return Star;
  if (/offer|sale|deal|redeem/.test(s)) return Tag;
  if (/bbq|grill|mishkak/.test(s)) return Flame;
  if (/burger|sandwich/.test(s)) return Sandwich;
  if (/box|bundle/.test(s)) return Boxes;
  if (/build|package/.test(s)) return Package;
  if (/about|info/.test(s)) return Info;
  return Compass;
}

interface HeaderProps {
  mainMenu?: NavEntry[];
  secondaryMenu?: NavEntry[];
}

export function Header({ mainMenu = [], secondaryMenu = [] }: HeaderProps) {
  const totalItems = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0)
  );
  const setCartOpen = useCartStore((s) => s.setOpen);
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const locale = useLocaleStore((s) => s.locale);
  const t = useT();
  const drawerSide = dirFor(locale) === "rtl" ? "right" : "left";
  const closeMobile = () => setMobileNavOpen(false);

  const switchLocale = (l: typeof locale) => {
    useLocaleStore.getState().setLocale(l);
    window.location.reload();
  };

  const mobileLinks: Array<{ label: string; url: string; Icon: LucideIcon }> =
    mainMenu.flatMap((entry) => {
      if (entry.columns.length > 0) {
        return entry.columns.flatMap((col) =>
          col.links.map((lk) => ({
            label: lk.label,
            url: lk.url,
            Icon: pickIcon(lk.label, lk.url),
          }))
        );
      }
      return [{ label: entry.label, url: entry.url ?? "/", Icon: pickIcon(entry.label, entry.url ?? "") }];
    });

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
          <SheetContent side={drawerSide} className="w-80">
            <SheetHeader>
              <SheetTitle className="font-display text-crimson">{t("nav.menu")}</SheetTitle>
            </SheetHeader>
            <div className="mt-3 inline-flex items-center gap-0.5 self-start rounded-full bg-muted p-0.5 text-[11px] font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => switchLocale("en")}
                aria-pressed={locale === "en"}
                className={`rounded-full px-3 py-1 transition-colors ${locale === "en" ? "bg-crimson text-crimson-foreground" : "text-muted-foreground"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => switchLocale("ar")}
                aria-pressed={locale === "ar"}
                lang="ar"
                className={`rounded-full px-3 py-1 transition-colors ${locale === "ar" ? "bg-crimson text-crimson-foreground" : "text-muted-foreground"}`}
              >
                العربية
              </button>
            </div>
            <div className="mt-3">
              <SearchAutosuggest variant="mobile" />
            </div>
            <nav className="mt-6 flex flex-col gap-1 text-sm">
              {mobileLinks.map(({ label, url, Icon }) => (
                <Link
                  key={url + label}
                  to={url}
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-sm px-3 py-2 hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-crimson" />
                  <span>{label}</span>
                </Link>
              ))}
              <Link
                to="/account/login"
                onClick={closeMobile}
                className="mt-3 flex items-center gap-3 rounded-sm border-t border-border px-3 py-2 pt-4 hover:bg-muted"
              >
                <User className="h-4 w-4 text-crimson" />
                <span>{t("nav.account")}</span>
              </Link>
            </nav>
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
            <SearchAutosuggest variant="desktop" />
          </div>
        </div>

        {/* Desktop language toggle */}
        <div className="hidden items-center gap-0.5 rounded-full bg-muted p-0.5 text-[11px] font-semibold uppercase tracking-wider lg:flex">
          <button
            type="button"
            onClick={() => switchLocale("en")}
            aria-pressed={locale === "en"}
            className={`rounded-full px-3 py-1 transition-colors ${locale === "en" ? "bg-crimson text-crimson-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => switchLocale("ar")}
            aria-pressed={locale === "ar"}
            lang="ar"
            className={`rounded-full px-3 py-1 transition-colors ${locale === "ar" ? "bg-crimson text-crimson-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            ع
          </button>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <Link to="/account/login" aria-label={t("nav.account")} className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/account" aria-label={t("nav.wishlist")} className="relative">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            {wishlistCount > 0 && (
              <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
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
        <SearchAutosuggest variant="mobile" />
      </div>

      {/* Nav rows (desktop) */}
      <nav className="hidden border-t border-border bg-card lg:block">
        <div className="container relative mx-auto flex items-center justify-center gap-7 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider">
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
        <div className="container mx-auto flex items-center justify-center gap-7 border-t border-border px-4 py-2 text-[12px] tracking-wide text-muted-foreground">
          {secondaryMenu.map((entry) => (
            <NavLink
              key={entry.id}
              to={entry.url ?? "/"}
              label={entry.label}
              Icon={pickIcon(entry.label, entry.url ?? "")}
            />
          ))}
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
    timer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button className="flex items-center gap-1.5 py-1 transition-colors hover:text-crimson">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <MegaMenu
          columns={mega}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
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
      className="flex items-center gap-1.5 transition-colors hover:text-crimson"
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}
