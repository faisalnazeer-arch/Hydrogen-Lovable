import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { useT } from "../i18n/strings";
import { HeroBanner } from "../components/home/HeroBanner";
import { TrustBadges } from "../components/home/TrustBadges";
import { FeaturedCollections } from "../components/home/FeaturedCollections";
import type { FeaturedCollectionCard } from "../components/home/FeaturedCollections";
import { PriceRangeShop, parsePriceRangeSection, parsePriceTiles } from "../components/home/PriceRangeShop";
import { PromoSideBySide, parsePromoSideBySide, type PromoSideBySideData } from "../components/home/PromoSideBySide";
import { CategorySection } from "../components/home/CategorySection";
import { ShopByCategory } from "../components/home/ShopByCategory";
import { ShopByCuts } from "../components/home/ShopByCuts";
import { ShopByOrigin } from "../components/home/ShopByOrigin";
import { ValueBoxesBanner } from "../components/home/ValueBoxesBanner";
import { RecentlyViewed } from "../components/home/RecentlyViewed";
import { ReelsCarousel } from "../components/home/ReelsCarousel";

const HOME_QUERY = `#graphql
  query HomeData($language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    heroBanners: metaobjects(type: "hero_banner", first: 10) {
      nodes {
        id
        fields {
          key
          value
          type
          reference {
            ... on MediaImage {
              image { url altText width height }
            }
          }
        }
      }
    }
    trustBadges: metaobjects(type: "icon_with_text", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image { url }
            }
          }
        }
      }
    }
    featuredCollectionList: metaobjects(type: "featured_collection_list", first: 20) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image { url altText }
            }
          }
        }
      }
    }
    priceRangeSection: metaobjects(type: "price_range_section", first: 1) {
      nodes {
        id
        fields { key value }
      }
    }
    priceTiles: metaobjects(type: "price_range_tile", first: 20) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image { url altText }
            }
          }
        }
      }
    }
    reelsSection: metaobjects(type: "reels_section", first: 1) {
      nodes {
        id
        fields { key value }
      }
    }
    reelItems: metaobjects(type: "reel_item", first: 20) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on Product {
              id
              title
              handle
              priceRange { minVariantPrice { amount currencyCode } }
              featuredImage { url altText }
              media(first: 5) {
                edges {
                  node {
                    mediaContentType
                    ... on Video {
                      previewImage { url }
                      sources { url mimeType }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    promoSideBySide: metaobjects(type: "promo_side_by_side", first: 1) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image { url altText }
            }
          }
        }
      }
    }
    featuredCollections: metaobjects(type: "featured_collection", first: 10) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on Collection {
              handle
              title
              products(first: 12) {
                edges {
                  node {
                    id
                    title
                    handle
                    availableForSale
                    priceRange {
                      minVariantPrice { amount currencyCode }
                      maxVariantPrice { amount currencyCode }
                    }
                    compareAtPriceRange { minVariantPrice { amount currencyCode } }
                    images(first: 4) { edges { node { url altText width height } } }
                    variants(first: 20) {
                      edges {
                        node {
                          id
                          title
                          price { amount currencyCode }
                          compareAtPrice { amount currencyCode }
                          availableForSale
                          selectedOptions { name value }
                        }
                      }
                    }
                    options { name values }
                    tags
                    vendor
                    productType
                    metafields(identifiers: [
                      {namespace: "reviews", key: "rating"}
                      {namespace: "reviews", key: "rating_count"}
                    ]) { key value }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
` as const;

// ── Types ──────────────────────────────────────────────────────────────────

import type { ShopifyProduct, ReelProduct } from "../lib/shopify";
import { REELS_QUERY } from "../lib/shopify";

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

function parseReelItems(nodes: any[]): ReelProduct[] {
  const reels: ReelProduct[] = [];
  for (const node of nodes) {
    const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
    const p = f["product"]?.reference;
    if (!p) continue;
    const videoEdge = p.media?.edges?.find(
      (e: any) => e.node.mediaContentType === "VIDEO"
    );
    if (!videoEdge) continue;
    const mp4 = videoEdge.node.sources?.find((s: any) => s.mimeType === "video/mp4") ?? videoEdge.node.sources?.[0];
    reels.push({
      id: p.id,
      title: p.title,
      handle: p.handle,
      price: p.priceRange.minVariantPrice,
      poster: videoEdge.node.previewImage?.url ?? p.featuredImage?.url ?? null,
      videoUrl: mp4?.url ?? null,
      embedUrl: null,
    });
  }
  return reels;
}

