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
  isPending?: boolean;
}

export interface DiscountCodeInfo {
  code: string;
  applicable: boolean;
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
  giftCardCodes: string[];
  appliedGiftCards: AppliedGiftCard[];
  totalAmount: MoneyV2 | null;
  orderNote: string;
  setOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "lineId" | "isPending">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
  applyDiscountCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeDiscountCode: (code: string) => Promise<void>;
  applyGiftCard: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeGiftCard: (id: string) => Promise<void>;
  updateOrderNote: (note: string) => Promise<void>;
}

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
    cost { totalAmount { amount currencyCode } }
  }
}`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 100) { edges { node { id merchandise { ... on ProductVariant { id } } } } }
        cost { totalAmount { amount currencyCode } }
      }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { id lines(first: 100) { edges { node { id merchandise { ... on ProductVariant { id } } } } } }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id } userErrors { field message } }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { id } userErrors { field message } }
  }
`;

const CART_DISCOUNT_CODES_UPDATE = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        discountCodes { code applicable }
        cost { totalAmount { amount currencyCode } }
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
        cost { totalAmount { amount currencyCode } }
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

function isCartNotFoundError(
  userErrors: Array<{ field: string[] | null; message: string }>
): boolean {
  return userErrors.some(
    (e) =>
      e.message.toLowerCase().includes("cart not found") ||
      e.message.toLowerCase().includes("does not exist")
  );
}

async function createShopifyCart(item: CartItem) {
  const line: Record<string, any> = { quantity: item.quantity, merchandiseId: item.variantId };
  if (item.sellingPlanId) line.sellingPlanId = item.sellingPlanId;
  const data = await storefrontApiRequest<any>(CART_CREATE_MUTATION, {
    input: { lines: [line] },
  });
  if (data?.data?.cartCreate?.userErrors?.length > 0) return null;
  const cart = data?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) return null;
  const lineId = cart.lines.edges[0]?.node?.id;
  if (!lineId) return null;
  return {
    cartId: cart.id as string,
    checkoutUrl: formatCheckoutUrl(cart.checkoutUrl),
    lineId: lineId as string,
    totalAmount: cart.cost?.totalAmount ?? null,
  };
}

async function addLineToShopifyCart(cartId: string, item: CartItem) {
  const line: Record<string, any> = { quantity: item.quantity, merchandiseId: item.variantId };
  if (item.sellingPlanId) line.sellingPlanId = item.sellingPlanId;
  const data = await storefrontApiRequest<any>(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [line],
  });
  const userErrors = data?.data?.cartLinesAdd?.userErrors || [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true as const };
  if (userErrors.length > 0) return { success: false as const };
  const lines = data?.data?.cartLinesAdd?.cart?.lines?.edges || [];
  const newLine = lines.find((l: any) => l.node.merchandise.id === item.variantId);
  return { success: true as const, lineId: newLine?.node?.id as string | undefined };
}

async function updateShopifyCartLine(cartId: string, lineId: string, quantity: number) {
  const data = await storefrontApiRequest<any>(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  const userErrors = data?.data?.cartLinesUpdate?.userErrors || [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true as const };
  if (userErrors.length > 0) return { success: false as const };
  return { success: true as const };
}

async function removeLineFromShopifyCart(cartId: string, lineId: string) {
  const data = await storefrontApiRequest<any>(CART_LINES_REMOVE_MUTATION, {
    cartId,
    lineIds: [lineId],
  });
  const userErrors = data?.data?.cartLinesRemove?.userErrors || [];
  if (isCartNotFoundError(userErrors)) return { success: false, cartNotFound: true as const };
  if (userErrors.length > 0) return { success: false as const };
  return { success: true as const };
}

const EMPTY: Pick<CartStore,
  "discountCodes" | "giftCardCodes" | "appliedGiftCards" | "totalAmount" | "orderNote"
> = {
  discountCodes: [],
  giftCardCodes: [],
  appliedGiftCards: [],
  totalAmount: null,
  orderNote: "",
};

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
      ...EMPTY,

      setOpen: (open) => set({ isOpen: open }),

      addItem: async (item) => {
        const { items, cartId, clearCart } = get();
        const existing = items.find(
          (i) => i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
        );

        try {
          if (!cartId) {
            set({
              items: [{ ...item, lineId: null, isPending: true }, ...get().items],
              isOpen: true,
              isLoading: true,
            });
            const result = await createShopifyCart({ ...item, lineId: null });
            if (result) {
              set({
                cartId: result.cartId,
                checkoutUrl: result.checkoutUrl,
                totalAmount: result.totalAmount,
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.isPending
                    ? { ...i, lineId: result.lineId, isPending: false }
                    : i
                ),
              });
            } else {
              set({ items: get().items.filter((i) => !(i.variantId === item.variantId && i.isPending)) });
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
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.isPending
                    ? { ...i, lineId: result.lineId ?? null, isPending: false }
                    : i
                ),
              });
            } else if (result.cartNotFound) {
              clearCart();
            } else {
              set({ items: get().items.filter((i) => !(i.variantId === item.variantId && i.isPending)) });
            }
          }
        } catch (err) {
          console.error("addItem failed", err);
          set({ items: get().items.filter((i) => !i.isPending) });
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(variantId);
          return;
        }
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item?.lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const result = await updateShopifyCartLine(cartId, item.lineId, quantity);
          if (result.success) {
            set({ items: get().items.map((i) => i.variantId === variantId ? { ...i, quantity } : i) });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item?.lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const result = await removeLineFromShopifyCart(cartId, item.lineId);
          if (result.success) {
            const next = get().items.filter((i) => i.variantId !== variantId);
            if (next.length === 0) clearCart();
            else set({ items: next });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
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
              totalAmount: cart.cost?.totalAmount ?? null,
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
          const newCodes: DiscountCodeInfo[] = cart?.discountCodes ?? [];
          set({ discountCodes: newCodes, totalAmount: cart?.cost?.totalAmount ?? get().totalAmount });
          const applied = newCodes.find((c) => c.code.toUpperCase() === trimmed);
          if (!applied?.applicable) {
            return { success: false, error: "This discount code is invalid or expired" };
          }
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
