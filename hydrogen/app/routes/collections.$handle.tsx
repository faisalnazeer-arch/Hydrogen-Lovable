import { useState, useMemo, useRef, useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, useNavigate, useNavigation } from "react-router";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { getOriginFromProduct, ORIGIN_LABELS, type ShopifyProduct } from "~/lib/shopify";
import { ProductCard } from "~/components/product/ProductCard";

// ── Cut keywords — checked against product title + tags ───────────────────────
const CUT_KEYWORDS: Array<{ key: string; label: string }> = [
  { key: "mince",      label: "Mince"        },
  { key: "mishkak",   label: "Mishkak"      },
  { key: "cubes",     label: "Cubes"        },
  { key: "chops",     label: "Chops"        },
  { key: "steak",     label: "Steak"        },
  { key: "ribs",      label: "Ribs"         },
  { key: "shank",     label: "Shanks"       },
  { key: "rack",      label: "Rack"         },
  { key: "burger",    label: "Burgers"      },
  { key: "leg",       label: "Leg"          },
  { key: "shoulder",  label: "Shoulder"     },
  { key: "fillet",    label: "Fillet"       },
  { key: "biryani",   label: "Biryani Cut"  },
  { key: "curry cut", label: "Curry Cut"    },
  { key: "bone-in",   label: "Bone-in"      },
  { key: "boneless",  label: "Boneless"     },
  { key: "whole",     label: "Whole"        },
  { key: "tenderloin",label: "Tenderloin"   },
  { key: "slice",     label: "Sliced"       },
  { key: "neck",      label: "Neck"         },
  { key: "breast",    label: "Breast"       },
  { key: "loin",      label: "Loin"         },
];

function getProductCuts(tags: string[], title: string): string[] {
  const search = `${title} ${tags.join(" ")}`.toLowerCase();
  return CUT_KEYWORDS.filter(({ key }) => search.includes(key)).map(({ label }) => label);
}

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

function CollectionDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure natural (unclamped) height vs single-line height
    el.style.webkitLineClamp = "none";
    el.style.overflow = "visible";
    const full = el.scrollHeight;
    el.style.webkitLineClamp = "1";
    el.style.overflow = "hidden";
    const single = el.scrollHeight;
    setIsMultiLine(full > single + 2);
    // Restore
    el.style.webkitLineClamp = "";
    el.style.overflow = "";
  }, [text]);

  return (
    <div className="mx-auto mt-2 max-w-2xl text-center">
      <p
        ref={ref}
        className={`text-sm text-muted-foreground transition-all ${!expanded ? "line-clamp-1" : ""}`}
      >
        {text}
      </p>
      {isMultiLine && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-semibold text-crimson hover:underline"
        >
          {expanded ? "Read Less ↑" : "Read More ↓"}
        </button>
      )}
    </div>
  );
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
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedCuts, setSelectedCuts] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allPrices = products.map((p) =>
    parseFloat(p.node.priceRange.minVariantPrice.amount)
  );
  const globalMax = Math.ceil(Math.max(...allPrices, 0));
  const priceMax = maxPrice ?? globalMax;

  // Build origin counts from actual products in this collection
  const originCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const o = getOriginFromProduct(p.node.tags, p.node.title);
      if (o && o !== "GRASS-FED") counts[o] = (counts[o] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  // Build cut counts from actual products in this collection
  const cutCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      for (const cut of getProductCuts(p.node.tags, p.node.title)) {
        counts[cut] = (counts[cut] ?? 0) + 1;
      }
    }
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const price = parseFloat(p.node.priceRange.minVariantPrice.amount);
      if (price > priceMax) return false;
      const origin = getOriginFromProduct(p.node.tags, p.node.title);
      if (selectedOrigins.length > 0 && (!origin || !selectedOrigins.includes(origin))) return false;
      if (selectedCuts.length > 0) {
        const productCuts = getProductCuts(p.node.tags, p.node.title);
        if (!selectedCuts.some((c) => productCuts.includes(c))) return false;
      }
      return true;
    });
  }, [products, priceMax, selectedOrigins, selectedCuts]);

  const toggleOrigin = (o: string) =>
    setSelectedOrigins((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
    );

  const toggleCut = (c: string) =>
    setSelectedCuts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const clearAll = () => { setSelectedOrigins([]); setSelectedCuts([]); setMaxPrice(null); };

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border bg-card px-4 py-8">
        <div className="container mx-auto text-center">
          <h1 className="font-display text-3xl font-extrabold">{collection.title}</h1>
          {collection.description && <CollectionDescription text={collection.description} />}
        </div>
      </div>

      <div className="container mx-auto flex gap-6 px-4 py-6">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <FilterPanel
            globalMax={globalMax} priceMax={priceMax} setMaxPrice={setMaxPrice}
            originCounts={originCounts} selectedOrigins={selectedOrigins} toggleOrigin={toggleOrigin}
            cutCounts={cutCounts} selectedCuts={selectedCuts} toggleCut={toggleCut}
            onClearAll={clearAll}
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
                {(selectedOrigins.length + selectedCuts.length) > 0 && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-crimson text-[10px] font-bold text-white">
                    {selectedOrigins.length + selectedCuts.length}
                  </span>
                )}
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
                  navigate(url.pathname + url.search, { replace: true, preventScrollReset: true });
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
                  originCounts={originCounts} selectedOrigins={selectedOrigins} toggleOrigin={toggleOrigin}
                  cutCounts={cutCounts} selectedCuts={selectedCuts} toggleCut={toggleCut}
                  onClearAll={clearAll}
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <p className="text-lg font-medium">No products match your filters</p>
              <button type="button" onClick={clearAll} className="mt-3 text-sm text-crimson underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard
                  key={p.node.id}
                  product={p}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Panel ─────────────────────────────────────────────────────────── */
