import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { LpHeroSlide } from "~/components/landing-pages/LpHeroSlide";
import { LpProductGridSection } from "~/components/landing-pages/LpProductGridSection";
import { LpReelsSection } from "~/components/landing-pages/LpReelsSection";
import { LpValueBannerSection } from "~/components/landing-pages/LpValueBannerSection";
import { LpIconsSection } from "~/components/landing-pages/LpIconsSection";

const PRODUCT_FRAGMENT = `
  fragment ProductCard on Product {
    id title description handle tags vendor productType availableForSale
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    images(first: 4) { edges { node { url altText width height } } }
    variants(first: 20) {
      edges {
        node {
          id title price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          availableForSale
          selectedOptions { name value }
          quantityAvailable
        }
      }
    }
    options { name values }
    metafields(identifiers: [
      {namespace: "reviews", key: "rating"}
      {namespace: "reviews", key: "rating_count"}
    ]) { key value }
  }
`;


const PAGE_QUERY = `#graphql
  query LandingPage($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      title
      seo { title description }
      metafields(identifiers: [
        { namespace: "custom", key: "sections" }
      ]) {
        key
        value
        references(first: 20) {
          nodes {
            ... on Metaobject {
              type
              handle
              fields {
                key
                value
                type
                references(first: 20) {
                  nodes {
                    ... on Metaobject {
                      type
                      handle
                      fields {
                        key
                        value
                        type
                        reference {
                          ... on Metaobject {
                            type
                            handle
                            fields {
                              key
                              value
                              type
                              reference {
                                ... on MediaImage { image { url altText } }
                                ... on Collection { handle title }
                              }
                              references(first: 20) {
                                nodes {
                                  ... on Metaobject {
                                    type
                                    handle
                                    fields {
                                      key
                                      value
                                      reference {
                                        ... on MediaImage { image { url altText } }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                          ... on MediaImage { image { url altText } }
                          ... on Collection { handle title }
                        }
                        references(first: 20) {
                          nodes {
                            ... on Metaobject {
                              id
                              type
                              handle
                              fields {
                                key
                                value
                                reference {
                                  ... on MediaImage { image { url altText } }
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
          }
        }
      }
    }
  }
` as const;

const REEL_ITEMS_QUERY = `#graphql
  query LpReelItems($language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    metaobjects(type: "reel_item", first: 20) {
      nodes {
        id
        fields {
          key
          value
          reference {
            ... on Video {
              sources { url mimeType }
              previewImage { url }
            }
            ... on Product {
              id title handle
              featuredImage { url altText }
              priceRange { minVariantPrice { amount currencyCode } }
            }
          }
        }
      }
    }
  }
` as const;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query LpCollectionProducts($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    collection(handle: $handle) {
      products(first: 12) { nodes { ...ProductCard } }
    }
  }
