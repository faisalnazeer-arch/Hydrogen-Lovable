import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { useT } from "../i18n/strings";
import { HeroBanner } from "../components/home/HeroBanner";
import { TrustBadges } from "../components/home/TrustBadges";
import { FeaturedCollections } from "../components/home/FeaturedCollections";
import type { FeaturedCollectionCard } from "../components/home/FeaturedCollections";
import { PriceRangeShop, parsePriceRangeSection, parsePriceTiles } from "../components/home/PriceRangeShop";
import { PromoSideBySide, parsePromoSideBySide } from "../components/home/PromoSideBySide";
import { CategorySection } from "../components/home/CategorySection";
import { ShopByCategory, type CategorySectionData } from "../components/home/ShopByCategory";
import { ShopByCuts } from "../components/home/ShopByCuts";
import { ShopByOrigin, type OriginSectionData } from "../components/home/ShopByOrigin";
import { ValueBoxesBanner, type ValueBannerData } from "../components/home/ValueBoxesBanner";
import { RecentlyViewed } from "../components/home/RecentlyViewed";
import { ReelsCarousel } from "../components/home/ReelsCarousel";

const HOME_QUERY = `#graphql
  fragment ProductCard on Product {
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
            }
            ... on Video {
              previewImage { url }
              sources { url mimeType }
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
    valueBanner: metaobjects(type: "mls_value_banner", first: 1) {
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
    originSection: metaobjects(type: "mls_origin_section", first: 1) {
      nodes {
        id
        fields {
          key
          value
          references(first: 20) {
            nodes {
              ... on Metaobject {
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
          }
        }
      }
    }
    collectionSectionConfig: metaobjects(type: "mls_collection_section", first: 1) {
      nodes {
        id
        fields { key value }
      }
    }
    categorySection: metaobjects(type: "mls_category_section", first: 1) {
      nodes {
        id
        fields {
          key
          value
          references(first: 20) {
            nodes {
              ... on Metaobject {
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
                edges { node { ...ProductCard } }
              }
            }
          }
          references(first: 8) {
            nodes {
              ... on Metaobject {
                id
                fields {
                  key
                  value
                  reference {
                    ... on Collection {
                      handle
                      title
                      products(first: 12) {
                        edges { node { ...ProductCard } }
                      }
                    }
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
    const product = f["product"]?.reference;
    const video = f["video"]?.reference;
    if (!product) continue;

    // Prefer the reel's own video field; fall back to product featured image as poster
    let videoUrl: string | null = null;
    let poster: string | null = product.featuredImage?.url ?? null;

    if (video?.sources) {
      const mp4 = video.sources.find((s: any) => s.mimeType === "video/mp4") ?? video.sources[0];
      videoUrl = mp4?.url ?? null;
      poster = video.previewImage?.url ?? poster;
    }

    reels.push({
      id: node.id,
      title: product.title,
      handle: product.handle,
      price: product.priceRange.minVariantPrice,
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

      // Parse tabs if present (new per-collection-tab mode)
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
              products: (col.products?.edges ?? []) as ShopifyProduct[],
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.position - b.position) as CollectionTab[];

        if (tabs.length > 0) {
          // Use the fallback single collection (or first tab) as the section's primary handle
          const primaryCol = fieldMap["collection"]?.reference;
          const primaryHandle = (primaryCol?.handle ?? tabs[0].handle) as string;
          const title = (!isHandleLike && metaTitle) ? metaTitle : (primaryCol?.title ?? tabs[0].title ?? "");
          return {
            id: node.id as string,
            handle: primaryHandle,
            title,
            subTitle,
            products: tabs[0].products,
            tabs,
          };
        }
      }

      // Fallback: single collection mode
      const collection = fieldMap["collection"]?.reference;
      if (!collection?.handle) return null;
      const title = (!isHandleLike && metaTitle) ? metaTitle : (collection.title ?? "");
      return {
        id: node.id as string,
        handle: collection.handle as string,
        title,
        subTitle,
        products: (collection.products?.edges ?? []) as ShopifyProduct[],
      };
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
      code: (f.code?.value ?? "") as string,
      link: (f.link?.value ?? "/") as string,
      imageUrl: (f.image?.reference?.image?.url ?? null) as string | null,
      imageAlt: (f.image?.reference?.image?.altText ?? "") as string,
    };
  });
  return {
    eyebrow: (fm.eyebrow?.value ?? "From the World's Best Farms") as string,
    heading: (fm.heading?.value ?? "Shop by Origin") as string,
    items,
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
  const collectionSectionConfig = parseCollectionSectionConfig(data?.collectionSectionConfig?.nodes ?? []);
  const rawSection = buildFeaturedSection(parsed.length > 0 ? parsed : FALLBACK_COLLECTIONS);
  const featuredSection = rawSection && collectionSectionConfig
    ? { ...rawSection, title: collectionSectionConfig.heading, subTitle: collectionSectionConfig.subHeading || undefined }
    : rawSection;
  const collectionCards = parseFeaturedCollectionList(data?.featuredCollectionList?.nodes ?? []);
  const priceSection = parsePriceRangeSection(data?.priceRangeSection?.nodes ?? []);
  const priceTiles = parsePriceTiles(data?.priceTiles?.nodes ?? []);
  const promo = parsePromoSideBySide(data?.promoSideBySide?.nodes ?? []);
  const categorySection = parseCategorySection(data?.categorySection?.nodes ?? []);
  const originSection = parseOriginSection(data?.originSection?.nodes ?? []);
  const valueBanner = parseValueBanner(data?.valueBanner?.nodes ?? []);
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
  };
}

export default function Home() {
  const { heroSlides, trustBadges, featuredSection, collectionCards, priceSection, priceTiles, promo, reelsLabel, reelsHeading, reels, categorySection, originSection, valueBanner } = useLoaderData<typeof loader>();
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
      {featuredSection && (
        <CategorySection
          handle={featuredSection.tabs[0]?.handle ?? ""}
          title={featuredSection.title}
          subtitle={featuredSection.subTitle}
          products={featuredSection.tabs[0]?.products ?? []}
          tabs={featuredSection.tabs}
        />
      )}
      <ReelsCarousel reels={reels} label={reelsLabel} heading={reelsHeading} />
      <ShopByCategory section={categorySection} />
      <ShopByCuts />
      <ShopByOrigin section={originSection} />
      <ValueBoxesBanner banner={valueBanner} />
      <RecentlyViewed />
    </>
  );
}
