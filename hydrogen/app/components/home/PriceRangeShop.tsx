import { Link } from "react-router";
import { SectionHeader } from "./FeaturedCollections";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PriceTile {
  id: string;
  priceAmount: string;
  priceLabel: string;
  linkUrl: string;
  backgroundImageUrl: string | null;
  backgroundImageAlt: string | null;
}

export interface PriceRangeSectionData {
  heading: string;
  subHeading: string;
}

// ── Raw metaobject parsers ─────────────────────────────────────────────────

export function parsePriceRangeSection(nodes: any[]): PriceRangeSectionData {
  const node = nodes[0];
  if (!node) return { heading: "Shop by Price", subHeading: "Every budget, premium quality" };
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    heading: f["heading"]?.value ?? "Shop by Price",
    subHeading: f["sub_heading"]?.value ?? "Every budget, premium quality",
  };
}

export function parsePriceTiles(nodes: any[]): PriceTile[] {
  return nodes
    .map((node: any) => {
      const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
      const amount = f["price_amount"]?.value;
      const url = f["link_url"]?.value;
      if (!amount || !url) return null;
      return {
        id: node.id as string,
        priceAmount: amount as string,
        priceLabel: (f["price_label"]?.value ?? "AED & under") as string,
        linkUrl: url as string,
        backgroundImageUrl: f["background_image"]?.reference?.image?.url ?? null,
        backgroundImageAlt: f["background_image"]?.reference?.image?.altText ?? null,
      };
    })
    .filter(Boolean) as PriceTile[];
}

// ── Component ──────────────────────────────────────────────────────────────

interface PriceRangeShopProps {
  section?: PriceRangeSectionData | null;
  tiles?: PriceTile[];
}

export function PriceRangeShop({ section, tiles = [] }: PriceRangeShopProps) {
  const heading = section?.heading ?? "Shop by Price";
  const subHeading = section?.subHeading ?? "Every budget, premium quality";

  return (
    <section className="container mx-auto px-4 py-6 md:py-12">
      <SectionHeader title={heading} subtitle={subHeading} />
      <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] md:grid md:grid-cols-6">
        {tiles.map((tile) => (
          <PriceTileCard key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}

// ── Tile card ──────────────────────────────────────────────────────────────

function PriceTileCard({ tile }: { tile: PriceTile }) {
  return (
    <Link
      to={tile.linkUrl}
      className="group relative flex aspect-square w-[28vw] flex-shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border border-border text-crimson-foreground transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] md:w-auto"
    >
      {/* Background: image if set, else default gradient */}
      {tile.backgroundImageUrl ? (
        <>
          <img
            src={tile.backgroundImageUrl}
            alt={tile.backgroundImageAlt ?? tile.priceAmount}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-crimson to-rich-red" />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="font-display text-xl font-extrabold md:text-3xl">
          {tile.priceAmount}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-90">
          {tile.priceLabel}
        </div>
      </div>
    </Link>
  );
}
