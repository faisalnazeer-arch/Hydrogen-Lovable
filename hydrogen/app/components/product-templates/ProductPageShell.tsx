import { useState, useEffect, useCallback, type ReactNode, useRef } from "react";
import {
  Minus, Plus, Truck, ShieldCheck, RefreshCw, Loader2, ChevronDown,
  Share2, Copy, Check, Play,
} from "lucide-react";
import { Link } from "react-router";
import mlsLogo from "~/assets/mls-logo.png";
import { OriginBadge } from "~/components/product/OriginBadge";
import { StockBadge } from "~/components/product/StockBadge";
import {
  formatPrice,
  getOriginFromTags,
  parseRatingMetafields,
  shopifyImageUrl,
  type ShopifyProduct,
} from "~/lib/shopify";
import { useCartStore } from "~/stores/cartStore";
import { useRecentlyViewed } from "~/stores/recentlyViewedStore";
import { JudgemeReviews } from "~/components/reviews/JudgemeReviews";
import { StarRating } from "~/components/reviews/StarRating";
import { SubscriptionSelector, parseSellingPlanGroups } from "~/components/product/SubscriptionSelector";
import { ProductCard } from "~/components/product/ProductCard";
import { HScroller } from "~/components/home/HScroller";
import { RecentlyViewed } from "~/components/home/RecentlyViewed";
import { GloboProductOptions } from "~/components/product/GloboProductOptions";
import type { GloboOptionSet } from "~/lib/globo";

export interface PageSettings {
  deliveryTitle: string;
  deliveryContent: string | null;
  supportTitle: string;
  supportContent: string | null;
}

export interface ProductPageShellProps {
  product: any;
  sellingPlanGroupsRaw: any[];
  discountMap: Record<string, number>;
  reviews: any[];
  reviewsTotalCount: number;
  rating: any;
  externalId?: string | null;
  templateSuffix?: string | null;
  extraSections?: ReactNode;
  recommendations?: ShopifyProduct[];
  pageSettings?: PageSettings;
  globoOptionSets?: GloboOptionSet[];
}

const DESC_CLAMP_PX = 120;

// ── Description with read more ──────────────────────────────────────────────
function DescriptionWithToggle({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    if (innerRef.current) setOverflow(innerRef.current.scrollHeight > DESC_CLAMP_PX + 10);
  }, [html]);
  return (
    <div>
      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: expanded ? "none" : DESC_CLAMP_PX }}
      >
        <div ref={innerRef} className="prose prose-sm max-w-none [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {overflow && (
        <button type="button" onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-semibold text-crimson hover:underline">
          {expanded ? "View less ↑" : "View more ↓"}
        </button>
      )}
    </div>
  );
}

// ── Accordion ──────────────────────────────────────────────────────────────
function AccordionItem({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div className="border-b border-border last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold transition-colors hover:text-crimson">
        {title}
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div ref={contentRef} className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? "none" : 0 }}>
        <div className="pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

// ── Linkify phone / email in text lines ────────────────────────────────────
function LinkifyLine({ text }: { text: string }) {
  const parts = text.split(/(\+[\d\s]{7,}|[\w.+-]+@[\w-]+\.[a-z]{2,})/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\+[\d\s]{7,}$/.test(part))
          return <a key={i} href={`tel:${part.replace(/\s/g, "")}`} className="font-medium text-crimson hover:underline">{part}</a>;
        if (/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(part))
          return <a key={i} href={`mailto:${part}`} className="font-medium text-crimson hover:underline">{part}</a>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Social share ─────────────────────────────────────────────────────────
function SocialShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = encodeURIComponent(`Check out ${title} from MLS UAE`);
  const enc = encodeURIComponent(url);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  };

  return (
    <div className="flex items-center gap-2">
      <Share2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">Share:</span>
      <button type="button" onClick={copyLink} title="Copy link"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-crimson hover:text-crimson">
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a href={`https://wa.me/?text=${text}%20${enc}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-green-500 hover:text-green-600">
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <a href={`https://twitter.com/intent/tweet?text=${text}&url=${enc}`} target="_blank" rel="noopener noreferrer" title="X"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noopener noreferrer" title="Facebook"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-blue-600 hover:text-blue-600">
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
    </div>
  );
}

