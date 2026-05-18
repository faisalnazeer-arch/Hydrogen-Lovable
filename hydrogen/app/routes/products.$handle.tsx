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

  // Build discount map from first variant's selling plan allocations
  const firstVariantAllocations =
    data.product.variants?.nodes?.[0]?.sellingPlanAllocations?.nodes ?? [];
  const discountMap: Record<string, number> = {};
  for (const alloc of firstVariantAllocations) {
    const planId = alloc.sellingPlan?.id;
    const adj = alloc.priceAdjustments?.[0];
    if (!planId || !adj) continue;
    const price = parseFloat(adj.price?.amount ?? "0");
    const compare = parseFloat(adj.compareAtPrice?.amount ?? "0");
    if (compare > 0 && price < compare) {
      discountMap[planId] = Math.round(((compare - price) / compare) * 100);
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
