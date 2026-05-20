import { useState, useMemo } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, useNavigate, Link } from "react-router";
import { Heart, SlidersHorizontal, X, ChevronDown, Loader2 } from "lucide-react";
import { OriginBadge } from "~/components/product/OriginBadge";
import { StockBadge } from "~/components/product/StockBadge";
import { formatPrice, getOriginFromTags, parseRatingMetafields, shopifyImageUrl, type ShopifyProduct } from "~/lib/shopify";
import { StarRating } from "~/components/reviews/StarRating";
import { useQuickBuyStore } from "~/stores/quickBuyStore";
import { useCartStore } from "~/stores/cartStore";
import { useWishlistStore } from "~/stores/wishlistStore";
import { toast } from "sonner";
import mlsLogo from "~/assets/mls-logo.png";

const COLLECTION_QUERY = `#graphql
  query Collection($handle: String!, $first: Int!, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      id title handle description
      products(first: $first, sortKey: $sortKey, reverse: $reverse) {
        edges {
          node {
            id title handle tags availableForSale
            vendor description descriptionHtml productType
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            compareAtPriceRange { minVariantPrice { amount currencyCode } }
            images(first: 4) { edges { node { url altText width height } } }
            options { name values }
            variants(first: 50) {
              edges {
                node {
                  id title availableForSale quantityAvailable
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                  selectedOptions { name value }
                }
              }
            }
            metafields(identifiers: [
              {namespace: "reviews", key: "rating"}
              {namespace: "reviews", key: "rating_count"}
            ]) { key value }
          }
        }
      }
    }
  }
` as const;

const SORT_OPTIONS = [
  { label: "Featured", key: "COLLECTION_DEFAULT", reverse: false },
  { label: "Price: Low to High", key: "PRICE", reverse: false },
  { label: "Price: High to Low", key: "PRICE", reverse: true },
  { label: "Newest", key: "CREATED", reverse: true },
  { label: "Best Selling", key: "BEST_SELLING", reverse: false },
];

const ORIGINS = ["AUS", "NZ", "JP", "ZA", "USA", "PAK", "ARG", "BRZ", "NL"];

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";
  const { handle } = params;
  if (!handle) throw new Response("Missing handle", { status: 400 });

  const url = new URL(request.url);
  const sortIdx = Math.min(parseInt(url.searchParams.get("sort") ?? "0"), SORT_OPTIONS.length - 1);
  const { key: sortKey, reverse } = SORT_OPTIONS[sortIdx];

  const data = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      first: 60,
      sortKey,
      reverse,
      language,
      country: "AE" as const,
    },
  });
  if (!data.collection) throw new Response("Not found", { status: 404 });
  return { collection: data.collection, sortIdx };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `${data?.collection?.title ?? "Collection"} — MLS UAE` },
    { name: "description", content: data?.collection?.description ?? "" },
  ];
};