interface FilterPanelProps {
  globalMax: number;
  priceMax: number;
  setMaxPrice: (v: number | null) => void;
  originCounts: Record<string, number>;
  selectedOrigins: string[];
  toggleOrigin: (o: string) => void;
  cutCounts: Record<string, number>;
  selectedCuts: string[];
  toggleCut: (c: string) => void;
  onClearAll: () => void;
}

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest hover:text-crimson"
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function FilterPanel({ globalMax, priceMax, setMaxPrice, originCounts, selectedOrigins, toggleOrigin, cutCounts, selectedCuts, toggleCut, onClearAll }: FilterPanelProps) {
  const activeCount = selectedOrigins.length + selectedCuts.length + (priceMax < globalMax ? 1 : 0);
  const sortedOrigins = Object.keys(originCounts).sort((a, b) =>
    (ORIGIN_LABELS[a]?.label ?? a).localeCompare(ORIGIN_LABELS[b]?.label ?? b)
  );
  const sortedCuts = Object.keys(cutCounts).sort((a, b) => cutCounts[b] - cutCounts[a]);

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold">Filters {activeCount > 0 && <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-[10px] text-white">{activeCount}</span>}</p>
        {activeCount > 0 && (
          <button type="button" onClick={onClearAll} className="text-xs text-crimson hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* Price */}
      <FilterSection title="Price (AED)">
        <input
          type="range" min={0} max={globalMax} value={priceMax}
          onChange={(e) => setMaxPrice(parseInt(e.target.value) === globalMax ? null : parseInt(e.target.value))}
          className="w-full accent-crimson"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>AED 0</span>
          <span className="font-medium text-foreground">AED {priceMax}</span>
        </div>
      </FilterSection>

      {/* Shop by Origin */}
      {sortedOrigins.length > 0 && (
        <FilterSection title="Shop by Origin">
          <div className="flex flex-col gap-1">
            {sortedOrigins.map((code) => {
              const info = ORIGIN_LABELS[code];
              const label = info?.label ?? code;
              const count = originCounts[code];
              const checked = selectedOrigins.includes(code);
              return (
                <label key={code} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${checked ? "bg-crimson/5 font-medium text-crimson" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleOrigin(code)} className="h-4 w-4 accent-crimson flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Shop by Cuts */}
      {sortedCuts.length > 0 && (
        <FilterSection title="Shop by Cuts">
          <div className="flex flex-col gap-1">
            {sortedCuts.map((cut) => {
              const count = cutCounts[cut];
              const checked = selectedCuts.includes(cut);
              return (
                <label key={cut} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${checked ? "bg-crimson/5 font-medium text-crimson" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCut(cut)} className="h-4 w-4 accent-crimson flex-shrink-0" />
                  <span className="flex-1">{cut}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </label>
              );
            })}
          </div>
        </FilterSection>
      )}
    </div>
  );
}

/* ─── Skeleton Card ────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
