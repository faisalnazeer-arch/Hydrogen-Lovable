import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ExternalLink, Loader2, ShoppingBag, RefreshCw } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, shopifyImageUrl } from "@/lib/shopify";
import { useT } from "@/i18n/strings";

const FREE_SHIPPING_THRESHOLD = 150;

export function CartDrawer() {
  const {
    items,
    isOpen,
    setOpen,
    isLoading,
    isSyncing,
    updateQuantity,
    removeItem,
    getCheckoutUrl,
    syncCart,
  } = useCartStore();

  const t = useT();

  useEffect(() => {
    if (isOpen) syncCart();
  }, [isOpen, syncCart]);

  const totalItems = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce(
    (n, i) => n + parseFloat(i.price.amount) * i.quantity,
    0
  );
  const currency = items[0]?.price.currencyCode ?? "AED";
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) {
      window.open(url, "_blank");
      setOpen(false);
    }
  };

  const itemLabel = totalItems === 1 ? t("cart.item") : t("cart.items");

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-display text-xl">{t("cart.title")}</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? t("cart.empty") : `${totalItems} ${itemLabel}`}
          </SheetDescription>
        </SheetHeader>

        {items.length > 0 && (
          <div className="border-b border-border bg-bone px-6 py-3">
            {remaining > 0 ? (
              <p className="text-xs text-foreground">
                {t("cart.add_prefix")}{" "}
                <span className="font-bold text-crimson">
                  {formatPrice(remaining, currency)}
                </span>{" "}
                {t("cart.add_suffix")}
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-700">
                {t("cart.free_unlocked")}
              </p>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-crimson transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">{t("cart.empty")}</p>
              <Button onClick={() => setOpen(false)} variant="outline">
                {t("cart.continue")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const img = item.product.node.images.edges[0]?.node;
                const pending = !!item.isPending;
                return (
                  <li
                    key={`${item.variantId}-${item.sellingPlanId ?? "none"}`}
                    className={`flex gap-3 p-4 transition-opacity ${pending ? "opacity-60" : ""}`}
                  >
                    {/* Product image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {img && (
                        <img
                          src={shopifyImageUrl(img.url, 200)}
                          alt={img.altText ?? item.product.node.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                      {pending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                          <Loader2 className="h-5 w-5 animate-spin text-crimson" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">
                        {item.product.node.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.selectedOptions.map((o) => o.value).join(" · ") ||
                          item.variantTitle}
                      </div>

                      {/* Subscription info */}
                      {item.sellingPlanId && (() => {
                        const subPrice = parseFloat(item.price.amount);
                        const regPrice = item.compareAtPrice ? parseFloat(item.compareAtPrice.amount) : 0;
                        const savePct = regPrice > subPrice ? Math.round((1 - subPrice / regPrice) * 100) : 0;
                        const label = [
                          item.sellingPlanName ?? "Subscribe & Save",
                          savePct > 0 ? `with ${savePct}% discount` : "",
                        ].filter(Boolean).join(" ");
                        return (
                          <div className="flex items-center gap-1 text-xs text-green-700">
                            <RefreshCw className="h-3 w-3 flex-shrink-0" />
                            <span>{label}</span>
                          </div>
                        );
                      })()}

                      <div className="mt-auto flex items-center justify-between pt-1">
                        {/* Qty controls — disabled while pending */}
                        <div className={`flex items-center rounded border border-border ${pending ? "pointer-events-none opacity-50" : ""}`}>
                          <button
                            type="button"
                            aria-label="Decrease"
                            disabled={pending || isLoading}
                            className="grid h-7 w-7 place-items-center hover:bg-muted disabled:cursor-not-allowed"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase"
                            disabled={pending || isLoading}
                            className="grid h-7 w-7 place-items-center hover:bg-muted disabled:cursor-not-allowed"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end gap-0">
                          {item.compareAtPrice && item.compareAtPrice.amount !== item.price.amount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(
                                parseFloat(item.compareAtPrice.amount) * item.quantity,
                                item.compareAtPrice.currencyCode
                              )}
                            </span>
                          )}
                          <span className="font-bold text-crimson">
                            {formatPrice(
                              parseFloat(item.price.amount) * item.quantity,
                              item.price.currencyCode
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remove — disabled while pending */}
                    <button
                      type="button"
                      aria-label="Remove"
                      disabled={pending}
                      onClick={() => removeItem(item.variantId)}
                      className={`self-start text-muted-foreground hover:text-crimson ${pending ? "cursor-not-allowed opacity-30" : ""}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{t("cart.subtotal")}</span>
              <span className="font-display text-xl font-bold text-crimson">
                {formatPrice(subtotal, currency)}
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={isLoading || isSyncing || items.some((i) => i.isPending)}
              size="lg"
              className="w-full bg-crimson text-crimson-foreground hover:bg-rich-red"
            >
              {isLoading || isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="me-2 h-4 w-4" /> {t("cart.checkout")}
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {t("cart.continue")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
