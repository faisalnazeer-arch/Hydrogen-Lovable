import { useState } from "react";
import { Link } from "react-router";
import type { ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/product/ProductCard";
import { HScroller } from "./HScroller";

interface TabData {
  label: string;
  handle: string;
  products: ShopifyProduct[];
}

interface CategorySectionProps {
  handle: string;
  title: string;
  subtitle?: string;
  products?: ShopifyProduct[];
  tabs?: TabData[];
}

export function CategorySection({
  handle,
  title,
  subtitle,
  products = [],
  tabs,
}: CategorySectionProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const hasTabs = tabs && tabs.length > 1;
  const activeTab = hasTabs ? tabs[activeIdx] : null;
  const visibleProducts = activeTab ? activeTab.products : products;
  const viewAllHandle = activeTab ? activeTab.handle : handle;

  return (
    <section className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-5 text-center md:mb-8">
        {subtitle && (
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <span className="h-px w-5 rounded-full bg-crimson" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              {subtitle}
            </span>
            <span className="h-px w-5 rounded-full bg-crimson" />
          </div>
        )}
        <h2 className="font-display text-xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      </div>

      {/* Pill tabs */}
      {hasTabs && (
        <div className="mb-5 md:mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] justify-center">
            {tabs.map((tab, idx) => (
              <button
                key={tab.handle}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  idx === activeIdx
                    ? "bg-crimson text-white shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:border-crimson/50 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View all */}
      <div className="mb-4 text-center">
        <Link
          to={`/collections/${viewAllHandle}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-crimson underline-offset-2 hover:underline md:text-sm"
        >
          View all →
        </Link>
      </div>

      {/* Products */}
      {visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-muted-foreground">
          No products in this tab.
        </div>
      ) : (
        <HScroller>
          {visibleProducts.map((p) => (
            <div
              key={p.node.id}
              className="w-[44%] flex-shrink-0 snap-start sm:w-[32%] lg:w-[23%] xl:w-[19%]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </HScroller>
      )}
    </section>
  );
}
