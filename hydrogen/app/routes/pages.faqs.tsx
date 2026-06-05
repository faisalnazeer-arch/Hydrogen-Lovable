import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { Plus, Minus, MessageCircle } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "FAQs — MLS UAE" },
  { name: "description", content: "Find answers to the most common questions about MLS UAE — delivery, halal certification, custom cuts, and more." },
];

const FAQ_QUERY = `
  query {
    metaobject(handle: { type: "mls_faq_page", handle: "faq-page" }) {
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
`;

export async function loader({ context }: LoaderFunctionArgs) {
  const data = await context.adminFetch(FAQ_QUERY);
  const f = Object.fromEntries(
    (data?.metaobject?.fields ?? []).map((x: any) => [x.key, x])
  );

  const faqItems = (f.faq_items?.references?.nodes ?? []).map((node: any) => {
    const nf = Object.fromEntries(node.fields.map((x: any) => [x.key, x.value]));
    return { id: node.id, question: nf.question ?? "", answer: nf.answer ?? "" };
  });

  return {
    heroTitle:   f.hero_title?.value   ?? "Frequently Asked Questions",
    heroSubtitle: f.hero_subtitle?.value ?? "Everything you need to know about our products, delivery, and service.",
    heroImage:   f.hero_image?.reference?.image?.url ?? null,
    faqItems,
    ctaHeading:  f.cta_heading?.value  ?? "Still have questions?",
    ctaSubtitle: f.cta_subtitle?.value ?? "Our team is available 9 AM – 10 PM, all days of the week.",
  };
}

export default function FaqPage() {
  const { heroTitle, heroSubtitle, heroImage, faqItems, ctaHeading, ctaSubtitle } = useLoaderData<typeof loader>();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIdx(openIdx === i ? null : i);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ────────────────────────────────────────────────────── */}
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

      {/* ── FAQ Accordion ───────────────────────────────────────────── */}
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="space-y-3">
          {faqItems.length === 0 ? (
            <p className="text-center text-muted-foreground">No FAQs available.</p>
          ) : (
            faqItems.map((item, i) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-crimson/30"
              >
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-base font-semibold text-foreground md:text-lg">
                    {item.question}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson transition-all">
                    {openIdx === i
                      ? <Minus className="h-4 w-4" />
                      : <Plus className="h-4 w-4" />
                    }
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: openIdx === i ? "400px" : "0px" }}
                >
                  <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground md:text-base">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Get in Touch CTA ────────────────────────────────────────── */}
      <div className="container mx-auto max-w-3xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-crimson via-rich-red to-[#1a0a0a] p-10 text-center text-white shadow-xl">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">{ctaHeading}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/80 md:text-base">{ctaSubtitle}</p>
            <Link
              to="/pages/contact-us"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-crimson shadow-md transition-all hover:scale-105 hover:shadow-lg"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Us
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
