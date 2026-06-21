import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { detectLanguage } from "../lib/locale";
import { useT } from "../i18n/strings";
import { HeroBanner } from "../components/home/HeroBanner";
import { TrustBadges } from "../components/home/TrustBadges";
import { FeaturedCollections } from "../components/home/FeaturedCollections";
import type { FeaturedCollectionCard } from "../components/home/FeaturedCollections";
import { PriceRangeShop, parsePriceRangeSection, parsePriceTiles } from "../components/home/PriceRangeShop";
import { FirstOrderGift, parseFirstOrderGift } from "../components/home/FirstOrderGift";
import { PromoSideBySide, parsePromoSideBySide } from "../components/home/PromoSideBySide";
import { CategorySection } from "../components/home/CategorySection";
import { ShopByCategory, type CategorySectionData } from "../components/home/ShopByCategory";
import { ShopByCuts } from "../components/home/ShopByCuts";
import { ShopByOrigin, type OriginSectionData } from "../components/home/ShopByOrigin";
import { ValueBoxesBanner, type ValueBannerData } from "../components/home/ValueBoxesBanner";
import { RecentlyViewed } from "../components/home/RecentlyViewed";
import { ReelsCarousel } from "../components/home/ReelsCarousel";
import { HomeBlogSection, type BlogArticle } from "../components/home/HomeBlogSection";
import { HomeReviews } from "../components/home/HomeReviews";
import { fetchJudgemeStoreReviews, fetchJudgemeShopStats } from "~/lib/judgeme";
import type { JudgemeReview } from "~/lib/judgeme";

const imgFields = `key value reference { ... on MediaImage { image { url altText } } }`;

const Q_HERO       = `{ nodes: metaobjects(type: "hero_banner", first: 10) { nodes { id fields { key value reference { ... on MediaImage { image { url altText width height } } } } } } }`;
const Q_BADGES     = `{ nodes: metaobjects(type: "icon_with_text", first: 10) { nodes { id handle fields { ${imgFields} } } } }`;
const Q_PRICE_SEC  = `{ nodes: metaobjects(type: "price_range_section", first: 1) { nodes { id fields { key value } } } }`;
const Q_PRICE_TILE = `{ nodes: metaobjects(type: "price_range_tile", first: 20) { nodes { id fields { key value reference { ... on MediaImage { image { url altText } } ... on Collection { id handle title } } } } } }`;
const Q_REELS_SEC  = `{ nodes: metaobjects(type: "reels_section", first: 1) { nodes { id fields { key value } } } }`;

// Admin API query for reel items — gets ALL entries (including unpublished ones).
// Does NOT include price (Admin API prices are in a different unit than Storefront).
const Q_REEL_ITEMS = `{ nodes: metaobjects(type: "reel_item", first: 20) { nodes { id fields { key value reference { ... on Product { id handle title featuredImage { url } } ... on Video { sources { url mimeType } preview { image { url } } } } } } } }`;

