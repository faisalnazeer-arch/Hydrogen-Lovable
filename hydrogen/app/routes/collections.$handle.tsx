import { useState, useMemo, useRef, useEffect } from "react";
import { detectLanguage } from "~/lib/locale";
import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useNavigation, useFetcher } from "react-router";
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
  query Collection(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      id title handle description
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id title handle tags availableForSale
            vendor description productType
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            compareAtPriceRange { minVariantPrice { amount currencyCode } }
            images(first: 2) { edges { node { url altText width height } } }
            options { name values }
            variants(first: 20) {
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
  { label: "Featured",           key: "COLLECTION_DEFAULT", reverse: false },
  { label: "Price: Low to High", key: "PRICE",              reverse: false },
  { label: "Price: High to Low", key: "PRICE",              reverse: true  },
  { label: "Newest",             key: "CREATED",            reverse: true  },
  { label: "Best Selling",       key: "BEST_SELLING",       reverse: false },
];

const PAGE_SIZE = 24;

// Re-fetch only when the collection handle or sort changes. Pagination uses
// useFetcher directly so it bypasses shouldRevalidate entirely.
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  const sameHandle = currentUrl.pathname === nextUrl.pathname;
  const sameSort   = currentUrl.searchParams.get("sort") === nextUrl.searchParams.get("sort");
  if (sameHandle && sameSort) return false;
  return defaultShouldRevalidate;
}

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const language = detectLanguage(request);
  const { handle } = params;
  if (!handle) throw new Response("Missing handle", { status: 400 });

  const url    = new URL(request.url);
  const sortIdx = Math.min(parseInt(url.searchParams.get("sort") ?? "0"), SORT_OPTIONS.length - 1);
  const after   = url.searchParams.get("after") ?? undefined;
  const { key: sortKey, reverse } = SORT_OPTIONS[sortIdx];

  const data = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      first: PAGE_SIZE,
      after,
      sortKey,
      reverse,
      language,
      country: "AE" as const,
    },
    cache: context.storefront.CacheLong(),
  });
  if (!data.collection) throw new Response("Not found", { status: 404 });

  return {
    collection: data.collection,
    sortIdx,
    pageInfo: data.collection.products.pageInfo as { hasNextPage: boolean; endCursor: string | null },
  };
}

/* ─── Description ─────────────────────────────────────────────────────────── */
function CollectionDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.overflow = "visible";
    el.style.display = "block";
    const fullH = el.scrollHeight;
    el.style.overflow = "";
    el.style.display = "";
    setIsMultiLine(fullH > el.clientHeight + 2);
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