export default function Collection() {
  const { collection, sortIdx } = useLoaderData<typeof loader>();
  const products: ShopifyProduct[] = collection.products.edges;

  const navigate = useNavigate();
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [grassFedOnly, setGrassFedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allPrices = products.map((p) =>
    parseFloat(p.node.priceRange.minVariantPrice.amount)
  );
  const globalMax = Math.ceil(Math.max(...allPrices, 0));
  const priceMax = maxPrice ?? globalMax;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const price = parseFloat(p.node.priceRange.minVariantPrice.amount);
      if (price > priceMax) return false;
      const origin = getOriginFromTags(p.node.tags);
      if (selectedOrigins.length > 0 && (!origin || !selectedOrigins.includes(origin))) return false;
      if (grassFedOnly && !p.node.tags.some((t) => t.toLowerCase().includes("grass"))) return false;
      return true;
    });
  }, [products, priceMax, selectedOrigins, grassFedOnly]);

  const toggleOrigin = (o: string) =>
    setSelectedOrigins((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
    );

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border bg-card px-4 py-8">
        <div className="container mx-auto text-center">
          <h1 className="font-display text-3xl font-extrabold">{collection.title}</h1>
          {collection.description && (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{collection.description}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto flex gap-6 px-4 py-6">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <FilterPanel
            globalMax={globalMax} priceMax={priceMax} setMaxPrice={setMaxPrice}
            selectedOrigins={selectedOrigins} toggleOrigin={toggleOrigin}
            grassFedOnly={grassFedOnly} setGrassFedOnly={setGrassFedOnly}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
              <span className="text-sm text-muted-foreground">
                {filtered.length} of {products.length} products
              </span>
            </div>
            <div className="relative">
              <select
                value={sortIdx}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("sort", e.target.value);
                  navigate(url.pathname + url.search, { replace: true });
                }}
                className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm font-medium"
              >
                {SORT_OPTIONS.map((o, i) => (
                  <option key={i} value={i}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="relative ml-auto h-full w-72 overflow-y-auto bg-card p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-semibold">Filters</span>
                  <button type="button" onClick={() => setFiltersOpen(false)}><X className="h-5 w-5" /></button>
                </div>
                <FilterPanel
                  globalMax={globalMax} priceMax={priceMax} setMaxPrice={setMaxPrice}
                  selectedOrigins={selectedOrigins} toggleOrigin={toggleOrigin}
                  grassFedOnly={grassFedOnly} setGrassFedOnly={setGrassFedOnly}
                />
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <p className="text-lg font-medium">No products match your filters</p>
              <button
                type="button"
                onClick={() => { setSelectedOrigins([]); setMaxPrice(null); setGrassFedOnly(false); }}
                className="mt-3 text-sm text-crimson underline"
              >Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => <ProductCard key={p.node.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Panel ─────────────────────────────────────────────────────────── */
function FilterPanel({ globalMax, priceMax, setMaxPrice, selectedOrigins, toggleOrigin, grassFedOnly, setGrassFedOnly }: any) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest">Price (AED)</p>
        <input type="range" min={0} max={globalMax} value={priceMax}
          onChange={(e) => setMaxPrice(parseInt(e.target.value))}
          className="w-full accent-crimson" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>AED 0</span><span>AED {priceMax}</span>
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest">Origin</p>
        <div className="flex flex-col gap-2">
          {ORIGINS.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedOrigins.includes(o)}
                onChange={() => toggleOrigin(o)} className="h-4 w-4 accent-crimson" />
              {o}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest">Quality</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={grassFedOnly}
            onChange={(e) => setGrassFedOnly(e.target.checked)} className="h-4 w-4 accent-crimson" />
          Grass-fed only
        </label>
      </div>
    </div>
  );
}

/* ─── Product Card ─────────────────────────────────────────────────────────── */
function ProductCard({ product }: { product: ShopifyProduct }) {
  const node = product.node;
  const variants = node.variants.edges.map((e) => e.node);
  const firstAvailable = variants.find((v) => v.availableForSale) ?? variants[0];
  const origin = getOriginFromTags(node.tags);
  const currency = node.priceRange.minVariantPrice.currencyCode;
  const minPrice = node.priceRange.minVariantPrice.amount;
  const maxPrice = node.priceRange.maxVariantPrice.amount;
  const showFrom = minPrice !== maxPrice;
  const onSale = variants.some((v) => v.compareAtPrice);
  const images = node.images.edges.map((e) => e.node);
  const img1 = images[0];
  const img2 = images[1] ?? null; // null if no second image (no hover swap)

  const hasOptions =
    variants.length > 1 ||
    node.options.some((o) => o.values.length > 1 && o.values[0] !== "Default Title");

  const { average: avgRating, count: reviewCount } = parseRatingMetafields(node.metafields);

  const openQuickBuy = useQuickBuyStore((s) => s.open);
  const addItem = useCartStore((s) => s.addItem);
  const wishlisted = useWishlistStore((s) => s.has(node.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!firstAvailable) return;
    setIsAdding(true);
    try {
      await addItem({
        product,
        variantId: firstAvailable.id,
        variantTitle: firstAvailable.title,
        price: firstAvailable.price,
        quantity: 1,
        selectedOptions: firstAvailable.selectedOptions,
      });
      toast.success("Added to cart", { description: node.title, position: "top-center" });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/products/${node.handle}`} className="relative block aspect-square overflow-hidden bg-muted">
        {img1 && (
          <img src={shopifyImageUrl(img1.url, 600)} alt={img1.altText ?? node.title}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${img2 ? "group-hover:opacity-0" : ""}`} />
        )}
        {img2 && (
          <img src={shopifyImageUrl(img2.url, 600)} alt={img2.altText ?? node.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}
        <img src={mlsLogo} alt="" aria-hidden className="absolute right-2 top-2 h-7 w-auto opacity-50" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <OriginBadge origin={origin} />
          {onSale && (
            <span className="inline-flex rounded-sm bg-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Sale</span>
          )}
        </div>
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => { e.preventDefault(); toggleWishlist(node.id); }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-muted-foreground shadow-sm transition-colors hover:text-crimson"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-crimson text-crimson" : ""}`} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <StockBadge available={!!firstAvailable?.availableForSale} qty={firstAvailable?.quantityAvailable ?? null} />
        <Link to={`/products/${node.handle}`} className="min-h-[1.8rem] text-sm font-medium leading-snug hover:text-crimson">
          {node.title}
        </Link>
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 leading-tight">
            {showFrom && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">From</span>}
            <span className="font-display text-base font-bold text-crimson">{formatPrice(minPrice, currency)}</span>
            {firstAvailable?.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(firstAvailable.compareAtPrice.amount, currency)}
              </span>
            )}
          </div>
          <div className="flex h-5 items-center gap-1">
            {avgRating > 0 && (
              <>
                <StarRating rating={avgRating} size="sm" />
                <span className="text-[11px] text-muted-foreground">({reviewCount})</span>
              </>
            )}
          </div>
          {hasOptions ? (
            <button
              type="button"
              onClick={() => openQuickBuy(product)}
              className="w-full rounded-lg bg-crimson px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-rich-red"
            >
              Quick Buy
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!firstAvailable?.availableForSale || isAdding}
              className="w-full rounded-lg bg-crimson px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-rich-red disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