// Storefront API query to batch-fetch correct presentment prices by product GID.
const REEL_PRODUCT_PRICES_QUERY = `#graphql
  query ReelProductPrices($ids: [ID!]!, $country: CountryCode)
  @inContext(country: $country) {
    nodes(ids: $ids) {
      ... on Product {
        id
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
const Q_PROMO      = `{ nodes: metaobjects(type: "promo_side_by_side", first: 1) { nodes { id fields { ${imgFields} } } } }`;
const Q_VALUE      = `{ nodes: metaobjects(type: "mls_value_banner", first: 1) { nodes { id fields { ${imgFields} } } } }`;
const Q_COL_CFG    = `{ nodes: metaobjects(type: "mls_collection_section", first: 1) { nodes { id fields { key value } } } }`;
const Q_ORIGIN     = `{ nodes: metaobjects(type: "mls_origin_section", first: 1) { nodes { id fields { key value references(first: 20) { nodes { ... on Metaobject { id handle fields { ${imgFields} } } } } } } } }`;
const Q_CATEGORY   = `{ nodes: metaobjects(type: "mls_category_section", first: 1) { nodes { id fields { key value references(first: 20) { nodes { ... on Metaobject { id fields { ${imgFields} } } } } } } } }`;
const Q_CUTS       = `{ nodes: metaobjects(type: "mls_cuts_section", first: 1) { nodes { id fields { key value references(first: 12) { nodes { ... on Metaobject { id fields { key value reference { ... on MediaImage { image { url altText } } } } } } } } } } }`;
const Q_FEATURED   = `{ nodes: metaobjects(type: "featured_collection", first: 10) { nodes { id fields { key value reference { ... on Collection { handle title } } references(first: 10) { nodes { ... on Metaobject { id fields { key value reference { ... on Collection { handle title } } } } } } } } } }`;
const Q_COL_LIST   = `{ nodes: metaobjects(type: "featured_collection_list", first: 20) { nodes { id fields { ${imgFields} } } } }`;
const Q_GIFT       = `{ nodes: metaobjects(type: "mls_first_order_gift", first: 1) { nodes { id fields { key value } } } }`;
const Q_SALE_SEC   = `{ nodes: metaobjects(type: "mls_sale_section", first: 1) { nodes { id fields { key value reference { ... on Collection { handle title } } } } } }`;
const Q_BLOG_ARTICLES = `
  query HomeBlogArticles {
    blogs(first: 5) {
      nodes {
        handle
        articles(first: 6, sortKey: PUBLISHED_AT, reverse: true) {
          nodes {
            id handle title publishedAt excerpt
            image { url altText }
          }
        }
      }
    }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────

import type { ShopifyProduct, ReelProduct } from "../lib/shopify";
import { REELS_QUERY, COLLECTION_PRODUCTS_QUERY } from "../lib/shopify";

interface ReelsSectionConfig {
  subHeading: string;
  heading: string;
}

function parseReelsSectionConfig(nodes: any[]): ReelsSectionConfig {
  const node = nodes[0];
  if (!node) return { subHeading: "Watch & Shop", heading: "MLS Reels" };
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    subHeading: f["sub_heading"]?.value ?? f["label"]?.value ?? "Watch & Shop",
    heading: f["heading"]?.value ?? "MLS Reels",
  };
}

function parseReelItems(
  nodes: any[],
  priceMap: Record<string, { amount: string; currencyCode: string }> = {}
): ReelProduct[] {
  const reels: ReelProduct[] = [];
  for (const node of nodes) {
    const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
    const product = f["product"]?.reference;
    const video = f["video"]?.reference;
    if (!product) continue;

    let videoUrl: string | null = null;
    let poster: string | null = product.featuredImage?.url ?? null;

    if (video?.sources) {
      const mp4 = video.sources.find((s: any) => s.mimeType === "video/mp4") ?? video.sources[0];
      videoUrl = mp4?.url ?? null;
      // Admin API Video uses preview.image.url
      poster = video.preview?.image?.url ?? poster;
    }

    const price = priceMap[product.id] ?? { amount: "0", currencyCode: "AED" };

    reels.push({
      id: node.id,
      title: product.title,
      handle: product.handle,
      price,
      poster,
      videoUrl,
      embedUrl: null,
    });
  }
  return reels;
}

interface CollectionTab {
  label: string;
  handle: string;
  title: string;
  position: number;
  products: ShopifyProduct[];
}

interface FeaturedCollectionEntry {
  id: string;
  handle: string;
  title: string;
  subTitle: string | undefined;
  products: ShopifyProduct[];
  tabs?: CollectionTab[];
}

interface FeaturedSection {
  title: string;
  subTitle: string | undefined;
  tabs: Array<{ label: string; handle: string; products: ShopifyProduct[] }>;
}

