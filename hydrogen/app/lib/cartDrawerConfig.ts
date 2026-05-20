import { useEffect, useState } from "react";
import { storefrontApiRequest } from "@/lib/shopify";

export interface CartDrawerConfig {
  freeShippingThreshold: number;
  deliveryItems: string[];
}

const DEFAULT_CONFIG: CartDrawerConfig = {
  freeShippingThreshold: 350,
  deliveryItems: [
    "Delivered within **2hrs** in Dubai. For Sharjah and Ajman same day delivery for orders confirmed before **1:00 PM**",
    "**10% off** on AED 600 purchase.",
    "🎁 **Special Offer Activated:** FREE gift of 2x Angus beef burgers and 1x AUS Grass-fed Beef Striploin on orders above **AED 40** with your first purchase!",
    "**Free Shipping** above AED 350",
  ],
};

const CART_DRAWER_CONFIG_QUERY = `
  query CartDrawerConfig {
    metaobjectByHandle(handle: { handle: "cart-drawer-config", type: "mls_cart_drawer_config" }) {
      threshold: field(key: "free_shipping_threshold") { value }
      item1: field(key: "delivery_item_1") { value }
      item2: field(key: "delivery_item_2") { value }
      item3: field(key: "delivery_item_3") { value }
      item4: field(key: "delivery_item_4") { value }
      item5: field(key: "delivery_item_5") { value }
      item6: field(key: "delivery_item_6") { value }
    }
  }
`;

// Module-level cache so the fetch only runs once per page load
let _cache: CartDrawerConfig | null = null;
let _promise: Promise<CartDrawerConfig> | null = null;

async function fetchConfig(): Promise<CartDrawerConfig> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = storefrontApiRequest<any>(CART_DRAWER_CONFIG_QUERY, {}).then((data) => {
    const obj = data?.data?.metaobjectByHandle;
    if (!obj) return DEFAULT_CONFIG;

    const threshold = parseInt(obj.threshold?.value ?? "", 10);
    const items = [
      obj.item1?.value,
      obj.item2?.value,
      obj.item3?.value,
      obj.item4?.value,
      obj.item5?.value,
      obj.item6?.value,
    ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    _cache = {
      freeShippingThreshold: isNaN(threshold) ? DEFAULT_CONFIG.freeShippingThreshold : threshold,
      deliveryItems: items.length > 0 ? items : DEFAULT_CONFIG.deliveryItems,
    };
    return _cache;
  }).catch(() => DEFAULT_CONFIG);

  return _promise;
}

export function useCartDrawerConfig(): CartDrawerConfig {
  const [config, setConfig] = useState<CartDrawerConfig>(_cache ?? DEFAULT_CONFIG);

  useEffect(() => {
    if (_cache) return;
    fetchConfig().then(setConfig);
  }, []);

  return config;
}