` as const;

function getFieldRef(fields: any[], key: string): any | null {
  return fields?.find((f: any) => f.key === key)?.reference ?? null;
}

// Convert a raw Shopify product node (from GraphQL fragment) into ShopifyProduct shape
function toShopifyProduct(node: any) {
  return {
    node: {
      ...node,
      images: node.images ?? { edges: [] },
      variants: node.variants ?? { edges: [] },
      options: node.options ?? [],
      metafields: node.metafields ?? [],
    },
  };
}

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) throw new Response("Missing handle", { status: 400 });

  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";

  const data = await context.storefront.query(PAGE_QUERY, {
    variables: { handle, language, country: "AE" as const },
  });
  if (!data.page) throw new Response("Page not found", { status: 404 });

  const metafields = (data.page.metafields ?? []).filter(Boolean);
  const sectionsMeta = metafields.find((m: any) => m?.key === "sections");
  // lp_page nodes (top level — each is an lp_page metaobject)
  const lpPageNodes: any[] = sectionsMeta?.references?.nodes ?? [];

  // Extract all collection handles needed for product grids, fetch products separately
  // New query shape: lp_page.fields → references.nodes → lp_types nodes
  // lp_types.fields → reference → lp_product_grid node
  const collectionHandles = new Set<string>();
  for (const lpPage of lpPageNodes) {
    const f = lpPage.fields ?? [];
    const lpTypeNodes: any[] = f.find((x: any) => x.key === "sections")?.references?.nodes ?? [];
    const targets = lpTypeNodes.length > 0 ? lpTypeNodes : [lpPage];
    for (const lpTypes of targets) {
      const tf = lpTypes.fields ?? [];
      const pgRef = tf.find((x: any) => x.key === "product_grid")?.reference;
      if (pgRef?.type === "lp_product_grid") {
        const pf = pgRef.fields ?? [];
        const collHandle = pf.find((x: any) => x.key === "grid_collection_2")?.reference?.handle
          ?? pf.find((x: any) => x.key === "collection_handle")?.value;
        if (collHandle) collectionHandles.add(collHandle);
      }
    }
  }

  const productsByCollection: Record<string, any[]> = {};

  await Promise.all([
    ...Array.from(collectionHandles).map(async (collHandle) => {
      const collData = await context.storefront.query(COLLECTION_PRODUCTS_QUERY, {
        variables: { handle: collHandle, language, country: "AE" as const },
      });
      productsByCollection[collHandle] = collData.collection?.products?.nodes ?? [];
    }),
  ]);

  const reelData = await context.storefront.query(REEL_ITEMS_QUERY, {
    variables: { language, country: "AE" as const },
    cache: context.storefront.CacheNone(),
  });
  const reelItems: any[] = reelData.metaobjects?.nodes ?? [];

  return {
    pageTitle: data.page.title,
    pageSeo: data.page.seo,
    lpPageNodes,
    productsByCollection,
    reelItems,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.pageSeo?.title ?? data?.pageTitle ?? "MLS UAE" },
    { name: "description", content: data?.pageSeo?.description ?? "" },
  ];
};

function renderLpTypes(
  lpTypes: any,
  key: string,
  productsByCollection: Record<string, any[]>,
  reelItems: any[]
): React.ReactNode[] {
  const f: any[] = lpTypes.fields ?? [];

  const orderField = f.find((x: any) => x.key === "order")?.value ?? "";
  const orderedKeys: string[] = orderField
    ? orderField.split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["slide", "icon", "value_banner", "reel_section", "product_grid"];

  const sectionMap: Record<string, React.ReactNode | null> = {};

  const slideRef = getFieldRef(f, "slide");
  if (slideRef?.type === "lp_hero_slide") {
    sectionMap["slide"] = <LpHeroSlide key={`${key}-slide`} node={slideRef} />;
  }

  const iconNodes: any[] = f.find((x: any) => x.key === "icon")?.references?.nodes ?? [];
  if (iconNodes.length > 0) {
    sectionMap["icon"] = <LpIconsSection key={`${key}-icons`} nodes={iconNodes} />;
  }

  const valueBannerRef = getFieldRef(f, "value_banner");
  if (valueBannerRef) {
    sectionMap["value_banner"] = <LpValueBannerSection key={`${key}-value`} node={valueBannerRef} />;
  }

  const reelSectionRef = getFieldRef(f, "reel_section");
  if (reelSectionRef && reelItems.length > 0) {
    const heading = reelSectionRef.fields?.find((x: any) => x.key === "heading")?.value ?? "MLS Reels";
    const label = reelSectionRef.fields?.find((x: any) => x.key === "label")?.value ?? "Watch & Shop";
    const sectionId = reelSectionRef.fields?.find((x: any) => x.key === "section_id")?.value ?? reelSectionRef.handle ?? "reels";
    sectionMap["reel_section"] = <LpReelsSection key={`${key}-reels`} reelItems={reelItems} heading={heading} label={label} sectionId={sectionId} />;
  }

  const productGridRef = getFieldRef(f, "product_grid");
  if (productGridRef?.type === "lp_product_grid") {
    const pf: any[] = productGridRef.fields ?? [];
    const collHandle =
      pf.find((x: any) => x.key === "grid_collection_2")?.reference?.handle ??
      pf.find((x: any) => x.key === "collection_handle")?.value;
    const rawProducts = collHandle ? (productsByCollection[collHandle] ?? []) : [];
    const products = rawProducts.map(toShopifyProduct);
    sectionMap["product_grid"] = (
      <LpProductGridSection key={`${key}-grid`} fields={pf} products={products} />
    );
  }

  return orderedKeys.map((k) => sectionMap[k]).filter(Boolean) as React.ReactNode[];
}

export default function LandingPage() {
  const { lpPageNodes, productsByCollection, reelItems } = useLoaderData<typeof loader>();

  const allSections: React.ReactNode[] = [];

  lpPageNodes.forEach((lpPage: any, pi: number) => {
    const f: any[] = lpPage.fields ?? [];
    const lpTypeNodes: any[] = f.find((x: any) => x.key === "sections")?.references?.nodes ?? [];
    const targets = lpTypeNodes.length > 0 ? lpTypeNodes : [lpPage];
    targets.forEach((lpTypes: any, ti: number) => {
      renderLpTypes(lpTypes, `${pi}-${ti}`, productsByCollection, reelItems)
        .forEach((s) => allSections.push(s));
    });
  });

  return (
    <div className="min-h-screen">
      {allSections}
    </div>
  );
}