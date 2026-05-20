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

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "lineId" | "isPending">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
}

const CART_QUERY = `query cart($id: ID!) { cart(id: $id) { id totalQuantity } }`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 100) { edges { node { id merchandise { ... on ProductVariant { id } } } } }
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isSyncing: false,
      isOpen: false,

      setOpen: (open) => set({ isOpen: open }),

      addItem: async (item) => {
        const { items, cartId, clearCart } = get();
        const existing = items.find(
          (i) => i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
        );

        try {
          if (!cartId) {
            // Optimistically show item immediately
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
            // Optimistically update quantity
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
              // Revert optimistic quantity
              set({
                items: get().items.map((i) =>
                  i.variantId === item.variantId && i.sellingPlanId === item.sellingPlanId
                    ? { ...i, quantity: existing.quantity, isPending: false }
                    : i
                ),
              });
            }
          } else {
            // New item to existing cart — show it immediately
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
            const current = get().items;
            set({
              items: current.map((i) =>
                i.variantId === variantId ? { ...i, quantity } : i
              ),
            });
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
            const current = get().items;
            const next = current.filter((i) => i.variantId !== variantId);
            if (next.length === 0) clearCart();
            else set({ items: next });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null }),

      getCheckoutUrl: () => get().checkoutUrl,

      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;
        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest<any>(CART_QUERY, { id: cartId });
          if (!data) return;
          const cart = data?.data?.cart;
          if (!cart || cart.totalQuantity === 0) clearCart();
        } catch (err) {
          console.error("sync cart failed", err);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "mls-shopify-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Never persist pending items — if page reloads mid-add, the item is re-added cleanly
      partialize: (s) => ({
        items: s.items.filter((i) => !i.isPending),
        cartId: s.cartId,
        checkoutUrl: s.checkoutUrl,
      }),
      migrate: (persisted: any, fromVersion: number) => {
        if (fromVersion < 2) {
          const items = (persisted.items ?? []).map((item: any) =>
            item.sellingPlanId ? { ...item, sellingPlanName: item.sellingPlanName ?? null } : item
          );
          return { ...persisted, items };
        }
        return persisted;
      },
    }
  )
);
