import { useState } from "react";
import { Link } from "react-router";
import { HScroller } from "./HScroller";

function OriginFlag({
  imageUrl,
  imageAlt,
  countryCode,
}: {
  imageUrl: string | null;
  imageAlt: string;
  countryCode: string;
}) {
  const flagSrc = countryCode
    ? `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`
    : null;

  const src = imageUrl ?? flagSrc;

  if (src) {
    return (
      <div className="relative h-16 w-16 transition-transform group-hover:scale-105">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-crimson/20 to-crimson/5 ring-2 ring-crimson/30 shadow-md" />
        <img
          src={src}
          alt={imageAlt}
          className="h-full w-full rounded-full object-cover relative z-10"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="h-16 w-16 rounded-full ring-2 ring-crimson/30 bg-gradient-to-br from-crimson/10 to-bone flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
      <svg viewBox="0 0 64 64" className="h-8 w-8 text-crimson/60" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="32" cy="32" r="18" />
        <path d="M32 14 C20 20 20 44 32 50 C44 44 44 20 32 14Z" />
        <line x1="14" y1="32" x2="50" y2="32" />
      </svg>
    </div>
  );
}

export interface OriginItem {
  id: string;
  heading: string;
  link: string;
  imageUrl: string | null;
  imageAlt: string;
  category: string;
  countryCode: string;
}

export interface OriginSectionData {
  eyebrow: string;
  heading: string;
  items: OriginItem[];
}

interface Props {
  section?: OriginSectionData | null;
}

export function ShopByOrigin({ section }: Props) {
  const categories = Array.from(
    new Set((section?.items ?? []).map((i) => i.category).filter(Boolean))
  );

  const [activeTab, setActiveTab] = useState(categories[0] ?? "");

  if (!section || section.items.length === 0) return null;

  const activeItems =
    categories.length > 0
      ? section.items.filter((i) => i.category === activeTab)
      : section.items;

  return (
    <section className="bg-bone py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 text-center md:mb-10">
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <span className="h-px w-5 rounded-full bg-crimson" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              {section.eyebrow}
            </span>
            <span className="h-px w-5 rounded-full bg-crimson" />
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-4xl">
            {section.heading}
          </h2>
        </div>

        {/* Category tabs — scrollable, same style as Our Collections */}
        {categories.length > 1 && (
          <div className="relative mb-8">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 z-10 bg-gradient-to-l from-bone to-transparent" />
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <div className="flex min-w-max border-b border-border mx-auto w-fit">
                {categories.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative whitespace-nowrap px-5 py-2.5 text-sm font-semibold capitalize transition-colors ${
                      activeTab === tab
                        ? "text-crimson"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-crimson" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Carousel — keyed by tab so it resets scroll position on tab change */}
        <HScroller key={activeTab}>
          {activeItems.map((item) => (
            <Link
              key={item.id}
              to={item.link}
              className="group flex min-w-[140px] shrink-0 snap-start flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-crimson hover:shadow-[var(--shadow-card)]"
            >
              <OriginFlag
                imageUrl={item.imageUrl}
                imageAlt={item.imageAlt || item.heading}
                countryCode={item.countryCode}
              />
              <span className="text-center text-[12px] font-semibold leading-tight">
                {item.heading}
              </span>
            </Link>
          ))}
        </HScroller>
      </div>
    </section>
  );
}
