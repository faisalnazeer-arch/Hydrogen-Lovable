import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { FaqAccordion, parseFaqItems } from "@/components/ui/FaqAccordion";

export const meta: MetaFunction = () => [
  { title: "FAQs — MLS UAE" },
  { name: "description", content: "Find answers to the most common questions about MLS UAE — delivery, halal certification, custom cuts, and more." },
];

const FAQ_QUERY = `
  {
    nodes: metaobjects(type: "mls_faq_page", first: 1) {
      nodes {
        fields {
          key
          value
          reference {
            ... on MediaImage { image { url altText } }
          }
          references(first: 20) {
            nodes {
              ... on Metaobject {
                id
                fields { key value }
              }
            }
          }
        }
      }
    }
  }
`;

export async function loader({ context }: LoaderFunctionArgs) {
  const data = await context.adminFetch(FAQ_QUERY);
  const node = data?.nodes?.nodes?.[0];
  const f = Object.fromEntries(
    (node?.fields ?? []).map((x: any) => [x.key, x])
  );
  return {
    heroTitle:    f.hero_title?.value    ?? "Frequently Asked Questions",
    heroSubtitle: f.hero_subtitle?.value ?? "Everything you need to know about our products, delivery, and service.",
    heroImage:    f.hero_image?.reference?.image?.url ?? null,
    faqItems:     parseFaqItems(f.faq_items?.references?.nodes ?? []),
    ctaHeading:   f.cta_heading?.value   ?? "Still have questions?",
    ctaSubtitle:  f.cta_subtitle?.value  ?? "Our team is available 9 AM – 10 PM, all days of the week.",
  };
}

export default function FaqPage() {
  const { heroTitle, heroSubtitle, heroImage, faqItems, ctaHeading, ctaSubtitle } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div
        className="relative overflow-hidden py-20 md:py-28"
        style={heroImage
          ? { backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "linear-gradient(135deg, #1a0a0a 0%, #3d0000 50%, #1a0a0a 100%)" }
        }
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative container mx-auto px-4 text-center text-white">
          <span className="mb-4 inline-block rounded-full border border-crimson/40 bg-crimson/20 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            Help Center
          </span>
          <h1 className="font-display text-4xl font-extrabold md:text-5xl lg:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 md:text-lg">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* FAQ Accordion + CTA */}
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <FaqAccordion
          items={faqItems}
          showCta
          ctaHeading={ctaHeading}
          ctaSubtitle={ctaSubtitle}
        />
      </div>

    </div>
  );
}
