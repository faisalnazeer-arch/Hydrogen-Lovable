import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, Link } from "react-router";
import { LpHeroSlide } from "~/components/landing-pages/LpHeroSlide";
import { LpProductGridSection } from "~/components/landing-pages/LpProductGridSection";
import { LpReelsSection } from "~/components/landing-pages/LpReelsSection";
import { LpValueBannerSection } from "~/components/landing-pages/LpValueBannerSection";
import { LpIconsSection } from "~/components/landing-pages/LpIconsSection";
import { LpMessageBanner } from "~/components/landing-pages/LpMessageBanner";
import { LpReviewsCarousel } from "~/components/landing-pages/LpReviewsCarousel";
import { YoutubeReelsSection } from "~/components/landing-pages/YoutubeReelsSection";
import { LpCertificationsSection } from "~/components/landing-pages/LpCertificationsSection";
import type { ShopifyProduct } from "@/lib/shopify";

// ── Fragments & Queries ───────────────────────────────────────────────────────

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
      body
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
                key value type
                # Single refs for DIRECT lp_types nodes:
                #   slide → lp_hero_slide
                #   value_banner → mls_value_banner
                #   certifications → lp_certifications_section
                #   product_grid → lp_product_grid
                #   sub_banner → MediaImage
                reference {
                  ... on MediaImage { image { url altText } }
                  ... on Metaobject {
                    type handle
                    fields {
                      key value type
                      reference {
                        ... on Collection { handle title }
                        ... on MediaImage { image { url altText } }
                      }
                      references(first: 20) {
                        nodes {
                          ... on Metaobject {
                            type handle
                            fields {
                              key value
                              reference { ... on MediaImage { image { url altText } } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                # List refs for DIRECT lp_types: slider, icon, message_banner, reviews, reels_yt
                # AND for lp_page.sections list → inner lp_types nodes (faraz-dev structure)
                references(first: 20) {
                  nodes {
                    ... on Metaobject {
                      type handle
                      fields {
                        key value type
                        # Single refs inside lp_types when parent node is lp_page
                        reference {
                          ... on MediaImage { image { url altText } }
                          ... on Metaobject {
                            type handle
                            fields {
                              key value type
                              reference {
                                ... on Metaobject { type handle fields { key value type reference { ... on MediaImage { image { url altText } } } } }
                                ... on MediaImage { image { url altText } }
                                ... on Collection { handle title }
                              }
                              references(first: 20) {
                                nodes {
                                  ... on Metaobject {
                                    type handle
                                    fields {
                                      key value
                                      reference { ... on MediaImage { image { url altText } } }
                                    }
                                  }
                                }
                              }
                            }
                          }
                          ... on Collection { handle title }
                        }
                        # List refs inside lp_types (icon, slider, reviews, reels_yt, etc.)
                        # when parent is lp_page — OR list refs within Level-2 nodes
                        references(first: 20) {
                          nodes {
                            ... on Metaobject {
                              id type handle
                              fields {
                                key value
                                reference {
                                  ... on MediaImage { image { url altText } }
                                  ... on Metaobject {
                                    type handle
                                    fields { key value }
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFieldRef(fields: any[], key: string): any | null {
  return fields?.find((f: any) => f.key === key)?.reference ?? null;
}

// Find a collection handle from lp_product_grid fields regardless of which
// key the admin chose (grid_collection_2, grid_collection, collection, etc.)
function resolveCollectionHandle(pf: any[]): string | null {
  return (
    pf.find((x: any) => x.key === "grid_collection_2")?.reference?.handle ??
    pf.find((x: any) => x.key === "grid_collection")?.reference?.handle ??
    pf.find((x: any) => x.key === "collection")?.reference?.handle ??
    pf.find((x: any) => x.key === "collection_ref")?.reference?.handle ??
    pf.find((x: any) => x.key === "collection_handle")?.value ??
    // Last resort: any field whose reference resolves to a handle (collection_reference type)
    pf.find((x: any) => x.reference?.handle)?.reference?.handle ??
    null
  );
}

function toShopifyProduct(node: any): ShopifyProduct {
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

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) throw new Response("Missing handle", { status: 400 });

  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";

  const data = await context.storefront.query(PAGE_QUERY, {
    variables: { handle, language, country: "AE" as const },
    cache: context.storefront.CacheShort(),
  });

  if (!data.page) throw new Response("Page not found", { status: 404 });

  const metafields = (data.page.metafields ?? []).filter(Boolean);
  const sectionsMeta = metafields.find((m: any) => m?.key === "sections");
  // Top-level nodes — may be lp_page wrappers or direct lp_types
  const lpPageNodes: any[] = sectionsMeta?.references?.nodes ?? [];

  // Regular prose page — no LP sections
  if (lpPageNodes.length === 0) {
    return {
      isLandingPage: false as const,
      page: { title: data.page.title, body: data.page.body, seo: data.page.seo },
      lpPageNodes: [],
      productsByCollection: {},
      reelItems: [],
    };
  }

  // Collect collection handles and check for legacy reel_section.
  // Supports both lp_page→lp_types nesting AND direct lp_types nodes.
  const collectionHandles = new Set<string>();
  let needsReelItems = false;

  function scanLpTypes(lpTypes: any) {
    const tf: any[] = lpTypes.fields ?? [];
    const pgRef = getFieldRef(tf, "product_grid");
    if (pgRef?.type === "lp_product_grid") {
      const pf: any[] = pgRef.fields ?? [];
      const collHandle = resolveCollectionHandle(pf);
      if (collHandle) collectionHandles.add(collHandle);
    }
    if (tf.some((x: any) => x.key === "reel_section")) needsReelItems = true;
  }

  for (const lpNode of lpPageNodes) {
    const f: any[] = lpNode.fields ?? [];
    const innerNodes: any[] = f.find((x: any) => x.key === "sections")?.references?.nodes ?? [];
    if (innerNodes.length > 0) {
      innerNodes.forEach(scanLpTypes);
    } else {
      scanLpTypes(lpNode);
    }
  }

  const productsByCollection: Record<string, any[]> = {};
  const tasks: Promise<unknown>[] = Array.from(collectionHandles).map(async (collHandle) => {
    const r = await context.storefront.query(COLLECTION_PRODUCTS_QUERY, {
      variables: { handle: collHandle, language, country: "AE" as const },
      cache: context.storefront.CacheLong(),
    });
    productsByCollection[collHandle] = r.collection?.products?.nodes ?? [];
  });

  let reelItems: any[] = [];
  if (needsReelItems) {
    tasks.push(
      context.storefront
        .query(REEL_ITEMS_QUERY, {
          variables: { language, country: "AE" as const },
          cache: context.storefront.CacheNone(),
        })
        .then((d: any) => { reelItems = d.metaobjects?.nodes ?? []; })
    );
  }

  await Promise.all(tasks);

  return {
    isLandingPage: true as const,
    page: { title: data.page.title, body: data.page.body, seo: data.page.seo },
    lpPageNodes,
    productsByCollection,
    reelItems,
  };
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.page?.seo?.title ?? data?.page?.title ?? "MLS UAE" },
    { name: "description", content: data?.page?.seo?.description ?? "" },
  ];
};

// ── Landing page section renderer ─────────────────────────────────────────────

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
    : ["slide", "message_banner", "icon", "certifications", "value_banner", "reviews", "reels_yt", "reel_section", "product_grid", "sub_banner"];

  const sectionMap: Record<string, React.ReactNode | null> = {};

  // ── slide / slider ──────────────────────────────────────────────────────────
  // Store under BOTH keys so the order field works whether it says "slide" or "slider"
  const slideRef = getFieldRef(f, "slide");
  if (slideRef?.type === "lp_hero_slide") {
    const slideEl = <LpHeroSlide key={`${key}-slide`} node={slideRef} />;
    sectionMap["slide"] = slideEl;
    sectionMap["slider"] = slideEl;
  }
  if (!sectionMap["slider"]) {
    const sliderNodes: any[] = f.find((x: any) => x.key === "slider")?.references?.nodes ?? [];
    if (sliderNodes.length > 0) {
      const sliderEl = (
        <>
          {sliderNodes.map((n: any, i: number) => (
            <LpHeroSlide key={`${key}-slide-${i}`} node={n} />
          ))}
        </>
      );
      sectionMap["slide"] = sliderEl;
      sectionMap["slider"] = sliderEl;
    }
  }

  // ── message_banner ──────────────────────────────────────────────────────────
  const messageBannerNodes: any[] = f.find((x: any) => x.key === "message_banner")?.references?.nodes ?? [];
  if (messageBannerNodes.length > 0) {
    sectionMap["message_banner"] = (
      <LpMessageBanner key={`${key}-msg`} nodes={messageBannerNodes} />
    );
  }

  // ── icon (trust badges) ─────────────────────────────────────────────────────
  const iconNodes: any[] = f.find((x: any) => x.key === "icon")?.references?.nodes ?? [];
  if (iconNodes.length > 0) {
    sectionMap["icon"] = <LpIconsSection key={`${key}-icons`} nodes={iconNodes} />;
  }

  // ── certifications ──────────────────────────────────────────────────────────
  const certsRef = getFieldRef(f, "certifications");
  if (certsRef?.type === "lp_certifications_section") {
    sectionMap["certifications"] = (
      <LpCertificationsSection key={`${key}-certs`} node={certsRef} />
    );
  }

  // ── value_banner ────────────────────────────────────────────────────────────
  const valueBannerRef = getFieldRef(f, "value_banner");
  if (valueBannerRef) {
    sectionMap["value_banner"] = (
      <LpValueBannerSection key={`${key}-value`} node={valueBannerRef} />
    );
  }

  // ── reviews ─────────────────────────────────────────────────────────────────
  const reviewNodes: any[] = f.find((x: any) => x.key === "reviews")?.references?.nodes ?? [];
  if (reviewNodes.length > 0) {
    sectionMap["reviews"] = (
      <LpReviewsCarousel key={`${key}-reviews`} nodes={reviewNodes} />
    );
  }

  // ── reels_yt (YouTube embed carousel) ──────────────────────────────────────
  const reelsYtNodes: any[] = f.find((x: any) => x.key === "reels_yt")?.references?.nodes ?? [];
  if (reelsYtNodes.length > 0) {
    sectionMap["reels_yt"] = (
      <YoutubeReelsSection key={`${key}-yt`} nodes={reelsYtNodes} />
    );
  }

  // ── reel_section (legacy video reels with product links) ───────────────────
  const reelSectionRef = getFieldRef(f, "reel_section");
  if (reelSectionRef && reelItems.length > 0) {
    const rf: any[] = reelSectionRef.fields ?? [];
    const heading = rf.find((x: any) => x.key === "heading")?.value ?? "MLS Reels";
    const label = rf.find((x: any) => x.key === "label")?.value ?? "Watch & Shop";
    const sectionId = rf.find((x: any) => x.key === "section_id")?.value ?? reelSectionRef.handle ?? "reels";
    sectionMap["reel_section"] = (
      <LpReelsSection key={`${key}-reels`} reelItems={reelItems} heading={heading} label={label} sectionId={sectionId} />
    );
  }

  // ── product_grid ─────────────────────────────────────────────────────────────
  const productGridRef = getFieldRef(f, "product_grid");
  if (productGridRef?.type === "lp_product_grid") {
    const pf: any[] = productGridRef.fields ?? [];
    const collHandle = resolveCollectionHandle(pf);
    const rawProducts = collHandle ? (productsByCollection[collHandle] ?? []) : [];
    const products = rawProducts.map(toShopifyProduct);
    sectionMap["product_grid"] = (
      <LpProductGridSection key={`${key}-grid`} fields={pf} products={products} />
    );
  }

  // ── sub_banner (full-width image) ───────────────────────────────────────────
  const subBannerUrl = f.find((x: any) => x.key === "sub_banner")?.reference?.image?.url;
  if (subBannerUrl) {
    sectionMap["sub_banner"] = (
      <section key={`${key}-subbanner`} className="w-full">
        <img src={subBannerUrl} alt="" className="w-full" loading="lazy" />
      </section>
    );
  }

  return orderedKeys.map((k) => sectionMap[k]).filter(Boolean) as React.ReactNode[];
}

// ── Page component ────────────────────────────────────────────────────────────

export default function Page() {
  const { isLandingPage, page, lpPageNodes, productsByCollection, reelItems } =
    useLoaderData<typeof loader>();

  // ── Landing page ──────────────────────────────────────────────────────
  if (isLandingPage) {
    const allSections: React.ReactNode[] = [];

    lpPageNodes.forEach((lpNode: any, pi: number) => {
      const f: any[] = lpNode.fields ?? [];
      // Unwrap lp_page → lp_types nesting if present (faraz-dev structure)
      const innerNodes: any[] = f.find((x: any) => x.key === "sections")?.references?.nodes ?? [];
      const targets = innerNodes.length > 0 ? innerNodes : [lpNode];
      targets.forEach((lpTypes: any, ti: number) => {
        renderLpTypes(lpTypes, `${pi}-${ti}`, productsByCollection, reelItems)
          .forEach((s) => allSections.push(s));
      });
    });

    return <div className="min-h-screen">{allSections}</div>;
  }

  // ── Regular Shopify page ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">{page.title}</span>
        </nav>
        <h1 className="font-display mb-10 text-3xl font-extrabold text-foreground md:text-4xl">
          {page.title}
        </h1>
        <div
          className="prose prose-sm md:prose-base max-w-none
            prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground
            prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-xl
            prose-h3:mt-7 prose-h3:mb-2 prose-h3:text-lg
            prose-p:text-neutral-600 prose-p:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-crimson prose-a:no-underline hover:prose-a:underline
            prose-li:text-neutral-600 prose-li:leading-relaxed
            prose-ul:my-4 prose-ol:my-4
            prose-hr:border-border"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      </div>
    </div>
  );
}
