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
    <section className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-4 text-center">
        {subtitle && (
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            {subtitle}
          </div>
        )}
        <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>

      {/* Collection tabs */}
      {hasTabs && (
        <div className="mb-4 flex justify-center">
          <div className="flex border-b border-border">
            {tabs.map((tab, idx) => (
              <TabButton
                key={tab.handle}
                active={idx === activeIdx}
                onClick={() => setActiveIdx(idx)}
                count={tab.products.length}
              >
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>
      )}

      {/* View all */}
      <div className="mb-6 text-center">
        <Link
          to={`/collections/${viewAllHandle}`}
          className="text-sm font-semibold text-crimson underline-offset-2 hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Products */}
      {visibleProducts.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card/50 px-6 py-12 text-center text-muted-foreground">
          No products in this tab.
        </div>
      ) : (
        <HScroller>
          {visibleProducts.map((p) => (
            <div
              key={p.node.id}
              className="w-[46%] flex-shrink-0 snap-start sm:w-[32%] lg:w-[23%] xl:w-[19%]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </HScroller>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-6 py-2.5 text-sm font-semibold transition-colors ${
        active ? "text-crimson" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {count > 0 && (
        <span className={`ml-1.5 text-xs ${active ? "text-crimson/70" : "text-muted-foreground/70"}`}>
          ({count})
        </span>
      )}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-crimson" />
      )}
    </button>
  );
}
