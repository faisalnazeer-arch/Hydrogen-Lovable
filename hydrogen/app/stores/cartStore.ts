import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  storefrontApiRequest,
  type MoneyV2,
  type ShopifyProduct,
} from "@/lib/shopify";

export interface CartItem {
  lineId: string | null;
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
  sellingPlanId?: string | null;
  sellingPlanName?: string | null;
  attributes?: Array<{ key: string; value: string }>;
  isPending?: boolean;
}

export interface DiscountCodeInfo {
  code: string;
  applicable: boolean;
}

export interface AutomaticDiscount {
  title: string;
  discountedAmount: MoneyV2;
}

export interface AppliedGiftCard {
  id: string;
  lastCharacters: string;
  amountUsed: MoneyV2;
  balance: MoneyV2;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  isApplyingCode: boolean;
  isOpen: boolean;
  discountCodes: DiscountCodeInfo[];
  automaticDiscounts: AutomaticDiscount[];
  giftCardCodes: string[];
  appliedGiftCards: AppliedGiftCard[];
  subtotalAmount: MoneyV2 | null;
  totalAmount: MoneyV2 | null;
  orderNote: string;
  addItemError: string | null;
  setOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "lineId" | "isPending">) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
  applyDiscountCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeDiscountCode: (code: string) => Promise<void>;
  applyGiftCard: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeGiftCard: (id: string) => Promise<void>;
  updateOrderNote: (note: string) => Promise<void>;
}

const COST_FIELDS = `cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }`;
const LINES_FIELDS = `lines(first: 100) {
  edges {
    node {
      id
      merchandise { ... on ProductVariant { id } }
      discountAllocations {
        __typename
        discountedAmount { amount currencyCode }
        ... on CartAutomaticDiscountAllocation { title }
        ... on CartCustomDiscountAllocation { title }
      }
    }
  }
}`;

// Minimal lines — only needed to resolve the new lineId after create/add
const MINIMAL_LINES_FIELDS = `lines(first: 100) {
  edges { node { id merchandise { ... on ProductVariant { id } } } }
}`;

const CART_QUERY = `query cart($id: ID!) {
  cart(id: $id) {
    id
    note
    totalQuantity
    discountCodes { code applicable }
    appliedGiftCards {
      id
      lastCharacters
      amountUsed { amount currencyCode }
      balance { amount currencyCode }
    }
    ${COST_FIELDS}
    ${LINES_FIELDS}
  }
}`;

// Used only to bootstrap an empty cart; lines are added separately via cartLinesAdd
const CART_CREATE_EMPTY_MUTATION = `
  mutation cartCreate {
    cartCreate(input: {}) {
      cart {
        id
        checkoutUrl
        ${COST_FIELDS}
      }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { id ${COST_FIELDS} ${MINIMAL_LINES_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id ${COST_FIELDS} } userErrors { field message } }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { id ${COST_FIELDS} } userErrors { field message } }
  }
`;

const CART_DISCOUNT_CODES_UPDATE = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        discountCodes { code applicable }
        ${COST_FIELDS}
      }
      userErrors { field message }
    }
  }
`;

const CART_NOTE_UPDATE = `
  mutation cartNoteUpdate($cartId: ID!, $note: String!) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart { id note }
      userErrors { field message }
    }
  }
`;

const VARIANT_LOOKUP = `
  query variantLookup($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        title
        image { url altText }
        product {
          id title handle
          images(first: 1) { edges { node { url altText } } }
        }
      }
    }
  }
`;

const CART_GIFT_CARD_CODES_UPDATE = `
  mutation cartGiftCardCodesUpdate($cartId: ID!, $giftCardCodes: [String!]!) {
    cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart {
        id
        appliedGiftCards {
          id
          lastCharacters
          amountUsed { amount currencyCode }
          balance { amount currencyCode }
        }
        ${COST_FIELDS}
      }
      userErrors { field message }
    }
  }