interface FeaturedCollectionEntry {
  id: string;
  handle: string;
  title: string;
  subTitle: string | undefined;
  products: ShopifyProduct[];
}

function parseFeaturedCollections(nodes: any[]): FeaturedCollectionEntry[] {
  return nodes
    .map((node) => {
      const fieldMap = Object.fromEntries(
        node.fields.map((f: any) => [f.key, f]),
      );
      const collection = fieldMap["collection"]?.reference;
      if (!collection?.handle) return null;
      const metaTitle = fieldMap["title"]?.value ?? null;
      // If the metaobject title looks like a handle (e.g. "year-end-mixed"), ignore it
      const isHandleLike = metaTitle ? /^[a-z0-9-]+$/.test(metaTitle) : true;
      const title = (!isHandleLike && metaTitle) ? metaTitle : (collection.title ?? "");

      return {
        id: node.id,
        handle: collection.handle as string,
        title,
        subTitle: (fieldMap["sub_title"]?.value ?? undefined) as string | undefined,
        products: (collection.products?.edges ?? []) as ShopifyProduct[],
      };
    })
    .filter((e): e is FeaturedCollectionEntry => e !== null);
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

export const meta: MetaFunction = () => [
  { title: "MLS UAE — Premium Meats" },
  { name: "description", content: "Premium Wagyu, Angus, lamb and more — delivered." },
];

// Fallback sections shown when no metaobject entries exist (no products — CategorySection will client-fetch)
const FALLBACK_COLLECTIONS: FeaturedCollectionEntry[] = [
  { id: "f1", handle: "all-beef", title: "Premium Beef", subTitle: "The butcher's selection", products: [] },
  { id: "f2", handle: "all-lamb", title: "Lamb & Mutton", subTitle: "Tender, fresh, halal", products: [] },
  { id: "f3", handle: "australian-wagyu-beef-mb-4-5", title: "Australian Wagyu", subTitle: "Marbling MB 4/5", products: [] },
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
  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const i18n = { language: lang === "ar" ? "AR" : "EN", country: "AE" } as const;
  const [data, reelTagged] = await Promise.all([
    context.storefront.query(HOME_QUERY, { variables: i18n }),
    context.storefront.query(REELS_QUERY, { variables: { first: 20, query: "tag:reel" } }),
  ]);

  const parsed = parseFeaturedCollections(data?.featuredCollections?.nodes ?? []);
  const collectionCards = parseFeaturedCollectionList(data?.featuredCollectionList?.nodes ?? []);
  const priceSection = parsePriceRangeSection(data?.priceRangeSection?.nodes ?? []);
  const priceTiles = parsePriceTiles(data?.priceTiles?.nodes ?? []);
  const promo = parsePromoSideBySide(data?.promoSideBySide?.nodes ?? []);
  const reelsConfig = parseReelsSectionConfig(data?.reelsSection?.nodes ?? []);

  // Use reel_item entries from metaobject; fall back to tag:reel product query when none exist
  let reels: ReelProduct[] = parseReelItems(data?.reelItems?.nodes ?? []);
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

  return {
    heroSlides: data?.heroBanners?.nodes ?? [],
    trustBadges: data?.trustBadges?.nodes ?? [],
    featuredCollections: parsed.length > 0 ? parsed : FALLBACK_COLLECTIONS,
    collectionCards,
    priceSection,
    priceTiles,
    promo,
    reelsLabel: reelsConfig.subHeading,
    reelsHeading: reelsConfig.heading,
    reels,
  };
}

export default function Home() {
  const { heroSlides, trustBadges, featuredCollections, collectionCards, priceSection, priceTiles, promo, reelsLabel, reelsHeading, reels } = useLoaderData<typeof loader>();
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
      <PriceRangeShop section={priceSection} tiles={priceTiles} />
      <PromoSideBySide promo={promo} />
      {featuredCollections.map((fc) => (
        <CategorySection
          key={fc.id}
          handle={fc.handle}
          title={fc.title}
          subtitle={fc.subTitle}
          products={fc.products}
        />
      ))}
      <ReelsCarousel reels={reels} label={reelsLabel} heading={reelsHeading} />
      <ShopByCategory />
      <ShopByCuts />
      <ShopByOrigin />
      <ValueBoxesBanner />
      <RecentlyViewed />
    </>
  );
}
