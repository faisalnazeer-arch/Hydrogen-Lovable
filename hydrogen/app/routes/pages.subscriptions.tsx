import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, Link } from "react-router";
import { Star, ChevronDown, ArrowRight, Settings, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.page?.heroTitle ?? "Subscriptions"} — MLS UAE` },
  { name: "description", content: data?.page?.heroSubtitle ?? "Subscribe & Save up to 15% on every MLS order." },
];

// ─── Admin query ──────────────────────────────────────────────────────────────

const PAGE_QUERY = `{
  page: metaobjects(type: "mls_subscription_page", first: 1) {
    nodes {
      fields {
        key value
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
}`;


// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ context, request }: LoaderFunctionArgs) {
  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";

  const adminData = await context.adminFetch(PAGE_QUERY);

  const node = adminData?.page?.nodes?.[0];
  const f = Object.fromEntries((node?.fields ?? []).map((x: any) => [x.key, x]));
  const refs = (key: string) => f[key]?.references?.nodes ?? [];

  const page = {
    heroTitle:       f.hero_title?.value       ?? "Eat Clean, Save Big!",
    heroSubtitle:    f.hero_subtitle?.value    ?? "",
    heroImageUrl:    f.hero_image_url?.value   ?? "",
    heroCtaText:     f.hero_cta_text?.value    ?? "Start My Subscription",
    heroCtaUrl:      f.hero_cta_url?.value     ?? "/collections/all",
    timelineTitle:   f.timeline_title?.value   ?? "Consistency Pays Off",
    benefits_title:  f.benefits_title?.value   ?? "The Benefits of MLS Subscription",
    stepsTitle:      f.steps_title?.value      ?? "How to Get Started",
    reviewsTitle:    f.reviews_title?.value    ?? "What Meat Lovers Say",
    faqTitle:        f.faq_title?.value        ?? "Subscription FAQs",
    bottomCtaTitle:  f.bottom_cta_title?.value ?? "Ready to Start Saving?",
    bottomCtaSub:    f.bottom_cta_subtitle?.value ?? "",
    manageUrl:       f.manage_url?.value       ?? "",

    timeline: refs("timeline_items").map((n: any) => {
      const nf = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
      return {
        id: n.id,
        weekLabel:      nf.week_label ?? "",
        healthBenefits: (nf.health_benefits ?? "").split("\n").filter(Boolean),
        perks:          (nf.perks ?? "").split("\n").filter(Boolean),
      };
    }),

    benefits: refs("benefit_items").map((n: any) => {
      const nf = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
      return { id: n.id, emoji: nf.emoji ?? "", title: nf.title ?? "", description: nf.description ?? "", imageUrl: nf.image_url ?? "" };
    }),

    steps: refs("step_items").map((n: any) => {
      const nf = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
      return { id: n.id, number: nf.number ?? "", title: nf.title ?? "", description: nf.description ?? "", imageUrl: nf.image_url ?? "" };
    }),

    reviews: refs("review_items").map((n: any) => {
      const nf = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
      return { id: n.id, name: nf.name ?? "", title: nf.title ?? "", body: nf.body ?? "", rating: parseInt(nf.rating ?? "5") };
    }),

    faqs: refs("faq_items").map((n: any) => {
      const nf = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
      return { id: n.id, question: nf.question ?? "", answer: nf.answer ?? "" };
    }),
  };

  return { page };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Timeline week colours cycling
const WEEK_COLOURS = ["bg-crimson", "bg-crimson", "bg-rich-red", "bg-[#7a0007]"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { page } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[520px] items-center overflow-hidden md:min-h-[620px]">
        {page.heroImageUrl && (
          <img
            src={page.heroImageUrl}
            alt={page.heroTitle}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/92 via-charcoal/70 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-lg">
            <span className="mb-4 inline-block rounded-full bg-crimson/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow">
              Subscribe &amp; Save up to 15%
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              {page.heroTitle.includes("Save Big") ? (
                <>Eat Clean,<br /><span className="text-crimson">Save Big!</span></>
              ) : page.heroTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75 md:text-lg">
              {page.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={page.heroCtaUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-crimson px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all hover:bg-rich-red hover:shadow-xl"
              >
                {page.heroCtaText} <ArrowRight className="h-4 w-4" />
              </Link>
              {page.manageUrl && (
                <a
                  href={page.manageUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/35 px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white backdrop-blur transition-all hover:border-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" /> Manage Plan
                </a>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-5">
              {["🥩 Free Ribeye every order", "🚚 Free delivery AED 100+", "✅ Cancel anytime"].map((t) => (
                <span key={t} className="text-xs text-white/60">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TIMELINE ══════════════════════════════════════════════════════════ */}
      {page.timeline.length > 0 && (
        <section className="bg-muted/30 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-crimson">Your Health Journey</p>
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-4xl">
                {page.timelineTitle.replace("(In Health & Savings)", "")}
                <span className="text-crimson"> (In Health &amp; Savings)</span>
              </h2>
            </div>

            {/* Desktop: horizontal stepper */}
            <div className="hidden gap-0 md:grid md:grid-cols-4">
              {page.timeline.map((item, i) => (
                <div key={item.id} className="relative flex flex-col">
                  {i < page.timeline.length - 1 && (
                    <div className="absolute left-[calc(50%+1.5rem)] right-0 top-5 h-0.5 bg-border z-0" />
                  )}
                  <div className="relative z-10 mb-5 flex justify-center">
                    <div className={`grid h-10 w-10 place-items-center rounded-full ${WEEK_COLOURS[i]} text-xs font-extrabold text-white shadow-lg ring-4 ring-background`}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-5 mx-2 shadow-sm">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">{item.weekLabel}</p>
                    <ul className="mb-4 space-y-1.5">
                      {item.healthBenefits.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crimson" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {item.perks.map((p) => (
                        <span key={p} className="rounded-full bg-crimson/10 px-2 py-0.5 text-[10px] font-semibold text-crimson border border-crimson/20">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: vertical stacked */}
            <div className="flex flex-col gap-4 md:hidden">
              {page.timeline.map((item, i) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${WEEK_COLOURS[i]} text-xs font-extrabold text-white shadow ring-4 ring-background`}>
                      {i + 1}
                    </div>
                    {i < page.timeline.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 rounded-2xl border border-border bg-card p-4 mb-2 shadow-sm">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">{item.weekLabel}</p>
                    <ul className="mb-3 space-y-1">
                      {item.healthBenefits.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crimson" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1.5">
                      {item.perks.map((p) => (
                        <span key={p} className="rounded-full bg-crimson/10 px-2 py-0.5 text-[10px] font-semibold text-crimson border border-crimson/20">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                to={page.heroCtaUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-crimson px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all hover:bg-rich-red"
              >
                Start Now — Free Ribeye + 10% Off <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══ BENEFITS ══════════════════════════════════════════════════════════ */}
      {page.benefits.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">Why Choose MLS?</p>
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">{page.benefits_title}</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {page.benefits.map(({ id, emoji, title, description, imageUrl }) => (
                <div key={id} className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card pb-7 pt-6 text-center shadow-sm transition-shadow hover:shadow-md overflow-hidden">
                  {/* image above — or fall back to emoji */}
                  {imageUrl ? (
                    <div className="flex h-28 w-full items-center justify-center px-4">
                      <img src={imageUrl} alt={title} className="h-full w-auto max-w-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-5xl leading-none pt-2">{emoji}</span>
                  )}
                  <div className="px-5">
                    <h3 className="font-display text-base font-bold leading-snug">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      {page.steps.length > 0 && (
        <section className="bg-muted/40 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">Simple Setup</p>
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">{page.stepsTitle}</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {page.steps.map(({ id, number, title, description, imageUrl }) => (
                <div key={id} className="flex flex-col items-center gap-3 text-center">
                  {/* image above step number */}
                  {imageUrl && (
                    <div className="flex h-40 w-full items-end justify-center">
                      <img src={imageUrl} alt={title} className="max-h-full w-auto max-w-[160px] object-contain drop-shadow-md" />
                    </div>
                  )}
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-crimson text-xl font-extrabold text-white shadow-md ring-4 ring-background">
                    {number}
                  </div>
                  <h3 className="font-display text-base font-bold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to={page.heroCtaUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-crimson px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all hover:bg-rich-red"
              >
                Get Started Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══ TESTIMONIALS ══════════════════════════════════════════════════════ */}
      {page.reviews.length > 0 && (
        <section className="bg-background py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">Real Customers</p>
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{page.reviewsTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">What They're Talking About MLS</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {page.reviews.map(({ id, name, title, body, rating }) => (
                <div key={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex gap-0.5">
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-foreground">{title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                  <p className="mt-auto text-xs font-semibold text-crimson">— {name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ FAQs ══════════════════════════════════════════════════════════════ */}
      {page.faqs.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">Got Questions?</p>
              <h2 className="font-display text-2xl font-extrabold md:text-3xl">{page.faqTitle}</h2>
            </div>
            <div className="mx-auto max-w-2xl space-y-3">
              {page.faqs.map((item) => <FaqItem key={item.id} q={item.question} a={item.answer} />)}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Need more detail?{" "}
              <Link to="/pages/subscription-policy" className="font-semibold text-crimson hover:underline">
                Read the full Subscription Policy →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ══ BOTTOM CTA ════════════════════════════════════════════════════════ */}
      <section className="bg-crimson/5 border-t border-crimson/20 py-16 text-center">
        <div className="container mx-auto px-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">Start Today</p>
          <h2 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">{page.bottomCtaTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">{page.bottomCtaSub}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={page.heroCtaUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-crimson px-8 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all hover:bg-rich-red hover:shadow-xl"
            >
              Start My Subscription <ArrowRight className="h-4 w-4" />
            </Link>
            {page.manageUrl && (
              <a
                href={page.manageUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-crimson px-8 py-4 text-sm font-bold uppercase tracking-wide text-crimson transition-all hover:bg-crimson hover:text-white"
              >
                <Settings className="h-4 w-4" /> Manage My Plan
              </a>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-display text-sm font-semibold md:text-base">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: open ? "300px" : "0px" }}>
        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </div>
  );
}
