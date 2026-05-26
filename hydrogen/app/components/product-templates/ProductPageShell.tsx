import { useState, useEffect, type ReactNode, useRef } from "react";
import { Heart, Minus, Plus, Truck, ShieldCheck, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
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
import { useWishlistStore } from "~/stores/wishlistStore";
import { JudgemeReviews } from "~/components/reviews/JudgemeReviews";
import { StarRating } from "~/components/reviews/StarRating";
import { SubscriptionSelector, parseSellingPlanGroups } from "~/components/product/SubscriptionSelector";

export interface ProductPageShellProps {
  product: any;
  sellingPlanGroupsRaw: any[];
  discountMap: Record<string, number>;
  reviews: any[];
  reviewsTotalCount: number;
  rating: any;
  templateSuffix?: string | null;
  extraSections?: ReactNode;
}

const DESC_CLAMP_PX = 120;

function DescriptionWithToggle({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (innerRef.current) {
      setOverflow(innerRef.current.scrollHeight > DESC_CLAMP_PX + 10);
    }
  }, [html]);

  return (
    <div>
      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: expanded ? "none" : DESC_CLAMP_PX }}
      >
        <div
          ref={innerRef}
          className="prose prose-sm max-w-none [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-semibold text-crimson hover:underline"
        >
          {expanded ? "View less ↑" : "View more ↓"}
        </button>
      )}
    </div>
  );
}

