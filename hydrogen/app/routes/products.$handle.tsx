import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { type ShopifyProduct } from "~/lib/shopify";
import { fetchJudgemeReviews, buildRatingSummary } from "~/lib/judgeme";
import { DefaultTemplate } from "~/components/product-templates/DefaultTemplate";
import { BeefRubsTemplate, ChickenRubsTemplate } from "~/components/product-templates/RubsTemplate";

const RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations($productId: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      id title handle vendor
      availableForSale
      tags
      productType
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      compareAtPriceRange { minVariantPrice { amount currencyCode } }
      images(first: 4) { edges { node { url altText width height } } }
      variants(first: 20) {
        edges {
          node {
            id title availableForSale
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
      options { name values }
      metafields(identifiers: [
        {namespace: "reviews", key: "rating"}
        {namespace: "reviews", key: "rating_count"}
      ]) { key value }
    }
  }
` as const;

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    product(handle: $handle) {
      id title handle descriptionHtml vendor
      tags
      images(first: 10) { nodes { url altText } }
      options { name values }
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      sellingPlanGroups(first: 10) {
        nodes {
          name
          sellingPlans(first: 10) {
            nodes { id name recurringDeliveries }
          }
        }
      }
      variants(first: 50) {
        nodes {
          id title availableForSale quantityAvailable
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
          image { url altText }
          sellingPlanAllocations(first: 10) {
            nodes {
              sellingPlan { id }
              priceAdjustments {
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
              }
            }
          }
        }
      }
      metafields(identifiers: [
        {namespace: "reviews", key: "rating"}
        {namespace: "reviews", key: "rating_count"}
        {namespace: "custom", key: "beef_rubs"}
        {namespace: "custom", key: "mls_rub"}
        {namespace: "custom", key: "usage_guide"}
        {namespace: "custom", key: "ingredients"}
        {namespace: "custom", key: "flavor_profile"}
        {namespace: "custom", key: "pairing_suggestions"}
      ]) { key value }
    }
  }
` as const;

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) throw new Response("Missing handle", { status: 400 });

  const { env } = context;
  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const judgemeToken = env.JUDGEME_API_TOKEN;

  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";

  const data = await context.storefront.query(PRODUCT_QUERY, {
    variables: { handle, language, country: "AE" as const },
    cache: context.storefront.CacheNone(),
  });
  if (!data.product) throw new Response("Not found", { status: 404 });

  const externalId = data.product.id.split("/").pop() ?? undefined;

  const [reviewsData, recsData] = await Promise.all([
    fetchJudgemeReviews(handle, shopDomain, judgemeToken, 1, 10, externalId),
    context.storefront.query(RECOMMENDATIONS_QUERY, {
      variables: { productId: data.product.id, language, country: "AE" as const },
    }),
  ]);

  const rating = buildRatingSummary(reviewsData);

  const discountMap: Record<string, number> = {};
  for (const v of data.product.variants?.nodes ?? []) {
    const variantPrice = parseFloat((v as any).price?.amount ?? "0");
    for (const alloc of (v as any).sellingPlanAllocations?.nodes ?? []) {
      const planId = alloc.sellingPlan?.id;
      const adj = alloc.priceAdjustments?.[0];
      if (!planId || !adj || discountMap[planId] !== undefined) continue;
      const subPrice = parseFloat(adj.price?.amount ?? "0");
      const baseline = parseFloat(adj.compareAtPrice?.amount ?? "0") || variantPrice;
      if (baseline > 0 && subPrice < baseline) {
        discountMap[planId] = Math.round(((baseline - subPrice) / baseline) * 100);
      }
    }
  }
  for (const group of data.product.sellingPlanGroups?.nodes ?? []) {
    for (const plan of (group as any).sellingPlans?.nodes ?? []) {
      if (plan.id && discountMap[plan.id] === undefined) {
        discountMap[plan.id] = 10;
      }
    }
  }

  const recommendations: ShopifyProduct[] = (recsData?.productRecommendations ?? [])
    .slice(0, 8)
    .map((node: any) => ({ node }));

  // Detect template from product tags: e.g. "template:beef-rubs" → "beef-rubs"
  const templateSuffix =
    (data.product.tags?.find((t: string) => t.startsWith("template:"))?.replace("template:", "") ?? null) as string | null;

  return {
    product: data.product,
    templateSuffix,
    sellingPlanGroupsRaw: data.product.sellingPlanGroups?.nodes ?? [],
    discountMap,
    reviews: reviewsData.reviews,
    reviewsTotalCount: reviewsData.total_count ?? 0,
    rating,
    externalId: externalId ?? null,
    recommendations,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `${data?.product?.title ?? "Product"} — MLS UAE` }];
};

export default function Product() {
  const { templateSuffix, ...templateProps } = useLoaderData<typeof loader>();

  if (templateSuffix === "beef-rubs") return <BeefRubsTemplate {...templateProps} />;
  if (templateSuffix === "chicken-rubs") return <ChickenRubsTemplate {...templateProps} />;
  return <DefaultTemplate {...templateProps} />;
}
