import { Link } from "react-router";

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
  allBoxesUrl?: string | null;
}

// ── Raw metaobject parsers ─────────────────────────────────────────────────

export function parsePriceRangeSection(nodes: any[]): PriceRangeSectionData {
  const node = nodes[0];
  if (!node) return { heading: "Shop by Price", subHeading: "Every Budget · Premier Quality" };
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    heading: f["heading"]?.value ?? "Shop by Price",
    subHeading: f["sub_heading"]?.value ?? "Every Budget · Premier Quality",
    allBoxesUrl: f["all_boxes_url"]?.value ?? null,
  };
}

export function parsePriceTiles(nodes: any[]): PriceTile[] {
  return nodes
    .map((node: any) => {
      const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
      const amount = f["price_amount"]?.value;
      if (!amount) return null;

      const collectionHandle = f["collection"]?.reference?.handle;
      const fallbackUrl = f["link_url"]?.value ?? "";
      const url = collectionHandle ? `/collections/${collectionHandle}` : fallbackUrl;
      if (!url) return null;

      return {
        id: node.id as string,
        priceAmount: amount as string,
        priceLabel: (f["price_label"]?.value ?? "") as string,
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
  if (tiles.length === 0) return null;

  const heading = section?.heading ?? "Shop by Price";
  const subHeading = section?.subHeading ?? "Every Budget · Premier Quality";

  // Feature the middle card
  const featuredIdx = Math.floor(tiles.length / 2) - (tiles.length % 2 === 0 ? 1 : 0);

  return (
    <section className="bg-bone py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">

        {/* ── Header row ── */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-5 rounded-full bg-crimson" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              {subHeading}
            </span>
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {heading}
          </h2>
        </div>

        {/* ── Price cards ── */}
        {/* Outer div handles x-scroll on mobile; inner div is overflow-visible so hover translate isn't clipped */}
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] md:overflow-visible">
          <div className="flex gap-2.5 pt-2 pb-6 sm:gap-3 md:grid md:grid-cols-6">
            {tiles.map((tile, i) => (
              <PriceTileCard key={tile.id} tile={tile} featured={i === featuredIdx} />
            ))}
          </div>
        </div>


        </div>
      </div>
    </section>
  );
}

// ── Single price card ──────────────────────────────────────────────────────

function PriceTileCard({ tile, featured }: { tile: PriceTile; featured?: boolean }) {
  return (
    <Link
      to={tile.linkUrl}
      prefetch="intent"
      className={[
        "group relative flex w-[38vw] shrink-0 flex-col rounded-2xl bg-card p-3.5 transition-all duration-300",
        "hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]",
        "md:w-auto md:p-4",
        featured
          ? "border-2 border-crimson shadow-[0_4px_20px_rgba(185,28,28,0.12)]"
          : "border border-border hover:border-crimson/60",
      ].join(" ")}
    >
      {/* Tier label */}
      {tile.priceLabel ? (
        <span className="mb-2.5 block text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/40 md:text-[10px]">
          {tile.priceLabel}
        </span>
      ) : (
        <span className="mb-2.5 block h-3.5" />
      )}

      {/* Price number + currency */}
      <div className="flex items-start gap-0.5">
        <span className="text-2xl font-black leading-none tracking-tight text-foreground transition-colors duration-300 group-hover:text-crimson md:text-[2rem]">
          {tile.priceAmount}
        </span>
        <span className="ml-0.5 mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-foreground/40 md:text-[9px]">
          AED
        </span>
      </div>

      {/* Subtitle */}
      <span className="mt-1 text-[11px] font-medium text-foreground/45 md:text-[11px]">
        &amp; under
      </span>

      {/* Accent line — grows on hover */}
      <div
        className={[
          "mt-3.5 h-[2px] rounded-full transition-all duration-300",
          featured
            ? "w-7 bg-crimson group-hover:w-10"
            : "w-4 bg-crimson/30 group-hover:w-7 group-hover:bg-crimson",
        ].join(" ")}
      />
    </Link>
  );
}