function AccordionItem({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold transition-colors hover:text-crimson"
      >
        {title}
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? "none" : 0 }}
      >
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProductPageShell({
  product,
  sellingPlanGroupsRaw,
  discountMap,
  reviews,
  reviewsTotalCount,
  rating,
  templateSuffix,
  extraSections,
}: ProductPageShellProps) {
  const variants = product.variants.nodes;
  const images = product.images.nodes;
  const origin = getOriginFromTags(product.tags);

  const metaRating = parseRatingMetafields((product as any).metafields);
  const displayRating = rating.average > 0 ? rating : metaRating;
  const displayCount = reviewsTotalCount > 0 ? reviewsTotalCount : metaRating.count;

  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const sellingPlanGroups = parseSellingPlanGroups(sellingPlanGroupsRaw, discountMap);

  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const wishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const variant = variants.find((v: any) => v.id === selectedVariantId) ?? variants[0];
  const currency = variant?.price.currencyCode ?? "AED";

  const selectedAllocation = selectedPlanId
    ? (variant as any)?.sellingPlanAllocations?.nodes?.find(
        (a: any) => a.sellingPlan?.id === selectedPlanId
      )
    : null;
  const displayPrice = selectedAllocation?.priceAdjustments?.[0]?.price ?? variant?.price;
  const displayCompareAt = selectedAllocation
    ? selectedAllocation.priceAdjustments?.[0]?.compareAtPrice ?? variant?.compareAtPrice
    : variant?.compareAtPrice;

  useEffect(() => {
    if (!variant?.image?.url) return;
    const idx = images.findIndex((img: any) => img.url === variant.image!.url);
    if (idx !== -1) setActiveImage(idx);
  }, [selectedVariantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasOptions =
    product.options.length > 1 ||
    product.options.some((o: any) => o.values.length > 1 && o.values[0] !== "Default Title");

  const shopifyProduct: ShopifyProduct = {
    node: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: "",
      descriptionHtml: product.descriptionHtml ?? "",
      tags: product.tags,
      vendor: product.vendor ?? "",
      productType: "",
      availableForSale: variants.some((v: any) => v.availableForSale),
      priceRange: product.priceRange,
      images: { edges: images.map((img: any) => ({ node: img })) },
      variants: {
        edges: variants.map((v: any) => ({
          node: {
            id: v.id,
            title: v.title,
            availableForSale: v.availableForSale,
            quantityAvailable: v.quantityAvailable ?? null,
            price: v.price,
            compareAtPrice: v.compareAtPrice ?? null,
            selectedOptions: v.selectedOptions,
          },
        })),
      },
      options: product.options,
    },
  };

  const handleAddToCart = async () => {
    if (!variant) return;
    await addItem({
      product: shopifyProduct,
      variantId: variant.id,
      variantTitle: variant.title,
      price: displayPrice,
      quantity: qty,
      selectedOptions: variant.selectedOptions,
      sellingPlanId: selectedPlanId ?? undefined,
    });
    toast.success("Added to cart", {
      description: `${product.title}${variant.title !== "Default Title" ? ` · ${variant.title}` : ""}`,
      position: "top-center",
    });
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/collections/all" className="hover:text-foreground transition-colors">
            {product.vendor || "Products"}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[220px]">{product.title}</span>
        </nav>
      </div>

      <div className="container mx-auto grid gap-8 px-4 pb-8 md:grid-cols-2 md:gap-12">
        {/* Image gallery */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {images[activeImage] && (
              <img
                src={shopifyImageUrl(images[activeImage].url, 800)}
                alt={images[activeImage].altText ?? product.title}
                className="h-full w-full object-cover transition-opacity duration-300"
                key={activeImage}
              />
            )}
            <img src={mlsLogo} alt="" aria-hidden className="absolute right-4 top-4 h-10 w-auto opacity-60" />
            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              <OriginBadge origin={origin} />
              {variant?.compareAtPrice && (
                <span className="inline-flex rounded-sm bg-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crimson-foreground">
                  Sale
                </span>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: any, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === activeImage ? "border-crimson" : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  <img src={shopifyImageUrl(img.url, 160)} alt={img.altText ?? product.title} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {product.vendor || "MLS UAE"}
            </p>
            <h1 className="font-display mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
              {product.title}
            </h1>
            {displayRating.average > 0 && (
              <button
                type="button"
                onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-2 flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <StarRating rating={displayRating.average} size="sm" />
                <span className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                  {displayRating.average.toFixed(1)} · {displayCount} {displayCount === 1 ? "review" : "reviews"}
                </span>
              </button>
            )}
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-2xl font-bold text-crimson">
              {formatPrice(displayPrice?.amount ?? "0", currency)}
            </span>
            {displayCompareAt && (
              <span className="text-base text-muted-foreground line-through">
                {formatPrice(displayCompareAt.amount, currency)}
              </span>
            )}
            <StockBadge available={variant?.availableForSale ?? false} qty={variant?.quantityAvailable ?? null} />
          </div>

          {/* Variant selector */}
          {hasOptions && (
            <div className="flex flex-col gap-3">
              {product.options.map((option: any) => {
                if (option.values.length === 1 && option.values[0] === "Default Title") return null;
                return (
                  <div key={option.name}>
                    <p className="mb-2 text-sm font-semibold">{option.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value: any) => {
                        const matchingVariant = variants.find((v: any) =>
                          v.selectedOptions.some((o: any) => o.name === option.name && o.value === value)
                        );
                        const active = variant?.selectedOptions.some(
                          (o: any) => o.name === option.name && o.value === value
                        );
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => matchingVariant && setSelectedVariantId(matchingVariant.id)}
                            disabled={!matchingVariant?.availableForSale}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              active
                                ? "border-crimson bg-crimson text-crimson-foreground"
                                : "border-border bg-card hover:border-crimson"
                            } disabled:opacity-40`}
                          >
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

          {/* Subscription selector */}
          {sellingPlanGroups.length > 0 && (
            <SubscriptionSelector
              groups={sellingPlanGroups}
              selectedPlanId={selectedPlanId}
              onSelect={setSelectedPlanId}
              regularPrice={variant?.price.amount ?? "0"}
              currency={currency}
            />
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-11 w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-11 w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!variant?.availableForSale || isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-crimson px-6 py-3 text-sm font-bold uppercase tracking-wide text-crimson-foreground transition-colors hover:bg-rich-red disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : variant?.availableForSale ? (
                "Add to Cart"
              ) : (
                "Out of Stock"
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-crimson hover:text-crimson"
            >
              <Heart className={`h-5 w-5 ${wishlisted ? "fill-crimson text-crimson" : ""}`} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/40 p-4">
            {[
              { icon: Truck, label: "Same-day delivery" },
              { icon: ShieldCheck, label: "100% Halal certified" },
              { icon: RefreshCw, label: "Quality guarantee" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="h-6 w-6 text-crimson" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Collapsible tabs */}
          <div className="border-t border-border pt-2">
            <AccordionItem title="Description" defaultOpen={true}>
              {product.descriptionHtml ? (
                <DescriptionWithToggle html={product.descriptionHtml} />
              ) : (
                <p>No description available.</p>
              )}
            </AccordionItem>

            <AccordionItem title="Delivery Info">
              <ul className="space-y-2">
                <li>🚚 Same-day delivery available for orders placed before 2 PM.</li>
                <li>📦 Orders are packed in insulated boxes to maintain freshness.</li>
                <li>🌡️ All products are delivered chilled (0–4°C).</li>
                <li>📍 Delivery available across Muscat and major cities in Oman.</li>
              </ul>
            </AccordionItem>

            <AccordionItem title="Customer Support">
              <ul className="space-y-2">
                <li>📞 Call us: <span className="font-medium text-foreground">+968 XXXX XXXX</span></li>
                <li>💬 WhatsApp support available 9 AM – 9 PM daily.</li>
                <li>📧 Email: <span className="font-medium text-foreground">support@mls.om</span></li>
                <li>🔄 Not happy? We offer hassle-free returns within 24 hours of delivery.</li>
              </ul>
            </AccordionItem>

            {extraSections && product.metafields?.some((m: any) => m?.key?.toLowerCase().includes("rub")) && (
              <AccordionItem title="Understanding Rubs">
                {extraSections}
              </AccordionItem>
            )}
            {extraSections && templateSuffix === "whole-cuts" && !product.metafields?.some((m: any) => m?.key?.toLowerCase().includes("rub")) && (
              <AccordionItem title="About This Cut">
                {extraSections}
              </AccordionItem>
            )}
            {extraSections && templateSuffix === "box-collections" && !product.metafields?.some((m: any) => m?.key?.toLowerCase().includes("rub")) && (
              <AccordionItem title="About This Box">
                {extraSections}
              </AccordionItem>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="container mx-auto px-4 pb-16">
        <JudgemeReviews
          reviews={reviews}
          rating={rating}
          totalCount={reviewsTotalCount}
          handle={product.handle}
        />
      </div>
    </div>
  );
}