`;

function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("channel", "online_store");
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

function extractAutomaticDiscounts(lines: any[]): AutomaticDiscount[] {
  const map = new Map<string, { amount: number; currencyCode: string }>();
  for (const edge of lines) {
    for (const alloc of edge.node?.discountAllocations ?? []) {
      const isAuto =
        alloc.__typename === "CartAutomaticDiscountAllocation" ||
        alloc.__typename === "CartCustomDiscountAllocation" ||
        // fallback: has title but no code (older API versions without __typename)
        (alloc.title && !alloc.code);
      if (!isAuto || !alloc.title) continue;
      const prev = map.get(alloc.title) ?? { amount: 0, currencyCode: alloc.discountedAmount?.currencyCode ?? "AED" };
      map.set(alloc.title, {
        amount: prev.amount + parseFloat(alloc.discountedAmount?.amount ?? "0"),
        currencyCode: prev.currencyCode,
      });
    }
  }
  return Array.from(map.entries()).map(([title, { amount, currencyCode }]) => ({
    title,
    discountedAmount: { amount: amount.toFixed(2), currencyCode },
  }));
}

function isCartNotFoundError(
  userErrors: Array<{ field: string[] | null; message: string }>
): boolean {
  return userErrors.some(
    (e) =>
      e.message.toLowerCase().includes("cart not found") ||
      e.message.toLowerCase().includes("does not exist")
  );
}

// Tracks the last error from createShopifyCart so addItem can surface it
let _lastAddError: string | null = null;

async function createShopifyCart(item: CartItem) {
  _lastAddError = null;

  // Step 1: Create an empty cart (avoids issues with sellingPlanId inside cartCreate)
  let data: any;
  try {
    data = await storefrontApiRequest<any>(CART_CREATE_EMPTY_MUTATION, {});
  } catch (err: any) {
    _lastAddError = err?.message ?? "Network error — could not reach Shopify";
    console.warn("[cart] cartCreate request failed:", err);
    return null;
  }
  if (!data) {
    _lastAddError = "Shopify returned no response (possibly payment issue)";
    console.warn("[cart] cartCreate: no data returned (possibly 402)");
    return null;
  }
  const createErrors: Array<{ message: string }> = data?.data?.cartCreate?.userErrors ?? [];
  if (createErrors.length > 0) {
    _lastAddError = createErrors[0]?.message ?? "Could not create cart";
    console.warn("[cart] cartCreate userErrors:", JSON.stringify(createErrors));
    return null;
  }
  const cart = data?.data?.cartCreate?.cart;
  if (!cart?.id) {
    _lastAddError = "Shopify did not return a cart — please try again";
    console.warn("[cart] cartCreate: cart or cart.id is null in response");
    return null;
  }

  // Step 2: Add the line (with sellingPlanId if present) to the newly created cart
  const addResult = await addLineToShopifyCart(cart.id, { ...item, lineId: null });
  if (!addResult.success) {
    _lastAddError = (addResult as any).message ?? "Could not add item to cart";
    console.warn("[cart] cartLinesAdd failed after cartCreate. message:", _lastAddError);
    return null;
  }
  if (!addResult.lineId) {
    _lastAddError = "Item added but line ID not returned — please refresh";
    console.warn("[cart] cartLinesAdd: success=true but no lineId");
    return null;
  }

  return {
    cartId: cart.id as string,
    checkoutUrl: cart.checkoutUrl ? formatCheckoutUrl(cart.checkoutUrl) : `https://mls-uae.myshopify.com/cart`,
    lineId: addResult.lineId,
    subtotalAmount: addResult.subtotalAmount ?? null,
    totalAmount: addResult.totalAmount ?? null,
  };
}

