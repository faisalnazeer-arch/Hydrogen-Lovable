import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/pages.$handle";

const PAGE_QUERY = `#graphql
  query Page($handle: String!, $language: LanguageCode)
  @inContext(language: $language) {
    page(handle: $handle) {
      id
      title
      body
      bodySummary
      seo {
        title
        description
      }
      metafields(identifiers: [
        {namespace: "global", key: "title_tag"}
        {namespace: "global", key: "description_tag"}
      ]) {
        namespace
        key
        value
      }
    }
  }
` as const;

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) throw new Response("Not found", { status: 404 });

  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = lang === "ar" ? "AR" : "EN";

  const { page } = await context.storefront.query(PAGE_QUERY, {
    variables: { handle, language },
  });

  if (!page) throw new Response(`Page "${handle}" not found`, { status: 404 });

  return { page };
}

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    { title: data?.page?.seo?.title ?? data?.page?.title ?? "Page — MLS UAE" },
    { name: "description", content: data?.page?.seo?.description ?? data?.page?.bodySummary ?? "" },
  ];
};

export default function Page() {
  const { page } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">{page.title}</span>
        </nav>

        {/* Title */}
        <h1 className="font-display mb-10 text-3xl font-extrabold text-foreground md:text-4xl">
          {page.title}
        </h1>

        {/* Content */}
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