// ── Back in stock ─────────────────────────────────────────────────────────
function BackInStock({ productHandle, variantId }: { productHandle: string; variantId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/back-in-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, productHandle, variantId }),
      });
      const data = await res.json() as any;
      if (!res.ok) { setErrorMsg(data.error ?? "Could not register"); setStatus("error"); }
      else setStatus("success");
    } catch {
      setErrorMsg("Could not register notification");
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-crimson/50 py-3 text-sm font-semibold text-crimson transition-colors hover:border-crimson hover:bg-crimson/5">
        🔔 Notify me when available
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="mb-3 text-sm font-semibold">Get notified when back in stock</p>
      {status === "success" ? (
        <p className="text-sm font-medium text-green-700">✓ You're on the list! We'll email you when it's available.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-crimson" />
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-crimson" />
          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={status === "loading"}
              className="flex-1 rounded-lg bg-crimson py-2 text-sm font-bold text-crimson-foreground hover:bg-rich-red disabled:opacity-50">
              {status === "loading" ? "Submitting…" : "Notify Me"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Media items ───────────────────────────────────────────────────────────
type MediaItem =
  | { type: "image"; url: string; altText: string | null }
  | { type: "video"; id: string; mp4Url: string | null; poster: string | null }
  | { type: "external_video"; id: string; embedUrl: string; poster: string | null };

function buildMediaItems(images: any[], mediaNodes: any[]): MediaItem[] {
  if (mediaNodes && mediaNodes.length > 0) {
    return mediaNodes
      .map((node: any): MediaItem | null => {
        if (node.mediaContentType === "VIDEO") {
          const mp4 = node.sources?.find((s: any) => s.mimeType === "video/mp4") ?? node.sources?.[0];
          return { type: "video", id: node.id, mp4Url: mp4?.url ?? null, poster: node.previewImage?.url ?? null };
        }
        if (node.mediaContentType === "EXTERNAL_VIDEO") {
          return { type: "external_video", id: node.id, embedUrl: node.embedUrl, poster: node.previewImage?.url ?? null };
        }
        const imgUrl = node.image?.url ?? "";
        if (!imgUrl) return null;
        return { type: "image", url: imgUrl, altText: node.image?.altText ?? null };
      })
      .filter((m): m is MediaItem => m !== null);
  }
  return images.map((img: any): MediaItem => ({ type: "image", url: img.url ?? "", altText: img.altText ?? null }));
}

// ── Shell ─────────────────────────────────────────────────────────────────
export function ProductPageShell({
  product,
  sellingPlanGroupsRaw,
  discountMap,
  reviews,
  reviewsTotalCount,
  rating,
  externalId,
  templateSuffix,
  extraSections,
  recommendations = [],
  pageSettings,
  globoOptionSets = [],
}: ProductPageShellProps) {
  const [globoAttributes, setGloboAttributes] = useState<Array<{ key: string; value: string }>>([]);
  const handleGloboChange = useCallback((attrs: Array<{ key: string; value: string }>) => setGloboAttributes(attrs), []);

  // Live Globo option sets — start with whatever the server scraped.
  // If the server returned nothing (headless store with no theme HTML to scrape),
  // fetch client-side via our API route once the component mounts.
  const [liveGloboSets, setLiveGloboSets] = useState<GloboOptionSet[]>(globoOptionSets);
  const [globoLoading, setGloboLoading] = useState(false);

  const variants = product.variants.nodes;
  const images = product.images.nodes;
  const mediaNodes = product.media?.nodes ?? [];
  const origin = getOriginFromTags(product.tags);
  const addToRecentlyViewed = useRecentlyViewed((s) => s.add);

  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const atcSentinelRef = useRef<HTMLDivElement>(null);

  // Track this product as recently viewed
  useEffect(() => { addToRecentlyViewed(product.handle); }, [product.handle, addToRecentlyViewed]);

  // Client-side Globo fetch — runs when server scraping returned nothing.
  // This is the reliable path for headless stores where the Shopify theme
  // doesn't embed Globo's window.GPOConfigs script.
  useEffect(() => {
    if (!externalId || liveGloboSets.length > 0) return;
    setGloboLoading(true);
    fetch(`/api/globo-options/${externalId}`)
      .then((r) => r.ok ? r.json() : { optionSets: [] })
      .then((data: any) => {
        const raw: GloboOptionSet[] = data?.optionSets ?? [];
        // Deduplicate by ID before storing
        const seen = new Set<string>();
        const sets = raw.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        if (sets.length > 0) setLiveGloboSets(sets);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setGloboLoading(false));
  }, [externalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sticky bar visibility — appears when main ATC scrolls out of view
  useEffect(() => {
    const el = atcSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const metaRating = parseRatingMetafields((product as any).metafields);
  const displayRating = rating.average > 0 ? rating : metaRating;
  const displayCount = reviewsTotalCount > 0 ? reviewsTotalCount : metaRating.count;

  const sellingPlanGroups = parseSellingPlanGroups(sellingPlanGroupsRaw, discountMap);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  const variant = variants.find((v: any) => v.id === selectedVariantId) ?? variants[0];
  const currency = variant?.price.currencyCode ?? "AED";

  const selectedAllocation = selectedPlanId
    ? (variant as any)?.sellingPlanAllocations?.nodes?.find((a: any) => a.sellingPlan?.id === selectedPlanId)
    : null;
  const displayPrice = selectedAllocation?.priceAdjustments?.[0]?.price ?? variant?.price;
  const displayCompareAt = selectedAllocation
    ? selectedAllocation.priceAdjustments?.[0]?.compareAtPrice ?? variant?.compareAtPrice
    : variant?.compareAtPrice;

  useEffect(() => {
    if (!variant?.image?.url) return;
    const idx = images.findIndex((img: any) => img.url === variant.image!.url);
    if (idx !== -1) setActiveMediaIdx(idx);
  }, [selectedVariantId]); // eslint-disable-line

  const hasOptions =
    product.options.length > 1 ||
    product.options.some((o: any) => o.values.length > 1 && o.values[0] !== "Default Title");

  const shopifyProduct: ShopifyProduct = {
    node: {
      id: product.id, title: product.title, handle: product.handle,
      description: "", descriptionHtml: product.descriptionHtml ?? "",
      tags: product.tags, vendor: product.vendor ?? "", productType: "",
      availableForSale: variants.some((v: any) => v.availableForSale),
      priceRange: product.priceRange,
      images: { edges: images.map((img: any) => ({ node: img })) },
      variants: { edges: variants.map((v: any) => ({ node: { id: v.id, title: v.title, availableForSale: v.availableForSale, quantityAvailable: v.quantityAvailable ?? null, price: v.price, compareAtPrice: v.compareAtPrice ?? null, selectedOptions: v.selectedOptions } })) },
      options: product.options,
    },
  };

  const handleAddToCart = async () => {
    if (!variant) return;
    await addItem({
      product: shopifyProduct, variantId: variant.id, variantTitle: variant.title,
      price: displayPrice, quantity: qty, selectedOptions: variant.selectedOptions,
      sellingPlanId: selectedPlanId ?? undefined,
      attributes: globoAttributes.length ? globoAttributes : undefined,
    });
  };

  const allMedia = buildMediaItems(images, mediaNodes);
  const activeMedia = allMedia[activeMediaIdx];

  // Extra-sections accordion label — determined entirely by template, not by
  // which metafields have values (avoids false-positive when "understanding_rubs"
  // key name contains "rub" but the product is actually a whole-cut).
  const extraSectionTitle =
    templateSuffix === "whole-cuts"     ? "About This Cut"  :
    templateSuffix === "box-collections"? "About This Box"  :
    "Understanding Rubs"; // all rubs templates

  // JSON-LD structured data
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org", "@type": "Product",
    name: product.title,
    image: images[0]?.url ?? "",
    brand: { "@type": "Brand", name: product.vendor ?? "MLS UAE" },
    offers: {
      "@type": "Offer",
      price: displayPrice?.amount ?? "0",
      priceCurrency: currency,
      availability: variants.some((v: any) => v.availableForSale) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  if (displayRating.average > 0 && displayCount > 0) {
    jsonLd.aggregateRating = { "@type": "AggregateRating", ratingValue: displayRating.average.toFixed(1), reviewCount: displayCount };
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/collections/all" className="transition-colors hover:text-foreground">{product.vendor || "Products"}</Link>
          <span>/</span>
          <span className="max-w-[220px] truncate font-medium text-foreground">{product.title}</span>
        </nav>
      </div>

      <div className="container mx-auto grid gap-8 px-4 pb-8 md:grid-cols-2 md:gap-12">
        {/* ── Media gallery ── */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {activeMedia?.type === "video" && activeMedia.mp4Url ? (
              <video src={activeMedia.mp4Url} poster={activeMedia.poster ?? undefined}
                controls autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : activeMedia?.type === "external_video" ? (
              <iframe src={activeMedia.embedUrl} className="h-full w-full"
                allow="autoplay; encrypted-media" allowFullScreen title="Product video" />
            ) : activeMedia?.type === "image" ? (
              <img src={shopifyImageUrl(activeMedia.url, 800)} alt={activeMedia.altText ?? product.title}
                className="h-full w-full object-cover transition-opacity duration-300" key={activeMediaIdx} />
            ) : null}
            <img src={mlsLogo} alt="" aria-hidden className="absolute right-4 top-4 h-10 w-auto opacity-60" />
            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              <OriginBadge origin={origin} />
              {variant?.compareAtPrice && (
                <span className="inline-flex rounded-sm bg-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crimson-foreground">Sale</span>
              )}
            </div>
          </div>
          {allMedia.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allMedia.map((media, i) => {
                const thumb = media.type === "image" ? shopifyImageUrl(media.url, 160) : media.type === "video" ? (media.poster ?? "") : (media as any).poster ?? "";
                return (
                  <button key={i} type="button" onClick={() => setActiveMediaIdx(i)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === activeMediaIdx ? "border-crimson" : "border-transparent hover:border-muted-foreground"}`}>
                    {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                    {(media.type === "video" || media.type === "external_video") && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Product info ── */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{product.title}</h1>
            {displayRating.average > 0 && (
              <button type="button" onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-2 flex items-center gap-2 transition-opacity hover:opacity-80">
                <StarRating rating={displayRating.average} size="sm" />
                <span className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                  {displayRating.average.toFixed(1)} · {displayCount} {displayCount === 1 ? "review" : "reviews"}
                </span>
              </button>
            )}
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-2xl font-bold text-crimson">{formatPrice(displayPrice?.amount ?? "0", currency)}</span>
              {displayCompareAt && <span className="text-base text-muted-foreground line-through">{formatPrice(displayCompareAt.amount, currency)}</span>}
              <StockBadge available={variant?.availableForSale ?? false} qty={variant?.quantityAvailable ?? null} />
            </div>

            {/* Price per kg — shown from Shopify unit pricing, or custom metafield, or parsed from variant title */}
            {(() => {
              // 1. Shopify built-in unit price
              const unitPrice = (variant as any)?.unitPrice;
              const unitMeasure = (variant as any)?.unitPriceMeasurement;
              if (unitPrice?.amount && parseFloat(unitPrice.amount) > 0) {
                const unit = unitMeasure?.referenceUnit ?? "kg";
                return (
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(unitPrice.amount, unitPrice.currencyCode)} / {unit}
                  </p>
                );
              }

              // 2. Custom metafield price_per_kg on the variant
              const metaPerKg = (variant as any)?.metafields?.find(
                (m: any) => m?.key === "price_per_kg"
              )?.value;
              if (metaPerKg) {
                const numVal = parseFloat(metaPerKg);
                if (!isNaN(numVal) && numVal > 0) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(numVal.toString(), currency)} / kg
                    </p>
                  );
                }
              }

              // 3. Parse weight from variant title and calculate (e.g. "6kg", "500g", "2.5 kg")
              if (variant?.title && displayPrice?.amount) {
                const kgMatch = variant.title.match(/(\d+(?:\.\d+)?)\s*kg/i);
                const gMatch  = variant.title.match(/(\d+(?:\.\d+)?)\s*g(?!$|\w)/i); // grams, not "grilled"
                let kgValue: number | null = null;
                if (kgMatch)  kgValue = parseFloat(kgMatch[1]);
                else if (gMatch) kgValue = parseFloat(gMatch[1]) / 1000;

                if (kgValue && kgValue > 0) {
                  const pricePerKg = parseFloat(displayPrice.amount) / kgValue;
                  if (pricePerKg > 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(pricePerKg.toFixed(2), currency)} / kg
                      </p>
                    );
                  }
                }
              }

              return null;
            })()}
          </div>

          {/* Variants */}
          {hasOptions && (
            <div className="flex flex-col gap-3">
              {product.options.map((option: any) => {
                if (option.values.length === 1 && option.values[0] === "Default Title") return null;
                return (
                  <div key={option.name}>
                    <p className="mb-2 text-sm font-semibold">{option.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value: any) => {
                        const mv = variants.find((v: any) => v.selectedOptions.some((o: any) => o.name === option.name && o.value === value));
                        const active = variant?.selectedOptions.some((o: any) => o.name === option.name && o.value === value);
                        return (
                          <button key={value} type="button" onClick={() => mv && setSelectedVariantId(mv.id)} disabled={!mv?.availableForSale}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${active ? "border-crimson bg-crimson text-crimson-foreground" : "border-border bg-card hover:border-crimson"} disabled:opacity-40`}>
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Globo custom options — loaded from server scrape or client-side fetch */}
          {globoLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading options…
            </div>
          )}
          {liveGloboSets.length > 0 && (
            <div className="border-t border-border pt-4">
              <GloboProductOptions optionSets={liveGloboSets} onChange={handleGloboChange} />
            </div>
          )}

          {/* Subscription */}
          {sellingPlanGroups.length > 0 && (
            <SubscriptionSelector groups={sellingPlanGroups} selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId}
              regularPrice={variant?.price.amount ?? "0"} currency={currency} />
          )}

          {/* ATC sentinel — IntersectionObserver watches this */}
          <div ref={atcSentinelRef} aria-hidden />

          {/* Quantity + ATC / Back in stock */}
          {variant?.availableForSale ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-border">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} className="grid h-10 w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"><Plus className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={handleAddToCart} disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-crimson px-6 py-3 text-sm font-bold uppercase tracking-wide text-crimson-foreground transition-colors hover:bg-rich-red disabled:opacity-50">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Cart"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button type="button" disabled className="w-full rounded-lg bg-muted py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Out of Stock</button>
              <BackInStock productHandle={product.handle} variantId={variant?.id ?? ""} />
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/40 p-4">
            {[{ icon: Truck, label: "2-hour delivery" }, { icon: ShieldCheck, label: "100% Halal certified" }, { icon: RefreshCw, label: "Quality guarantee" }].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="h-6 w-6 text-crimson" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Social share */}
          <SocialShare title={product.title} />

          {/* Accordions */}
          <div className="border-t border-border pt-2">
            <AccordionItem title="Description" defaultOpen>
              {product.descriptionHtml ? <DescriptionWithToggle html={product.descriptionHtml} /> : <p>No description available.</p>}
            </AccordionItem>
            <AccordionItem title={pageSettings?.deliveryTitle ?? "Delivery Info"}>
              {pageSettings?.deliveryContent ? (
                <ul className="space-y-2">{pageSettings.deliveryContent.split("\n").filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
              ) : (
                <ul className="space-y-2">
                  <li>2-hour delivery available for orders placed before 8 PM.</li>
                  <li>Orders are packed in insulated boxes to maintain freshness.</li>
                  <li>All products are delivered chilled (0–4°C).</li>
                  <li>Delivery available across UAE and major cities.</li>
                </ul>
              )}
            </AccordionItem>
            <AccordionItem title={pageSettings?.supportTitle ?? "Customer Support"}>
              <ul className="space-y-2">
                {(pageSettings?.supportContent ? pageSettings.supportContent.split("\n").filter(Boolean) : ["Call or WhatsApp: +971504516403", "Support available 9 AM – 9 PM daily.", "Email: contactus@mlsuae.ae", "Hassle-free returns within 24 hours of delivery."]).map((line, i) => (
                  <li key={i}><LinkifyLine text={line} /></li>
                ))}
              </ul>
            </AccordionItem>
            {extraSections && (
              <AccordionItem title={extraSectionTitle}>{extraSections}</AccordionItem>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Add to Cart bar ── */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 ${stickyVisible ? "translate-y-0" : "translate-y-full"}`}>
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {images[0] && (
            <img src={shopifyImageUrl(images[0].url, 80)} alt={product.title} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold sm:text-sm">{product.title}</p>
            <p className="text-sm font-bold text-crimson">{formatPrice(displayPrice?.amount ?? "0", currency)}</p>
          </div>
          {variant?.availableForSale ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-border">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" onClick={handleAddToCart} disabled={isLoading}
                className="rounded-lg bg-crimson px-4 py-3 text-sm font-bold uppercase tracking-wide text-crimson-foreground transition-colors hover:bg-rich-red disabled:opacity-50">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Cart"}
              </button>
            </div>
          ) : (
            <span className="rounded-lg bg-muted px-4 py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Out of Stock</span>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="container mx-auto px-4 pb-8">
        <JudgemeReviews reviews={reviews} rating={rating} totalCount={reviewsTotalCount} handle={product.handle} externalId={externalId ?? undefined} />
      </div>

      {/* Recommended products */}
      {recommendations.length > 0 && (
        <div className="container mx-auto px-4 pb-16">
          <div className="mb-3 md:mb-6">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson md:mb-1 md:text-[11px]">You might also like</p>
            <h2 className="font-display text-lg font-extrabold md:text-2xl">Recommended for You</h2>
          </div>
          <HScroller>
            {recommendations.map((p) => (
              <div key={p.node.id} className="w-[44%] flex-shrink-0 snap-start sm:w-[32%] lg:w-[23%] xl:w-[19%]">
                <ProductCard product={p} />
              </div>
            ))}
          </HScroller>
        </div>
      )}

      {/* Recently viewed */}
      <RecentlyViewed />
    </div>
  );
}