async function addLineToShopifyCart(cartId: string, item: CartItem) {
  const line: Record<string, any> = { quantity: item.quantity, merchandiseId: item.variantId };
  if (item.sellingPlanId) line.sellingPlanId = item.sellingPlanId;
  if (item.attributes?.length) line.attributes = item.attributes;
  const data = await storefrontApiRequest<any>(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [line],
  });
  const userErrors: Array<{ field: string[] | null; message: string }> = data?.data?.cartLinesAdd?.userErrors || [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true as const };
  if (userErrors.length > 0) {
    console.warn("[cart] cartLinesAdd userErrors:", JSON.stringify(userErrors));
    return { success: false as const, message: userErrors[0]?.message ?? "Could not add to cart" };
  }
  const cartData = data?.data?.cartLinesAdd?.cart;
  const lines: any[] = cartData?.lines?.edges || [];
  const newLine = lines.find((l: any) => l.node.merchandise.id === item.variantId);
  return {
    success: true as const,
    lineId: newLine?.node?.id as string | undefined,
    subtotalAmount: cartData?.cost?.subtotalAmount ?? null,
    totalAmount: cartData?.cost?.totalAmount ?? null,
  };
}

async function updateShopifyCartLine(cartId: string, lineId: string, quantity: number) {
  const data = await storefrontApiRequest<any>(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  const userErrors = data?.data?.cartLinesUpdate?.userErrors || [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true as const };
  if (userErrors.length > 0) return { success: false as const };
  const cartData = data?.data?.cartLinesUpdate?.cart;
  return {
    success: true as const,
    subtotalAmount: cartData?.cost?.subtotalAmount ?? null,
    totalAmount: cartData?.cost?.totalAmount ?? null,
  };
}

async function removeLineFromShopifyCart(cartId: string, lineId: string) {
  const data = await storefrontApiRequest<any>(CART_LINES_REMOVE_MUTATION, {
    cartId,
    lineIds: [lineId],
  });
  const userErrors = data?.data?.cartLinesRemove?.userErrors || [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true as const };
  if (userErrors.length > 0) return { success: false as const };
  const cartData = data?.data?.cartLinesRemove?.cart;
  return {
    success: true as const,
    subtotalAmount: cartData?.cost?.subtotalAmount ?? null,
    totalAmount: cartData?.cost?.totalAmount ?? null,
  };
}

async function fetchGiftVariantData(variantId: string): Promise<Partial<CartItem>> {
  try {
    const data = await storefrontApiRequest<any>(VARIANT_LOOKUP, { id: variantId });
    const v = data?.data?.node;
    if (!v) return {};
    const imgUrl = v.image?.url ?? v.product?.images?.edges?.[0]?.node?.url ?? null;
    const imgAlt = v.image?.altText ?? null;
    return {
      variantTitle: v.title ?? "Free Gift",
      product: {
        node: {
          id: v.product?.id ?? "",
          title: v.product?.title ?? "Free Gift",
          handle: v.product?.handle ?? "",
          description: "",
          descriptionHtml: "",
          tags: [],
          vendor: "",
          productType: "",
          availableForSale: true,
          priceRange: {
            minVariantPrice: { amount: "0", currencyCode: "AED" },
            maxVariantPrice: { amount: "0", currencyCode: "AED" },
          },
          images: imgUrl
            ? { edges: [{ node: { url: imgUrl, altText: imgAlt } }] }
            : { edges: [] },
          variants: { edges: [] },
          options: [],
        },
      } as ShopifyProduct,
    };
  } catch {
    return {};
  }
}

const EMPTY: Pick<CartStore,
  "discountCodes" | "automaticDiscounts" | "giftCardCodes" | "appliedGiftCards" | "subtotalAmount" | "totalAmount" | "orderNote"
> = {
  discountCodes: [],
  automaticDiscounts: [],
  giftCardCodes: [],
  appliedGiftCards: [],
  subtotalAmount: null,
  totalAmount: null,
  orderNote: "",
};

// ── Free gift helpers ──────────────────────────────────────────────────────

// Set by CartDrawer on mount from the mls_cart_drawer_config metaobject.
const _giftIds = { sub: "", car: "" };
export function initGiftIds(sub: string, car: string) {
  _giftIds.sub = sub;
  _giftIds.car = car;
}

function makeGiftItem(variantId: string): CartItem {
  return {
    lineId: null,
    product: {
      node: {
        id: "", title: "Free Gift", handle: "", description: "",
        descriptionHtml: "", tags: [], vendor: "", productType: "",
        availableForSale: true,
        priceRange: {
          minVariantPrice: { amount: "0", currencyCode: "AED" },
          maxVariantPrice: { amount: "0", currencyCode: "AED" },
        },
        images: { edges: [] },
        variants: { edges: [] },
        options: [],
      },
    } as ShopifyProduct,
    variantId,
    variantTitle: "Free Gift",
    price: { amount: "0.00", currencyCode: "AED" },
    quantity: 1,
    selectedOptions: [],
    isPending: false,
  };
}

let _giftSyncing = false;

async function syncFreeGifts(
  get: () => CartStore,
  set: (p: Partial<CartStore> | ((s: CartStore) => Partial<CartStore>)) => void,
) {
  if (_giftSyncing) return;
  _giftSyncing = true;
  try {
    const subId = _giftIds.sub;
    const carId = _giftIds.car;
    if (!subId && !carId) return;

    const { items, cartId } = get();
    if (!cartId) return;

    // Only user items (exclude the gifts themselves) drive the logic
    const userItems = items.filter((i) => i.variantId !== subId && i.variantId !== carId);

    const wantSub = !!subId && userItems.some((i) => !!i.sellingPlanId);
    const wantCar = !!carId && userItems.some(
      (i) => i.product.node.title.toLowerCase().includes("carcass"),
    );

    const hasSub = items.find((i) => i.variantId === subId);
    const hasCar = items.find((i) => i.variantId === carId);

    // ── Subscription gift ──────────────────────────────────────────────────
    if (subId) {
      if (wantSub && !hasSub) {
        const gift = makeGiftItem(subId);
        set((s) => ({ items: [...s.items, { ...gift, isPending: true }] }));
        const [res, variantData] = await Promise.all([
          addLineToShopifyCart(cartId, gift),
          fetchGiftVariantData(subId),
        ]);
        set((s) => ({
          items: res.success
            ? s.items.map((i) => i.variantId === subId && i.isPending
                ? { ...i, ...variantData, lineId: res.lineId ?? null, isPending: false } : i)
            : s.items.filter((i) => !(i.variantId === subId && i.isPending)),
        }));
      } else if (!wantSub && hasSub?.lineId) {
        set((s) => ({ items: s.items.filter((i) => i.variantId !== subId) }));
        await removeLineFromShopifyCart(cartId, hasSub.lineId);
      }
    }

    // ── Carcass gift ───────────────────────────────────────────────────────
    if (carId) {
      if (wantCar && !hasCar) {
        const gift = makeGiftItem(carId);
        set((s) => ({ items: [...s.items, { ...gift, isPending: true }] }));
        const [res, variantData] = await Promise.all([
          addLineToShopifyCart(cartId, gift),
          fetchGiftVariantData(carId),
        ]);
        set((s) => ({
          items: res.success
            ? s.items.map((i) => i.variantId === carId && i.isPending
                ? { ...i, ...variantData, lineId: res.lineId ?? null, isPending: false } : i)
            : s.items.filter((i) => !(i.variantId === carId && i.isPending)),
        }));
      } else if (!wantCar && hasCar?.lineId) {
        set((s) => ({ items: s.items.filter((i) => i.variantId !== carId) }));
        await removeLineFromShopifyCart(cartId, hasCar.lineId);
      }
    }
  } finally {
    _giftSyncing = false;
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isSyncing: false,
      isApplyingCode: false,
      isOpen: false,
      addItemError: null,
      ...EMPTY,

      setOpen: (open) => set({ isOpen: open }),

      addItem: async (item) => {
        // Silently block manual addition of zero-price (free-gift) products
        if (parseFloat(item.price.amount) === 0) return;
        const { items, cartId, clearCart } = get();
        const existing = items.find(
          (i) => i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
        );

        try {
          if (!cartId) {
            // Don't open the cart drawer yet — only open after cart creation succeeds
            set({
              items: [{ ...item, lineId: null, isPending: true }, ...get().items],
              isLoading: true,
            });
            const result = await createShopifyCart({ ...item, lineId: null });
            if (result) {
              set({
                cartId: result.cartId,
                checkoutUrl: result.checkoutUrl,
                subtotalAmount: result.subtotalAmount,
                totalAmount: result.totalAmount,
                isOpen: true,
                addItemError: null,
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.isPending
                    ? { ...i, lineId: result.lineId, isPending: false }
                    : i
                ),
              });
            } else {
              // Cart creation failed — remove pending item, surface the error
              const remaining = get().items.filter((i) => !(i.variantId === item.variantId && i.isPending));
              const errorMsg = _lastAddError ?? "Could not add to cart. Please try again.";
              console.warn("[cart] Cart creation failed for variant", item.variantId, "—", errorMsg);
              set({ items: remaining, isOpen: false, addItemError: errorMsg });
            }
          } else if (existing) {
            const newQty = existing.quantity + item.quantity;
            if (!existing.lineId) return;
            set({
              items: get().items.map((i) =>
                i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
                  ? { ...i, quantity: newQty, isPending: true }
                  : i
              ),
              isOpen: true,
              isLoading: true,
            });
            const result = await updateShopifyCartLine(cartId, existing.lineId, newQty);
            if (result.success) {
              set({
                subtotalAmount: result.subtotalAmount ?? get().subtotalAmount,
                totalAmount: result.totalAmount ?? get().totalAmount,
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
                    ? { ...i, isPending: false }
                    : i
                ),
              });
            } else if (result.cartNotFound) {
              clearCart();
            } else {
              set({
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
                    ? { ...i, quantity: existing.quantity, isPending: false }
                    : i
                ),
              });
            }
          } else {
            set({
              items: [{ ...item, lineId: null, isPending: true }, ...get().items],
              isOpen: true,
              isLoading: true,
            });
            const result = await addLineToShopifyCart(cartId, { ...item, lineId: null });
            if (result.success) {
              set({
                subtotalAmount: result.subtotalAmount ?? get().subtotalAmount,
                totalAmount: result.totalAmount ?? get().totalAmount,
                addItemError: null,
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.isPending
                    ? { ...i, lineId: result.lineId ?? null, isPending: false }
                    : i
                ),
              });
            } else if (result.cartNotFound) {
              clearCart();
            } else {
              const msg = (result as any).message ?? "Could not add to cart";
              set({
                items: get().items.filter((i) => !(i.variantId === item.variantId && i.isPending)),
                addItemError: msg,
              });
            }
          }
        } catch (err) {
          console.warn("[cart] addItem threw:", err);
          const remaining = get().items.filter((i) => !i.isPending);
          set({ items: remaining, isOpen: remaining.length > 0 });
        } finally {
          set({ isLoading: false });
          void syncFreeGifts(get, set);
        }
      },

      updateQuantity: async (lineId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(lineId);
          return;
        }
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.lineId === lineId);
        if (!item || !lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const result = await updateShopifyCartLine(cartId, lineId, quantity);
          if (result.success) {
            set({
              subtotalAmount: result.subtotalAmount ?? get().subtotalAmount,
              totalAmount: result.totalAmount ?? get().totalAmount,
              items: get().items.map((i) => i.lineId === lineId ? { ...i, quantity } : i),
            });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
          void syncFreeGifts(get, set);
        }
      },

      removeItem: async (lineId) => {
        const { cartId, clearCart } = get();
        if (!lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const result = await removeLineFromShopifyCart(cartId, lineId);
          if (result.success) {
            const next = get().items.filter((i) => i.lineId !== lineId);
            if (next.length === 0) clearCart();
            else set({
              items: next,
              subtotalAmount: result.subtotalAmount ?? get().subtotalAmount,
              totalAmount: result.totalAmount ?? get().totalAmount,
            });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
          void syncFreeGifts(get, set);
        }
      },

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null, ...EMPTY }),

      getCheckoutUrl: () => get().checkoutUrl,

      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;
        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest<any>(CART_QUERY, { id: cartId });
          if (!data) return;
          const cart = data?.data?.cart;
          if (!cart || cart.totalQuantity === 0) {
            clearCart();
          } else {
            set({
              discountCodes: cart.discountCodes ?? [],
              appliedGiftCards: cart.appliedGiftCards ?? [],
              subtotalAmount: cart.cost?.subtotalAmount ?? null,
              totalAmount: cart.cost?.totalAmount ?? null,
              automaticDiscounts: extractAutomaticDiscounts(cart.lines?.edges ?? []),
              orderNote: cart.note ?? "",
            });
          }
        } catch (err) {
          console.error("sync cart failed", err);
        } finally {
          set({ isSyncing: false });
        }
      },

      applyDiscountCode: async (code) => {
        const { cartId, discountCodes } = get();
        if (!cartId) return { success: false, error: "Add an item to your cart first" };
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) return { success: false, error: "Enter a discount code" };
        if (discountCodes.some((d) => d.code.toUpperCase() === trimmed)) {
          return { success: false, error: "Code already applied" };
        }
        set({ isApplyingCode: true });
        try {
          const currentCodes = discountCodes.map((d) => d.code);
          const data = await storefrontApiRequest<any>(CART_DISCOUNT_CODES_UPDATE, {
            cartId,
            discountCodes: [...currentCodes, trimmed],
          });
          const userErrors = data?.data?.cartDiscountCodesUpdate?.userErrors ?? [];
          if (userErrors.length > 0) return { success: false, error: userErrors[0].message };
          const cart = data?.data?.cartDiscountCodesUpdate?.cart;
          if (!cart) return { success: false, error: "Could not verify discount code. Please try again." };
          const newCodes: DiscountCodeInfo[] = cart.discountCodes ?? [];
          const applied = newCodes.find((c) => c.code.toUpperCase() === trimmed);
          if (!applied?.applicable) {
            // Revert Shopify cart back to previous codes so invalid code doesn't linger
            void storefrontApiRequest<any>(CART_DISCOUNT_CODES_UPDATE, {
              cartId,
              discountCodes: currentCodes,
            });
            // Ask the server for the real reason (Admin API)
            let reason = "This discount code cannot be applied to your cart.";
            try {
              const items = get().items;
              const cartTotal = items.reduce((n, i) => n + parseFloat(i.price.amount) * i.quantity, 0);
              const currency = items[0]?.price.currencyCode ?? "AED";
              const res = await fetch(
                `/api/discount-check?code=${encodeURIComponent(trimmed)}&cartTotal=${cartTotal}&currency=${currency}`
              );
              if (res.ok) {
                const json = await res.json() as { reason: string | null };
                if (json.reason) reason = json.reason;
              }
            } catch { /* fallback to generic message */ }
            return { success: false, error: reason };
          }
          set({
            discountCodes: newCodes,
            subtotalAmount: cart.cost?.subtotalAmount ?? get().subtotalAmount,
            totalAmount: cart.cost?.totalAmount ?? get().totalAmount,
          });
          return { success: true };
        } finally {
          set({ isApplyingCode: false });
        }
      },

      removeDiscountCode: async (code) => {
        const { cartId, discountCodes } = get();
        if (!cartId) return;
        set({ isApplyingCode: true });
        try {
          const remaining = discountCodes.filter((d) => d.code !== code).map((d) => d.code);
          const data = await storefrontApiRequest<any>(CART_DISCOUNT_CODES_UPDATE, {
            cartId,
            discountCodes: remaining,
          });
          const cart = data?.data?.cartDiscountCodesUpdate?.cart;
          set({
            discountCodes: cart?.discountCodes ?? [],
            subtotalAmount: cart?.cost?.subtotalAmount ?? get().subtotalAmount,
            totalAmount: cart?.cost?.totalAmount ?? get().totalAmount,
          });
        } finally {
          set({ isApplyingCode: false });
        }
      },

      applyGiftCard: async (code) => {
        const { cartId, giftCardCodes } = get();
        if (!cartId) return { success: false, error: "Add an item to your cart first" };
        const trimmed = code.trim();
        if (!trimmed) return { success: false, error: "Enter a gift card code" };
        if (giftCardCodes.includes(trimmed)) return { success: false, error: "Gift card already applied" };
        set({ isApplyingCode: true });
        try {
          const newCodes = [...giftCardCodes, trimmed];
          const data = await storefrontApiRequest<any>(CART_GIFT_CARD_CODES_UPDATE, {
            cartId,
            giftCardCodes: newCodes,
          });
          const userErrors = data?.data?.cartGiftCardCodesUpdate?.userErrors ?? [];
          if (userErrors.length > 0) return { success: false, error: userErrors[0].message };
          const cart = data?.data?.cartGiftCardCodesUpdate?.cart;
          const appliedCards: AppliedGiftCard[] = cart?.appliedGiftCards ?? [];
          if (appliedCards.length <= giftCardCodes.length) {
            return { success: false, error: "This gift card is invalid or has no remaining balance" };
          }
          set({
            giftCardCodes: newCodes,
            appliedGiftCards: appliedCards,
            subtotalAmount: cart?.cost?.subtotalAmount ?? get().subtotalAmount,
            totalAmount: cart?.cost?.totalAmount ?? get().totalAmount,
          });
          return { success: true };
        } finally {
          set({ isApplyingCode: false });
        }
      },

      removeGiftCard: async (id) => {
        const { cartId, giftCardCodes, appliedGiftCards } = get();
        if (!cartId) return;
        const idx = appliedGiftCards.findIndex((c) => c.id === id);
        const remaining = idx === -1 ? giftCardCodes : giftCardCodes.filter((_, i) => i !== idx);
        set({ isApplyingCode: true });
        try {
          const data = await storefrontApiRequest<any>(CART_GIFT_CARD_CODES_UPDATE, {
            cartId,
            giftCardCodes: remaining,
          });
          const cart = data?.data?.cartGiftCardCodesUpdate?.cart;
          set({
            giftCardCodes: remaining,
            appliedGiftCards: cart?.appliedGiftCards ?? [],
            subtotalAmount: cart?.cost?.subtotalAmount ?? get().subtotalAmount,
            totalAmount: cart?.cost?.totalAmount ?? get().totalAmount,
          });
        } finally {
          set({ isApplyingCode: false });
        }
      },

      updateOrderNote: async (note) => {
        const { cartId } = get();
        set({ orderNote: note });
        if (!cartId) return;
        try {
          await storefrontApiRequest<any>(CART_NOTE_UPDATE, { cartId, note });
        } catch (err) {
          console.error("updateOrderNote failed", err);
        }
      },
    }),
    {
      name: "mls-shopify-cart",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // Prevent auto-rehydrate during SSR — we call rehydrate() eagerly on the client below
      partialize: (s) => ({
        items: s.items.filter((i) => !i.isPending),
        cartId: s.cartId,
        checkoutUrl: s.checkoutUrl,
        giftCardCodes: s.giftCardCodes,
        discountCodes: s.discountCodes,
        appliedGiftCards: s.appliedGiftCards,
        orderNote: s.orderNote,
      }),
      migrate: (persisted: any, fromVersion: number) => {
        if (fromVersion < 2) {
          const items = (persisted.items ?? []).map((item: any) =>
            item.sellingPlanId ? { ...item, sellingPlanName: item.sellingPlanName ?? null } : item
          );
          return { ...persisted, items, giftCardCodes: [], discountCodes: [], appliedGiftCards: [], orderNote: "" };
        }
        if (fromVersion < 3) {
          return { ...persisted, giftCardCodes: persisted.giftCardCodes ?? [], discountCodes: persisted.discountCodes ?? [], appliedGiftCards: persisted.appliedGiftCards ?? [], orderNote: "" };
        }
        if (fromVersion < 4) {
          return { ...persisted, orderNote: persisted.orderNote ?? "" };
        }
        return persisted;
      },
    }
  )
);

// Eagerly rehydrate from localStorage on module load so the cart count is
// available on first render without waiting for a useEffect tick.
if (typeof window !== "undefined") {
  useCartStore.persist.rehydrate();
}
