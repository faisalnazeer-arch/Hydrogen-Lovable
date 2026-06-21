import { useEffect, useState, useRef } from "react";
import { useLocalePath } from "@/stores/localeStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2, Loader2, ShoppingBag,
  RefreshCw, Ticket, FileText, CheckCircle, XCircle, X,
  Truck,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { useCartStore, initGiftIds, warmGiftCache } from "@/stores/cartStore";
import { formatPrice, shopifyImageUrl } from "@/lib/shopify";
import { useT } from "@/i18n/strings";
import { useCartDrawerConfig } from "@/lib/cartDrawerConfig";
import { QuantitySelector } from "@/components/shared/QuantitySelector";

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

type Panel = "discount" | "delivery" | "note";

export function CartDrawer() {
  const lp = useLocalePath();
  const {
    items,
    isOpen,
    setOpen,

    isApplyingCode,
    removingLineIds,
    updateQuantity,
    removeItem,
    getCheckoutUrl,
    syncCart,
    discountCodes,

    appliedGiftCards,
    subtotalAmount,
    totalAmount,
    applyDiscountCode,
    removeDiscountCode,
    applyGiftCard,
    removeGiftCard,
    orderNote,
    updateOrderNote,
  } = useCartStore(
    useShallow((s) => ({
      items: s.items,
      isOpen: s.isOpen,
      setOpen: s.setOpen,

      isApplyingCode: s.isApplyingCode,
      removingLineIds: s.removingLineIds,
      updateQuantity: s.updateQuantity,
      removeItem: s.removeItem,
      getCheckoutUrl: s.getCheckoutUrl,
      syncCart: s.syncCart,
      discountCodes: s.discountCodes,

      appliedGiftCards: s.appliedGiftCards,
      subtotalAmount: s.subtotalAmount,
      totalAmount: s.totalAmount,
      applyDiscountCode: s.applyDiscountCode,
      removeDiscountCode: s.removeDiscountCode,
      applyGiftCard: s.applyGiftCard,
      removeGiftCard: s.removeGiftCard,
      orderNote: s.orderNote,
      updateOrderNote: s.updateOrderNote,
    }))
  );

  const t = useT();
  const drawerConfig = useCartDrawerConfig();
  const location = useLocation();
  const navigate = useNavigate();

  // Open drawer when redirected from /cart via ?cart=open param, then strip it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("cart") === "open") {
      setOpen(true);
      params.delete("cart");
      const qs = params.toString();
      navigate(location.pathname + (qs ? `?${qs}` : ""), { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const [activePanel, setActivePanel] = useState<Panel>("discount");
  const [noteOpen, setNoteOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [giftCardInput, setGiftCardInput] = useState("");
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState(orderNote);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Defer syncCart so the drawer opens and renders immediately with cached data,
  // then silently refreshes discount codes / gift cards in the background.
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => syncCart(), 800);
    return () => clearTimeout(t);
  }, [isOpen, syncCart]);
  useEffect(() => { setNoteValue(orderNote); }, [orderNote]);

  const subGiftId     = drawerConfig.freeGiftSubVariantId;
  const carcassGiftId = drawerConfig.freeGiftCarVariantId;

  // Keep the store's gift IDs in sync and pre-warm the variant image cache
  useEffect(() => {
    initGiftIds(subGiftId, carcassGiftId);
    warmGiftCache(subGiftId, carcassGiftId);
  }, [subGiftId, carcassGiftId]);

  const totalItems = items.reduce((n, i) => n + i.quantity, 0);
  const localSubtotal = items.reduce((n, i) => n + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "AED";
  const shopifyCurrency = totalAmount?.currencyCode ?? subtotalAmount?.currencyCode ?? currency;

  // totalAmount = Shopify's authoritative total (updated after every mutation response).
  const shopifyTotal = totalAmount ? parseFloat(totalAmount.amount) : localSubtotal;
  const displayCurrency = shopifyCurrency;

  // compareAtSubtotal = what the cart would cost at full (compareAt / regular) prices.
  // savings = compareAt total minus the actual subscription/discounted prices we store.
  // Only items that have a real compareAt discount count toward the percentage,
  // so the % reflects the subscription discount rate (e.g. 10%), not the whole cart.
  const compareAtSubtotal = items.reduce((n, i) => {
    const cap = i.compareAtPrice ? parseFloat(i.compareAtPrice.amount) : parseFloat(i.price.amount);
    return n + cap * i.quantity;
  }, 0);
  const savings = Math.max(0, compareAtSubtotal - localSubtotal);
  // Sum compareAt only for items that actually have a discount — keeps % accurate (e.g. 10%)
  const discountedCompareAt = items.reduce((n, i) => {
    if (!i.compareAtPrice || i.compareAtPrice.amount === i.price.amount) return n;
    return n + parseFloat(i.compareAtPrice.amount) * i.quantity;
  }, 0);
  const savingsPct = discountedCompareAt > 0 && savings > 0
    ? Math.round((savings / discountedCompareAt) * 100)
    : 0;

  // When savings exist: Subtotal = full (compareAt) price, Total = what you actually pay.
  // Math: compareAtSubtotal − savings = localSubtotal = Total ✓
  const displaySubtotal = savings > 0 ? compareAtSubtotal : localSubtotal;
  const displayTotal = savings > 0 ? localSubtotal : shopifyTotal;


  const threshold = drawerConfig.freeShippingThreshold;
  const remaining = Math.max(0, threshold - shopifyTotal);
  const progress = Math.min(100, (shopifyTotal / threshold) * 100);

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) { setOpen(false); window.location.href = url; }
  };

  const handleApplyDiscount = async () => {
    setDiscountError(null);
    const result = await applyDiscountCode(discountInput);
    if (result.success) setDiscountInput("");
    else setDiscountError(result.error ?? "Could not apply code");
  };

  const handleApplyGiftCard = async () => {
    setGiftCardError(null);
    const result = await applyGiftCard(giftCardInput);
    if (result.success) setGiftCardInput("");
    else setGiftCardError(result.error ?? "Could not apply gift card");
  };

  const handleNoteSave = () => {
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    updateOrderNote(noteValue);
    setNoteOpen(false);
  };

  const handleNoteCancel = () => { setNoteValue(orderNote); setNoteOpen(false); };

  const togglePanel = (p: Panel) => {
    if (p === "note") { setNoteOpen(true); return; }
    if (p === "delivery") { setDeliveryOpen(true); return; }
    setActivePanel((cur) => (cur === p ? "discount" : p));
  };

  const tabs: { id: Panel; icon: React.ReactNode; label: string; badge?: number }[] = [
    {
      id: "discount",
      icon: <Ticket className="h-5 w-5" />,
      label: "Discount code",
      badge: discountCodes.filter((d) => d.applicable).length || undefined,
    },
    { id: "delivery", icon: <Truck className="h-5 w-5" />, label: "Delivery info" },
    {
      id: "note",
      icon: <FileText className="h-5 w-5" />,
      label: "Order note",
      badge: orderNote ? 1 : undefined,
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        {/* inner wrapper — relative + overflow-hidden so panels are clipped correctly */}
        <div className="relative flex flex-1 flex-col overflow-hidden">

          {/* ── Floating delivery tab ─────────────────────────────── */}
          <div className="absolute left-0 top-1/2 z-30 -translate-y-1/2">
            <span className="pointer-events-none absolute inset-0 animate-ping rounded-r-lg bg-crimson opacity-40" />
            <button
              type="button"
              onClick={() => setDeliveryOpen(true)}
              className="group relative flex flex-col items-center gap-1 rounded-r-lg bg-crimson px-1.5 py-3 text-white shadow-md transition-all duration-200 hover:px-2 active:scale-95"
            >
              <Truck className="h-3.5 w-3.5" />
              <span className="rotate-180 [writing-mode:vertical-rl] text-[8px] font-bold uppercase tracking-widest">
                Delivery
              </span>
            </button>
          </div>

          {/* ── Delivery info slide panel ──────────────────────────── */}
          <div
            className={`absolute inset-0 z-40 flex flex-col bg-background transition-transform duration-300 ease-out ${
              deliveryOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* panel header */}
            <div className="flex items-center gap-3 border-b border-border bg-crimson/5 px-4 py-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crimson text-white shadow-md">
                <Truck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-sm font-bold">Delivery &amp; Offers</h2>
                <p className="text-[11px] text-muted-foreground">What&apos;s available for your order</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDeliveryOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* panel body */}
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {drawerConfig.deliveryItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-crimson/20 bg-crimson/[0.04] px-3.5 py-3"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-crimson" />
                  <p className="text-[13px] leading-relaxed text-foreground">{parseBold(item)}</p>
                </div>
              ))}
            </div>

            {/* panel footer */}
            <div className="border-t border-border px-3 py-3">
              <Button variant="primary" size="lg" onClick={() => setDeliveryOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>

          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="font-display text-lg">{t("cart.title")}</SheetTitle>
            <SheetDescription className="sr-only">Your shopping cart items and checkout</SheetDescription>
          </SheetHeader>

          {/* Free shipping progress */}
          {items.length > 0 && (
            <div className="border-b border-border bg-bone px-6 py-3">
              {remaining > 0 ? (
                <p className="text-xs text-foreground">
                  {t("cart.add_prefix")}{" "}
                  <span className="font-bold text-crimson">{formatPrice(remaining, displayCurrency)}</span>{" "}
                  {t("cart.add_suffix")}
                </p>
              ) : (
                <p className="text-xs font-semibold text-emerald-700">{t("cart.free_unlocked")}</p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-crimson transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">{t("cart.empty")}</p>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  {t("cart.continue")}
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const img = item.product.node.images.edges[0]?.node;
                  const pending = !!item.isPending;
                  const isGift = !!(subGiftId && item.variantId === subGiftId) ||
                                 !!(carcassGiftId && item.variantId === carcassGiftId);
                  return (
                    <li
                      key={`${item.variantId}-${item.sellingPlanId ?? "none"}`}
                      className={`flex gap-3 p-4 transition-opacity ${pending ? "opacity-50" : ""}`}
                    >
                      <Link
                        to={lp(`/products/${item.product.node.handle}`)}
                        onClick={() => setOpen(false)}
                        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted"
                      >
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
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          to={lp(`/products/${item.product.node.handle}`)}
                          onClick={() => setOpen(false)}
                          className="text-sm font-medium leading-tight hover:text-crimson transition-colors"
                        >
                          {item.product.node.title}
                        </Link>
                        {(() => {
                          const label =
                            item.selectedOptions.map((o) => o.value).filter((v) => v !== "Default Title").join(" · ") ||
                            (item.variantTitle !== "Default Title" ? item.variantTitle : "");
                          return label ? <div className="text-xs text-muted-foreground">{label}</div> : null;
                        })()}
                        {item.attributes && item.attributes.filter((a) => !a.key.startsWith("_")).length > 0 && (
                          <div className="flex flex-col gap-0.5">
                            {item.attributes
                              .filter((a) => !a.key.startsWith("_"))
                              .map((attr) => (
                                <div key={attr.key} className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{attr.key}:</span>{" "}
                                  {attr.value}
                                </div>
                              ))}
                          </div>
                        )}

                        {item.sellingPlanId && (
                          <div className="flex items-center gap-1 text-xs text-green-700">
                            <RefreshCw className="h-3 w-3 flex-shrink-0" />
                            <span>{item.sellingPlanName ?? "Subscribe & Save"}</span>
                          </div>
                        )}

                          <div className="mt-auto flex items-center justify-between pt-1">
                          {isGift ? (
                            /* Free gift — no qty selector or remove button */
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              🎁 Free Gift
                            </span>
                          ) : (
                            /* Normal item controls */
                            <div className="flex items-center gap-2">
                              <QuantitySelector
                                size="sm"
                                value={item.quantity}
                                onChange={(qty) => item.lineId && updateQuantity(item.lineId, qty)}
                                min={0}
                                className={pending ? "pointer-events-none opacity-50" : ""}
                              />
                              <button
                                type="button"
                                aria-label="Remove"
                                disabled={pending || !item.lineId}
                                onClick={() => item.lineId && removeItem(item.lineId)}
                                className={`rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-crimson ${pending ? "cursor-not-allowed opacity-30" : ""}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          <div className="flex flex-col items-end gap-0">
                            {!isGift && item.compareAtPrice && item.compareAtPrice.amount !== item.price.amount && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(
                                  parseFloat(item.compareAtPrice.amount) * item.quantity,
                                  item.compareAtPrice.currencyCode,
                                )}
                              </span>
                            )}
                            <span className={`font-bold ${isGift ? "text-emerald-600 text-xs" : "text-crimson"}`}>
                              {isGift ? "FREE" : formatPrice(
                                parseFloat(item.price.amount) * item.quantity,
                                item.price.currencyCode,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer — tabs + totals */}
          {items.length > 0 && (
            <div className="relative space-y-1 border-t border-border px-2 pb-1.5 pt-1.5">
              {/* Tab row */}
              <div className="grid grid-cols-3 gap-1.5">
                {tabs.map((tab) => {
                  const active = tab.id !== "note" && activePanel === tab.id;
                  const noteActive = tab.id === "note" && orderNote;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => togglePanel(tab.id)}
                      className={`relative flex flex-col items-center gap-0.5 rounded-md border py-1.5 text-[10px] font-medium transition-colors
                        ${active || noteActive
                          ? "border-crimson bg-crimson/5 text-crimson"
                          : "border-border bg-card text-muted-foreground hover:border-crimson/40 hover:text-foreground"
                        }`}
                    >
                      <span className="[&>svg]:h-4 [&>svg]:w-4">{tab.icon}</span>
                      <span className="text-center leading-tight">{tab.label}</span>
                      {tab.badge !== undefined && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-crimson text-[8px] font-bold text-white">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Discount panel */}
              {activePanel === "discount" && (
                <div className="rounded-md border border-border bg-card px-2 py-1.5">
                  <div className="flex gap-1.5">
                    <Input
                      value={discountInput}
                      onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                      placeholder="Enter discount code"
                      className="h-8 text-xs"
                      disabled={isApplyingCode}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleApplyDiscount}
                      disabled={isApplyingCode || !discountInput.trim()}
                      className="h-8 shrink-0 px-3 text-xs"
                    >
                      {isApplyingCode ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {discountError && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                      <XCircle className="h-3 w-3 shrink-0" /> {discountError}
                    </p>
                  )}
                  {/* Discount codes */}
                  {discountCodes.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {discountCodes.map((dc) => (
                        <li key={dc.code} className="flex items-center justify-between rounded bg-muted/50 px-2 py-0.5 text-[10px]">
                          <span className="flex items-center gap-1">
                            {dc.applicable
                              ? <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600" />
                              : <XCircle className="h-3 w-3 shrink-0 text-destructive" />}
                            <span className={dc.applicable ? "font-semibold" : "text-muted-foreground line-through"}>{dc.code}</span>
                            {!dc.applicable && <span className="text-destructive">invalid</span>}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeDiscountCode(dc.code)}
                            disabled={isApplyingCode}
                            className="ml-1 text-muted-foreground hover:text-crimson disabled:opacity-40"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Totals + checkout */}
              <div className="border-t border-border pt-1.5">
                {/* Subtotal + savings rows — only when a discount is active */}
                {savings > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm text-foreground mb-0.5">
                      <span className="font-medium">{t("cart.subtotal")}</span>
                      <span className="font-semibold">{formatPrice(displaySubtotal, displayCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-emerald-600 mb-0.5">
                      <span className="font-medium flex items-center gap-1">
                        You save
                        {savingsPct > 0 && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                            {savingsPct}%
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">-{formatPrice(savings, displayCurrency)}</span>
                    </div>
                  </>
                )}
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-base font-bold">
                    {savings > 0 ? "Total" : t("cart.subtotal")}
                  </span>
                  <span className="font-display text-xl font-bold text-crimson">
                    {formatPrice(displayTotal, displayCurrency)}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={items.some((i) => i.isPending) || removingLineIds.length > 0}
                  className="w-full"
                >
                  {t("cart.checkout")}
                </Button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-1.5 w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("cart.continue")}
                </button>
              </div>

              {/* Order note bottom overlay */}
              <div
                className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl bg-background shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
                  noteOpen ? "translate-y-0" : "translate-y-full"
                }`}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-sm font-semibold">Order note</span>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={handleNoteCancel}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-4 py-3">
                  <Textarea
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="Add a note for your order…"
                    rows={5}
                    className="resize-none text-sm"
                  />
                </div>
                <div className="px-4 pb-4">
                  <Button variant="primary" size="lg" onClick={handleNoteSave} className="w-full">
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
