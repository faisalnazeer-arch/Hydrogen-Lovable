import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Heart, Eye, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  type ShopifyProduct,
  formatPrice,
  getOriginFromTags,
  parseRatingMetafields,
  shopifyImageUrl,
} from "@/lib/shopify";
import { StarRating } from "@/components/reviews/StarRating";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useQuickBuyStore } from "@/stores/quickBuyStore";
import { OriginBadge } from "./OriginBadge";
import { StockBadge } from "./StockBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useT } from "@/i18n/strings";

interface ProductCardProps {
  product: ShopifyProduct;
  onQuickView?: (product: ShopifyProduct) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const t = useT();
  const node = product.node;
  const variants = node.variants.edges.map((e) => e.node);
  const firstAvailable = variants.find((v) => v.availableForSale) ?? variants[0];

  const addItem = useCartStore((s) => s.addItem);
  const openQuickBuy = useQuickBuyStore((s) => s.open);
  const [isAdding, setIsAdding] = useState(false);
  const wishlisted = useWishlistStore((s) => s.has(node.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const images = node.images.edges.map((e) => e.node);
  const primary = images[0];
  const secondary = images[1] ?? null;
  const origin = useMemo(() => getOriginFromTags(node.tags), [node.tags]);

  const currency = node.priceRange.minVariantPrice.currencyCode;
  const minPrice = node.priceRange.minVariantPrice.amount;
  const maxPrice = node.priceRange.maxVariantPrice.amount;
  const showFrom = minPrice !== maxPrice;

  const hasOptions =
    variants.length > 1 ||
    node.options.some((o) => o.values.length > 1 && o.values[0] !== "Default Title");

  const { average: avgRating, count: reviewCount } = parseRatingMetafields(node.metafields);

  const handleClick = async () => {
    if (hasOptions) {
      openQuickBuy(product);
      return;
    }
    if (!firstAvailable) return;
    setIsAdding(true);
    try {
      await addItem({
        product,
        variantId: firstAvailable.id,
        variantTitle: firstAvailable.title,
        price: firstAvailable.price,
        quantity: 1,
        selectedOptions: firstAvailable.selectedOptions || [],
      });
      toast.success(t("product.added"), {
        description: node.title,
        position: "top-center",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm transition-shadow hover:shadow-[var(--shadow-card)]"
    >
      <Link
        to={`/products/${node.handle}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {primary && (
          <img
            src={shopifyImageUrl(primary.url, 600)}
            alt={primary.altText ?? node.title}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${secondary ? "group-hover:opacity-0" : ""}`}
          />
        )}
        {secondary && (
          <img
            src={shopifyImageUrl(secondary.url, 600)}
            alt={secondary.altText ?? node.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <OriginBadge origin={origin} />
          {firstAvailable?.compareAtPrice && (
            <span className="inline-flex rounded-sm bg-crimson px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crimson-foreground">
              {t("product.sale")}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(node.id);
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:text-crimson"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-crimson text-crimson")} />
        </button>

        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuickView(product);
            }}
            className="absolute inset-x-3 bottom-3 inline-flex items-center justify-center gap-2 rounded-sm bg-charcoal/90 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-off-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100"
          >
            <Eye className="h-3.5 w-3.5" /> {t("product.quick_view")}
          </button>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <StockBadge
            available={!!firstAvailable?.availableForSale}
            qty={firstAvailable?.quantityAvailable ?? null}
          />
        </div>

        <Link
          to={`/products/${node.handle}`}
          className="min-h-[1.8rem] text-balance text-sm font-medium leading-snug text-foreground transition-colors hover:text-crimson"
          title={node.title}
        >
          {node.title}
        </Link>

        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <div className="flex flex-wrap items-baseline gap-x-2 leading-tight">
            {showFrom && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("product.from")}
              </span>
            )}
            <span className="font-display text-base font-bold text-crimson sm:text-lg">
              {formatPrice(minPrice, currency)}
            </span>
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
          <Button
            size="sm"
            onClick={handleClick}
            disabled={!firstAvailable?.availableForSale || isAdding}
            className="w-full bg-crimson text-crimson-foreground hover:bg-rich-red"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasOptions ? (
              t("product.quick_buy")
            ) : (
              t("product.add")
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