/* ─── Main route component ────────────────────────────────────────────────── */
export default function Collection() {
  const { collection, sortIdx, pageInfo } = useLoaderData<typeof loader>();

  const navigate    = useNavigate();
  const navigation  = useNavigation();
  const isLoading   = navigation.state === "loading";
  const fetcher     = useFetcher<typeof loader>();

  // Accumulate all loaded products across pages.
  // Reset whenever the collection or sort order changes (new loader data).
  const loaderKey = `${collection.id}|${sortIdx}`;
  const activeKeyRef = useRef(loaderKey);
  const [allProducts, setAllProducts] = useState<ShopifyProduct[]>(() => collection.products.edges);
  const [cursor, setCursor]           = useState<string | null>(() => pageInfo.endCursor ?? null);
  const [hasMore, setHasMore]         = useState(() => pageInfo.hasNextPage);

  // When collection or sort changes the loader returns fresh data — reset state.
  if (activeKeyRef.current !== loaderKey) {
    activeKeyRef.current = loaderKey;
    setAllProducts(collection.products.edges);
    setCursor(pageInfo.endCursor ?? null);
    setHasMore(pageInfo.hasNextPage);
  }

  // Append products when fetcher returns the next page.
  useEffect(() => {
    const fd = fetcher.data as ReturnType<typeof useLoaderData<typeof loader>> | undefined;
    if (!fd?.collection?.products?.edges) return;
    setAllProducts((prev) => [...prev, ...fd.collection.products.edges]);
    setCursor(fd.pageInfo.endCursor ?? null);
    setHasMore(fd.pageInfo.hasNextPage);
  }, [fetcher.data]);

  const handleLoadMore = () => {
    if (!cursor || fetcher.state !== "idle") return;
    const url = new URL(window.location.href);
    url.searchParams.set("after", cursor);
    fetcher.load(url.pathname + url.search);
  };

  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedCuts,    setSelectedCuts]    = useState<string[]>([]);
  const [maxPrice,        setMaxPrice]        = useState<number | null>(null);
  const [filtersOpen,     setFiltersOpen]     = useState(false);

  const allPrices  = allProducts.map((p) => parseFloat(p.node.priceRange.minVariantPrice.amount));
  const globalMax  = Math.ceil(Math.max(...allPrices, 0));
  const priceMax   = maxPrice ?? globalMax;

  const originCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allProducts) {
      const o = getOriginFromProduct(p.node.tags, p.node.title);
      if (o && o !== "GRASS-FED") counts[o] = (counts[o] ?? 0) + 1;
    }
    return counts;
  }, [allProducts]);

  const cutCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allProducts) {
      for (const cut of getProductCuts(p.node.tags, p.node.title)) {
        counts[cut] = (counts[cut] ?? 0) + 1;
      }
    }
    return counts;
  }, [allProducts]);

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const price = parseFloat(p.node.priceRange.minVariantPrice.amount);
      if (price === 0) return false;
      if (price > priceMax) return false;
      const origin = getOriginFromProduct(p.node.tags, p.node.title);
      if (selectedOrigins.length > 0 && (!origin || !selectedOrigins.includes(origin))) return false;
      if (selectedCuts.length > 0) {
        const productCuts = getProductCuts(p.node.tags, p.node.title);
        if (!selectedCuts.some((c) => productCuts.includes(c))) return false;
      }
      return true;
    });
  }, [allProducts, priceMax, selectedOrigins, selectedCuts]);

  const toggleOrigin = (o: string) =>
    setSelectedOrigins((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  const toggleCut = (c: string) =>
    setSelectedCuts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const clearAll = () => { setSelectedOrigins([]); setSelectedCuts([]); setMaxPrice(null); };

  const isLoadingMore = fetcher.state !== "idle";

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border bg-card px-4 py-8 md:py-10">
        <div className="container mx-auto text-center">
          <h1 className="font-display text-2xl font-bold leading-snug tracking-tight md:text-3xl">{collection.title}</h1>
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
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Filters button (mobile) */}
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
              {/* Count — desktop only inline */}
              <span className="hidden text-sm text-muted-foreground lg:block">
                {filtered.length} of {allProducts.length} products{hasMore ? "+" : ""}
              </span>
              {/* Right: Sort */}
              <div className="relative ml-auto">
                <select
                  value={sortIdx}
                  onChange={(e) => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("sort", e.target.value);
                    url.searchParams.delete("after");
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
            {/* Count — mobile only, below the row */}
            <p className="mt-1.5 text-xs text-muted-foreground lg:hidden">
              {filtered.length} of {allProducts.length} products{hasMore ? "+" : ""}
            </p>
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

          {/* Product grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <p className="text-lg font-medium">No products match your filters</p>
              <button type="button" onClick={clearAll} className="mt-3 text-sm text-crimson underline">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.node.id} product={p} />
                ))}
              </div>

              {/* Load-more skeleton rows while fetching */}
              {isLoadingMore && (
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {/* Load More button */}
              {hasMore && !isLoadingMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-2 rounded-lg border border-crimson px-8 py-3 text-sm font-semibold text-crimson transition-colors hover:bg-crimson hover:text-white"
                  >
                    Load More Products
                  </button>
                </div>
              )}

              {/* Spinner during load */}
              {isLoadingMore && (
                <div className="mt-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-crimson" />
                </div>
              )}

              {/* End of results */}
              {!hasMore && allProducts.length > PAGE_SIZE && (
                <p className="mt-10 text-center text-sm text-muted-foreground">
                  All {allProducts.length} products loaded
                </p>
              )}
            </>
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
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold">
          Filters{" "}
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-[10px] text-white">
              {activeCount}
            </span>
          )}
        </p>
        {activeCount > 0 && (
          <button type="button" onClick={onClearAll} className="text-xs text-crimson hover:underline">
            Clear all
          </button>
        )}
      </div>

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

      {sortedOrigins.length > 0 && (
        <FilterSection title="Shop by Origin">
          <div className="flex flex-col gap-1">
            {sortedOrigins.map((code) => {
              const info  = ORIGIN_LABELS[code];
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

      {sortedCuts.length > 0 && (
        <FilterSection title="Shop by Cuts">
          <div className="flex flex-col gap-1">
            {sortedCuts.map((cut) => {
              const count   = cutCounts[cut];
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