function parseFeaturedCollections(nodes: any[]): FeaturedCollectionEntry[] {
  return nodes
    .map((node) => {
      const fieldMap = Object.fromEntries(
        node.fields.map((f: any) => [f.key, f]),
      );
      const metaTitle = fieldMap["title"]?.value ?? null;
      const isHandleLike = metaTitle ? /^[a-z0-9-]+$/.test(metaTitle) : true;
      const subTitle = (fieldMap["sub_title"]?.value ?? undefined) as string | undefined;

      const tabNodes: any[] = fieldMap["tabs"]?.references?.nodes ?? [];
      if (tabNodes.length > 0) {
        const tabs: CollectionTab[] = tabNodes
          .map((tabNode: any) => {
            const tf = Object.fromEntries(tabNode.fields.map((f: any) => [f.key, f]));
            const col = tf["collection"]?.reference;
            if (!col?.handle) return null;
            return {
              label: (tf["label"]?.value ?? col.title ?? "Tab") as string,
              handle: col.handle as string,
              title: col.title as string,
              position: parseInt(tf["position"]?.value ?? "0", 10),
              products: [] as ShopifyProduct[],
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.position - b.position) as CollectionTab[];

        if (tabs.length > 0) {
          const primaryCol = fieldMap["collection"]?.reference;
          const primaryHandle = (primaryCol?.handle ?? tabs[0].handle) as string;
          const title = (!isHandleLike && metaTitle) ? metaTitle : (primaryCol?.title ?? tabs[0].title ?? "");
          return { id: node.id as string, handle: primaryHandle, title, subTitle, products: [] as ShopifyProduct[], tabs };
        }
      }

      const collection = fieldMap["collection"]?.reference;
      if (!collection?.handle) return null;
      const title = (!isHandleLike && metaTitle) ? metaTitle : (collection.title ?? "");
      return { id: node.id as string, handle: collection.handle as string, title, subTitle, products: [] as ShopifyProduct[] };
    })
    .filter((e): e is FeaturedCollectionEntry => e !== null);
}

function buildFeaturedSection(entries: FeaturedCollectionEntry[]): FeaturedSection | null {
  if (entries.length === 0) return null;
  // Section heading: use the first entry that has an explicit (non-handle-like) title
  const headingEntry = entries.find(e => e.title && !/^[a-z0-9-]+$/.test(e.title)) ?? entries[0];
  // Flatten all entries' tabs (or the entry itself) into one ordered tab list
  const tabs = entries.flatMap((entry) => {
    if (entry.tabs && entry.tabs.length > 0) {
      return entry.tabs.map((t) => ({ label: t.label, handle: t.handle, products: t.products }));
    }
    return [{ label: entry.title, handle: entry.handle, products: entry.products }];
  });
  return { title: headingEntry.title, subTitle: headingEntry.subTitle, tabs };
}

function parseFeaturedCollectionList(nodes: any[]): FeaturedCollectionCard[] {
  return nodes
    .map((node) => {
      const fieldMap = Object.fromEntries(node.fields.map((f: any) => [f.key, f]));
      const heading = (fieldMap["heading"]?.value ?? "") as string;
      if (!heading) return null;
      const card: FeaturedCollectionCard = {
        id: node.id as string,
        heading,
        subHeading: (fieldMap["sub_heading"]?.value ?? "") as string,
        url: (fieldMap["url"]?.value ?? "#") as string,
        imageUrl: (fieldMap["image"]?.reference?.image?.url ?? null) as string | null,
        imageAlt: (fieldMap["image"]?.reference?.image?.altText ?? "") as string,
      };
      return card;
    })
    .filter(Boolean) as FeaturedCollectionCard[];
}

function parseCategorySection(nodes: any[]): CategorySectionData | null {
  const node = nodes[0];
  if (!node) return null;
  const fm = Object.fromEntries(node.fields.map((f: any) => [f.key, f]));
  const items = (fm.items?.references?.nodes ?? []).map((item: any) => {
    const f = Object.fromEntries(item.fields.map((x: any) => [x.key, x]));
    return {
      id: item.id as string,
      heading: (f.heading?.value ?? "") as string,
      link: (f.link?.value ?? "/") as string,
      imageUrl: (f.image?.reference?.image?.url ?? null) as string | null,
      imageAlt: (f.image?.reference?.image?.altText ?? "") as string,
    };
  });
  return {
    eyebrow: (fm.eyebrow?.value ?? "Browse the Butcher") as string,
    heading: (fm.heading?.value ?? "Shop by Category") as string,
    items,
  };
}

function parseValueBanner(nodes: any[]): ValueBannerData | null {
  const node = nodes[0];
  if (!node) return null;
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  return {
    eyebrow:   (f.eyebrow?.value   ?? "") as string,
    heading:   (f.heading?.value   ?? "") as string,
    body:      (f.body?.value      ?? "") as string,
    btn1Label: (f.btn1_label?.value ?? "") as string,
    btn1Link:  (f.btn1_link?.value  ?? "") as string,
    btn2Label: (f.btn2_label?.value ?? "") as string,
    btn2Link:  (f.btn2_link?.value  ?? "") as string,
    imageUrl:  (f.image?.reference?.image?.url ?? null) as string | null,
    imageAlt:  (f.image?.reference?.image?.altText ?? "") as string,
  };
}

function parseOriginSection(nodes: any[]): OriginSectionData | null {
  const node = nodes[0];
  if (!node) return null;
  const fm = Object.fromEntries(node.fields.map((f: any) => [f.key, f]));
  const items = (fm.items?.references?.nodes ?? []).map((item: any) => {
    const f = Object.fromEntries(item.fields.map((x: any) => [x.key, x]));
    return {
      id: item.id as string,
      heading: (f.heading?.value ?? "") as string,
      link: (f.link?.value ?? "/") as string,
      imageUrl: (f.image?.reference?.image?.url ?? null) as string | null,
      imageAlt: (f.image?.reference?.image?.altText ?? "") as string,
      category: (f.category?.value ?? "") as string,
      countryCode: (f.country_code?.value ?? "") as string,
    };
  });
  return {
    eyebrow: (fm.eyebrow?.value ?? "From the World's Best Farms") as string,
    heading: (fm.heading?.value ?? "Shop by Origin") as string,
    items,
  };
}

export interface CutItem {
  id: string;
  label: string;
  emoji: string;
  url: string;
  imageUrl: string | null;
}

export interface CutsSectionData {
  eyebrow: string;
  heading: string;
  items: CutItem[];
}

const FALLBACK_CUTS: CutItem[] = [
  { id: "cut-steaks",   label: "Steaks",                 emoji: "🥩", url: "/collections/steaks",                 imageUrl: null },
  { id: "cut-mince",    label: "Mince",                  emoji: "🍖", url: "/collections/mince",                  imageUrl: null },
  { id: "cut-bicubes",  label: "Bone in Cubes",          emoji: "🦴", url: "/collections/bone-in-cubes",          imageUrl: null },
  { id: "cut-mishkak",  label: "Mishkak Barbecue Cubes", emoji: "🔥", url: "/collections/mishkak-barbecue-cubes", imageUrl: null },
  { id: "cut-blcubes",  label: "Boneless Cubes",         emoji: "🥩", url: "/collections/boneless-cubes",         imageUrl: null },
  { id: "cut-chops",    label: "Lamb Chops",             emoji: "🍖", url: "/collections/lamb-chops",             imageUrl: null },
  { id: "cut-ribs",     label: "Ribs",                   emoji: "🦴", url: "/collections/ribs",                   imageUrl: null },
  { id: "cut-burgers",  label: "Burgers",                emoji: "🍔", url: "/collections/burgers",                imageUrl: null },
  { id: "cut-roast",    label: "Beef Roast",             emoji: "🥩", url: "/collections/beef-roast",             imageUrl: null },
  { id: "cut-shanks",   label: "Shanks",                 emoji: "🦴", url: "/collections/shanks",                 imageUrl: null },
  { id: "cut-carcass",  label: "Whole Carcass",          emoji: "🐄", url: "/collections/whole-carcass",          imageUrl: null },
];

function parseCutsSection(nodes: any[]): CutsSectionData | null {
  const node = nodes[0];
  const fm = node ? Object.fromEntries(node.fields.map((f: any) => [f.key, f])) : null;

  const metaItems: CutItem[] = fm
    ? (fm.items?.references?.nodes ?? []).map((item: any) => {
        const f = Object.fromEntries(item.fields.map((x: any) => [x.key, x]));
        return {
          id: item.id as string,
          label: (f.label?.value ?? "") as string,
          emoji: (f.emoji?.value ?? "🥩") as string,
          url: (f.url?.value ?? "/") as string,
          imageUrl: (f.image?.reference?.image?.url ?? null) as string | null,
        };
      }).filter((c: CutItem) => c.label)
    : [];

  const items = metaItems.length > 0 ? metaItems : FALLBACK_CUTS;

  return {
    eyebrow: (fm?.eyebrow?.value ?? "Butcher's Picks") as string,
    heading: (fm?.heading?.value ?? "Shop by Cuts") as string,
    items,
  };
}

interface SaleSectionConfig {
  heading: string;
  subHeading: string;
  collectionHandle: string;
}

function parseSaleSection(nodes: any[]): SaleSectionConfig | null {
  const node = nodes[0];
  if (!node) return null;
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  const handle = f.collection?.reference?.handle as string | undefined;
  if (!handle) return null;
  return {
    heading:          (f.heading?.value     ?? "Sale") as string,
    subHeading:       (f.sub_heading?.value ?? "") as string,
    collectionHandle: handle,
  };
}

function parseCollectionSectionConfig(nodes: any[]): { heading: string; subHeading: string } | null {
  const node = nodes[0];
  if (!node) return null;
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  const heading = (f.heading?.value ?? "") as string;
  if (!heading) return null;
  return { heading, subHeading: (f.sub_heading?.value ?? "") as string };
}

export const meta: MetaFunction = () => [
  { title: "MLS UAE — Premium Meats" },
  { name: "description", content: "Premium Wagyu, Angus, lamb and more — delivered." },
];


function pickReels(edges: any[]): ReelProduct[] {
  const reels: ReelProduct[] = [];
  for (const e of edges) {
    const n = e.node;
    const videoNode = n.media?.edges?.find(
      (m: any) => m.node.mediaContentType === "VIDEO" || m.node.mediaContentType === "EXTERNAL_VIDEO"
    );
    if (!videoNode) continue;
    const isExternal = videoNode.node.mediaContentType === "EXTERNAL_VIDEO";
    const mp4 = videoNode.node.sources?.find((s: any) => s.mimeType === "video/mp4")
      ?? videoNode.node.sources?.[0];
    reels.push({
      id: n.id,
      title: n.title,
      handle: n.handle,
      price: n.priceRange.minVariantPrice,
      poster: videoNode.node.previewImage?.url ?? n.featuredImage?.url ?? null,
      videoUrl: !isExternal ? (mp4?.url ?? null) : null,
      embedUrl: isExternal ? (videoNode.node.embedUrl ?? null) : null,
    });
  }
  return reels;
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const af = (q: string) => context.adminFetch(q).then((d: any) => d?.nodes ?? {});
  const language = detectLanguage(request);
  const country = "AE" as const;

  const [
    heroRes, badgesRes, priceSecRes, priceTileRes, reelSecRes,
    promoRes, valueRes, colCfgRes, originRes, categoryRes,
    cutsRes, featuredRes, colListRes, reelTagged, reelItemsRes, giftRes, saleSecRes,
    blogData, reviewsData, shopStats,
  ] = await Promise.all([
    af(Q_HERO), af(Q_BADGES), af(Q_PRICE_SEC), af(Q_PRICE_TILE), af(Q_REELS_SEC),
    af(Q_PROMO), af(Q_VALUE), af(Q_COL_CFG), af(Q_ORIGIN), af(Q_CATEGORY),
    af(Q_CUTS), af(Q_FEATURED), af(Q_COL_LIST),
    context.storefront.query(REELS_QUERY, { variables: { first: 20, query: "tag:reel" } }),
    af(Q_REEL_ITEMS), af(Q_GIFT), af(Q_SALE_SEC),
    context.storefront.query(Q_BLOG_ARTICLES).catch(() => null),
    fetchJudgemeStoreReviews(context.env.PUBLIC_STORE_DOMAIN, context.env.JUDGEME_API_TOKEN, 1, 9).catch(() => ({ reviews: [] as JudgemeReview[], current_page: 1, per_page: 9 })),
    fetchJudgemeShopStats(context.env.PUBLIC_STORE_DOMAIN, context.env.JUDGEME_API_TOKEN).catch(() => ({ average: 0, count: 0 })),
  ]);

  const data = {
    heroBanners:          heroRes,
    trustBadges:          badgesRes,
    priceRangeSection:    priceSecRes,
    priceTiles:           priceTileRes,
    reelsSection:         reelSecRes,
    promoSideBySide:      promoRes,
    valueBanner:          valueRes,
    collectionSectionConfig: colCfgRes,
    originSection:        originRes,
    categorySection:      categoryRes,
    cutsSection:          cutsRes,
    featuredCollections:  featuredRes,
    featuredCollectionList: colListRes,
    firstOrderGift:       giftRes,
  };

  const parsed = parseFeaturedCollections(data?.featuredCollections?.nodes ?? []);

  // Fetch products for each unique collection handle via Storefront API (Admin API prices are incompatible)
  const allHandles = [...new Set(
    parsed.flatMap(e => [e.handle, ...(e.tabs?.map(t => t.handle) ?? [])]).filter(Boolean)
  )];
  const productsByHandle = new Map<string, ShopifyProduct[]>();
  if (allHandles.length > 0) {
    await Promise.all(allHandles.map(async (handle) => {
      try {
        const res = await context.storefront.query(COLLECTION_PRODUCTS_QUERY, { variables: { handle, first: 20, language, country } });
        productsByHandle.set(handle, (res?.collection?.products?.edges ?? [])
          .filter((e: any) => parseFloat(e.node?.priceRange?.minVariantPrice?.amount ?? "0") > 0));
      } catch { /* ignore missing collection */ }
    }));
  }
  const parsedWithProducts = parsed.map(e => ({
    ...e,
    products: productsByHandle.get(e.handle) ?? [],
    tabs: e.tabs?.map(t => ({ ...t, products: productsByHandle.get(t.handle) ?? [] })),
  }));

  const collectionSectionConfig = parseCollectionSectionConfig(data?.collectionSectionConfig?.nodes ?? []);
  const rawSection = buildFeaturedSection(parsedWithProducts);
  const featuredSection = rawSection && collectionSectionConfig
    ? { ...rawSection, title: collectionSectionConfig.heading, subTitle: collectionSectionConfig.subHeading || undefined }
    : rawSection;
  const collectionCards = parseFeaturedCollectionList(data?.featuredCollectionList?.nodes ?? []);
  const firstOrderGift = parseFirstOrderGift(data?.firstOrderGift?.nodes ?? []);
  const priceSection = parsePriceRangeSection(data?.priceRangeSection?.nodes ?? []);
  const priceTiles = parsePriceTiles(data?.priceTiles?.nodes ?? []);
  const promo = parsePromoSideBySide(data?.promoSideBySide?.nodes ?? []);
  const categorySection = parseCategorySection(data?.categorySection?.nodes ?? []);
  const originSection = parseOriginSection(data?.originSection?.nodes ?? []);
  const valueBanner = parseValueBanner(data?.valueBanner?.nodes ?? []);
  const cutsSection = parseCutsSection(data?.cutsSection?.nodes ?? []);
  const reelsConfig = parseReelsSectionConfig(data?.reelsSection?.nodes ?? []);
  const saleSection = parseSaleSection(saleSecRes?.nodes ?? []);

  let saleProducts: ShopifyProduct[] = [];
  if (saleSection) {
    try {
      const res = await context.storefront.query(COLLECTION_PRODUCTS_QUERY, {
        variables: { handle: saleSection.collectionHandle, first: 20, language, country },
      });
      saleProducts = (res?.collection?.products?.edges ?? [])
        .filter((e: any) => parseFloat(e.node?.priceRange?.minVariantPrice?.amount ?? "0") > 0);
    } catch { /* ignore missing collection */ }
  }

  // Fetch correct AED presentment prices for reel products via Storefront API
  // (Admin API prices are in a different unit — use Storefront @inContext for accuracy)
  const reelItemNodes: any[] = reelItemsRes?.nodes ?? [];
  const reelProductIds: string[] = reelItemNodes
    .map((n: any) => n.fields?.find((f: any) => f.key === "product")?.reference?.id)
    .filter(Boolean);
  const reelPriceMap: Record<string, { amount: string; currencyCode: string }> = {};
  if (reelProductIds.length > 0) {
    try {
      const priceData = await context.storefront.query(REEL_PRODUCT_PRICES_QUERY, {
        variables: { ids: reelProductIds, country: "AE" as const },
      });
      for (const n of priceData?.nodes ?? []) {
        if (n?.id && n.priceRange?.minVariantPrice) {
          reelPriceMap[n.id] = n.priceRange.minVariantPrice;
        }
      }
    } catch { /* ignore price fetch errors, cards still show without price */ }
  }

  // Use reel_item entries from metaobject; fall back to tag:reel product query when none exist
  let reels: ReelProduct[] = parseReelItems(reelItemNodes, reelPriceMap);
  if (reels.length === 0) {
    let taggedEdges = reelTagged?.products?.edges ?? [];
    if (taggedEdges.length === 0) {
      const reelAll = await context.storefront.query(REELS_QUERY, {
        variables: { first: 30, query: undefined },
      });
      taggedEdges = reelAll?.products?.edges ?? [];
    }
    reels = pickReels(taggedEdges);
  }

  const blogArticles: BlogArticle[] = ((blogData as any)?.blogs?.nodes ?? [])
    .flatMap((blog: any) =>
      (blog.articles?.nodes ?? []).map((n: any) => ({
        id: n.id as string,
        handle: n.handle as string,
        title: n.title as string,
        publishedAt: n.publishedAt as string,
        excerpt: (n.excerpt ?? null) as string | null,
        imageUrl: (n.image?.url ?? null) as string | null,
        imageAlt: (n.image?.altText ?? n.title ?? "") as string,
        blogHandle: blog.handle as string,
      }))
    )
    .sort((a: BlogArticle, b: BlogArticle) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 6);

  const storeReviews: JudgemeReview[] = ((reviewsData as any)?.reviews ?? []).filter((r: JudgemeReview) => r.rating >= 4);
  const reviewTotalCount: number = (reviewsData as any)?.total_count ?? 0;
  const reviewAverage: number = (shopStats as any)?.average ?? 0;

  return {
    heroSlides: data?.heroBanners?.nodes ?? [],
    trustBadges: data?.trustBadges?.nodes ?? [],
    featuredSection,
    collectionCards,
    priceSection,
    priceTiles,
    promo,
    reelsLabel: reelsConfig.subHeading,
    reelsHeading: reelsConfig.heading,
    reels,
    categorySection,
    originSection,
    valueBanner,
    cutsSection,
    firstOrderGift,
    saleSection,
    saleProducts,
    blogArticles,
    storeReviews,
    reviewTotalCount,
    reviewAverage,
  };
}

export default function Home() {
  const { heroSlides, trustBadges, featuredSection, collectionCards, priceSection, priceTiles, promo, reelsLabel, reelsHeading, reels, categorySection, originSection, valueBanner, cutsSection, firstOrderGift, saleSection, saleProducts, blogArticles, storeReviews, reviewTotalCount, reviewAverage } = useLoaderData<typeof loader>();
  const t = useT();
  return (
    <>
      <HeroBanner slides={heroSlides} />
      <TrustBadges badges={trustBadges} />
      <FeaturedCollections
        cards={collectionCards}
        title={t("home.featured")}
        subtitle={t("home.featured_sub")}
      />
      <FirstOrderGift data={firstOrderGift} />
      <PriceRangeShop section={priceSection} tiles={priceTiles} />
      {saleSection && (
        <CategorySection
          handle={saleSection.collectionHandle}
          title={saleSection.heading}
          subtitle={saleSection.subHeading}
          products={saleProducts}
        />
      )}
      {featuredSection && (
        <CategorySection
          handle={featuredSection.tabs[0]?.handle ?? ""}
          title={featuredSection.title}
          subtitle={featuredSection.subTitle}
          products={featuredSection.tabs[0]?.products ?? []}
          tabs={featuredSection.tabs}
        />
      )}
      <ShopByCategory section={categorySection} />
      <ShopByCuts section={cutsSection} />
      <ShopByOrigin section={originSection} />
      <ReelsCarousel reels={reels} label={reelsLabel} heading={reelsHeading} />
      <PromoSideBySide promo={promo} />
      <ValueBoxesBanner banner={valueBanner} />
      <HomeBlogSection articles={blogArticles} />
      <RecentlyViewed />
      <HomeReviews reviews={storeReviews} totalCount={reviewTotalCount} averageRating={reviewAverage} />
    </>
  );
}
