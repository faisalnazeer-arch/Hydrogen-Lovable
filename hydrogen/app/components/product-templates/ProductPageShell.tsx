import { useState, useEffect, type ReactNode } from "react";
import { Truck, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import mlsLogo from "~/assets/mls-logo.png";
import { OriginBadge } from "~/components/product/OriginBadge";
import { StockBadge } from "~/components/product/StockBadge";
import {
  formatPrice,
  getOriginFromProduct,
  parseRatingMetafields,
  shopifyImageUrl,
  type ShopifyProduct,
} from "~/lib/shopify";
import { useCartStore } from "~/stores/cartStore";
import { JudgemeReviews } from "~/components/reviews/JudgemeReviews";
import { StarRating } from "~/components/reviews/StarRating";
import { SubscriptionSelector, parseSellingPlanGroups } from "~/components/product/SubscriptionSelector";
import { ProductCard } from "~/components/product/ProductCard";
import { HScroller } from "~/components/home/HScroller";
import { useT } from "~/i18n/strings";
import { Button } from "~/components/ui/button";
import { QuantitySelector } from "~/components/shared/QuantitySelector";
import { OptionButton } from "~/components/shared/OptionButton";
import type { JudgemeRatingSummary } from "~/lib/judgeme";

export interface ProductPageShellProps {
  product: any;
  sellingPlanGroupsRaw: any[];
  discountMap: Record<string, number>;
  reviews: any[];
  reviewsTotalCount: number;
  rating: JudgemeRatingSummary;
  externalId: string | null;
  recommendations: ShopifyProduct[];
  extraSections?: ReactNode;
}

export function ProductPageShell({
  product,
  sellingPlanGroupsRaw,
  discountMap,
  reviews,
  reviewsTotalCount,
  rating,
  externalId,
  recommendations,
  extraSections,
}: ProductPageShellProps) {
  const t = useT();
  const variants = product.variants.nodes;
  const images = product.images.nodes;
  const origin = getOriginFromProduct(product.tags, product.title);

  const metaRating = parseRatingMetafields((product as any).metafields);
  const displayRating = rating.average > 0 ? rating : metaRating;
  const displayCount = reviewsTotalCount > 0 ? reviewsTotalCount : metaRating.count;

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((variants[0]?.selectedOptions ?? []).map((o: any) => [o.name, o.value]))
  );
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const sellingPlanGroups = parseSellingPlanGroups(sellingPlanGroupsRaw, discountMap);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  const variant =
    variants.find((v: any) =>
      v.selectedOptions.every((o: any) => selectedOptions[o.name] === o.value)
    ) ?? variants[0];

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  };

  const currency = variant?.price.currencyCode ?? "AED";

  const selectedAllocation = selectedPlanId
    ? (variant as any)?.sellingPlanAllocations?.nodes?.find(
        (a: any) => a.sellingPlan?.id === selectedPlanId
      )
    : null;

  const allocPrice = selectedAllocation?.priceAdjustments?.[0]?.price;
  const regularAmt = parseFloat(variant?.price?.amount ?? "0");
  const allocAmt = allocPrice ? parseFloat(allocPrice.amount) : regularAmt;
  const activePlanDiscount = selectedPlanId ? (discountMap[selectedPlanId] ?? 10) : 0;
  const effectiveSubAmt = selectedPlanId
    ? (allocAmt < regularAmt ? allocAmt : regularAmt * (1 - activePlanDiscount / 100))
    : regularAmt;

  const displayPrice = selectedPlanId
    ? { amount: effectiveSubAmt.toFixed(2), currencyCode: variant?.price?.currencyCode ?? "AED" }
    : variant?.price;

  const displayCompareAt = selectedPlanId ? variant?.price : variant?.compareAtPrice;

  useEffect(() => {
    if (!variant?.image?.url) return;
    const idx = images.findIndex((img: any) => img.url === variant.image!.url);
    if (idx !== -1) setActiveImage(idx);
  }, [variant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const allPlans = sellingPlanGroups.flatMap((g) => g.plans);
  const activePlanName = selectedPlanId
    ? (allPlans.find((p) => p.id === selectedPlanId)?.name ?? null)
    : null;

  const handleAddToCart = async () => {
    if (!variant) return;
    const cartCompareAtPrice = selectedPlanId ? variant.price : (variant.compareAtPrice ?? null);
    await addItem({
      product: shopifyProduct,
      variantId: variant.id,
      variantTitle: variant.title,
      price: displayPrice,
      compareAtPrice: cartCompareAtPrice,
      quantity: qty,
      selectedOptions: variant.selectedOptions,
      sellingPlanId: selectedPlanId ?? undefined,
      sellingPlanName: activePlanName,
    });
    toast.success(t("product.added"), {
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
                        const hypothetical = { ...selectedOptions, [option.name]: value };
                        const matchingVariant = variants.find((v: any) =>
                          v.selectedOptions.every((o: any) => hypothetical[o.name] === o.value)
                        );
                        return (
                          <OptionButton
                            key={value}
                            label={value}
                            active={selectedOptions[option.name] === value}
                            disabled={!matchingVariant?.availableForSale}
                            onClick={() => handleOptionSelect(option.name, value)}
                          />
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
              planPrices={Object.fromEntries(
                ((variant as any)?.sellingPlanAllocations?.nodes ?? [])
                  .map((a: any) => [a.sellingPlan?.id, a.priceAdjustments?.[0]?.price?.amount])
                  .filter(([id, price]: [string, string]) => {
                    if (!id || !price) return false;
                    return parseFloat(price) < parseFloat(variant?.price?.amount ?? "0");
                  })
              )}
            />
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3">
            <QuantitySelector size="lg" value={qty} onChange={setQty} />
            <Button
              variant="primary"
              size="lg"
              onClick={handleAddToCart}
              disabled={!variant?.availableForSale || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : variant?.availableForSale ? (
                t("product.add")
              ) : (
                t("product.out_of_stock")
              )}
            </Button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/40 p-4">
            {[
              { icon: Truck, label: t("product.trust_delivery") },
              { icon: ShieldCheck, label: t("product.trust_halal") },
              { icon: RefreshCw, label: t("product.trust_quality") },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="h-6 w-6 text-crimson" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.descriptionHtml && (
            <div className="border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("product.details")}
              </h3>
              <div
                className="prose prose-sm max-w-none text-muted-foreground [&_p]:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Template-specific extra sections (between product info and reviews) */}
      {extraSections}

      {/* Reviews */}
      <div id="reviews" className="container mx-auto px-4 pb-16">
        <JudgemeReviews
          reviews={reviews}
          rating={rating}
          totalCount={reviewsTotalCount}
          handle={product.handle}
          externalId={externalId ?? undefined}
          metaAverage={displayRating.average}
          metaCount={displayCount}
        />
      </div>

      {/* Recommended products */}
      {recommendations.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <div className="mb-6 border-t border-border pt-10">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">You may also like</p>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">Recommended Products</h2>
          </div>
          <HScroller>
            {recommendations.map((rec) => (
              <div
                key={rec.node.id}
                className="w-[46%] flex-shrink-0 snap-start sm:w-[32%] lg:w-[23%] xl:w-[19%]"
              >
                <ProductCard product={rec} />
              </div>
            ))}
          </HScroller>
        </section>
      )}
    </div>
  );
}
