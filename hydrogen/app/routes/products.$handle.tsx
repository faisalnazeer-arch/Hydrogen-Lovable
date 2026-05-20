import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { fetchJudgemeReviews, buildRatingSummary } from "~/lib/judgeme";
import { DefaultTemplate } from "~/components/product-templates/DefaultTemplate";
import { BeefRubsTemplate } from "~/components/product-templates/BeefRubsTemplate";
import { ChickenRubsTemplate } from "~/components/product-templates/ChickenRubsTemplate";

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

  // Fetch product first so we have the numeric ID for JudgMe filtering
  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";
  console.log(`[DEBUG] Product page: lang cookie="${lang ?? 'none'}" → requesting language=${language} for handle=${handle}`);

  const data = await context.storefront.query(PRODUCT_QUERY, {
    variables: { handle, language, country: "AE" as const },
  });
  if (!data.product) throw new Response("Not found", { status: 404 });

  // Extract numeric Shopify product ID from the GID (gid://shopify/Product/123…)
  const externalId = data.product.id.split("/").pop() ?? undefined;

  const reviewsData = await fetchJudgemeReviews(
    handle, shopDomain, judgemeToken, 1, 10, externalId
  );

  const rating = buildRatingSummary(reviewsData);

  // Build discount map across all variants — use variant's regular price as baseline
  // because compareAtPrice inside allocations is often null in Shopify's API
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
  // Default to 10% for any selling plan not covered by Shopify allocation data
  for (const group of data.product.sellingPlanGroups?.nodes ?? []) {
    for (const plan of (group as any).sellingPlans?.nodes ?? []) {
      if (plan.id && discountMap[plan.id] === undefined) {
        discountMap[plan.id] = 10;
      }
    }
  }

  return {
    product: data.product,
    templateSuffix: (data.product.tags?.find((t: string) => t.startsWith("template:"))?.replace("template:", "") ?? null) as string | null,
    sellingPlanGroupsRaw: data.product.sellingPlanGroups?.nodes ?? [],
    discountMap,
    reviews: reviewsData.reviews,
    reviewsTotalCount: reviewsData.total_count,
    rating,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `${data?.product?.title ?? "Product"} — MLS UAE` }];
};

export default function Product() {
  const loaderData = useLoaderData<typeof loader>();
  const { templateSuffix } = loaderData;

  if (templateSuffix === "beef-rubs") return <BeefRubsTemplate {...loaderData} />;
  if (templateSuffix === "chicken-rubs") return <ChickenRubsTemplate {...loaderData} />;
  return <DefaultTemplate {...loaderData} />;
}

