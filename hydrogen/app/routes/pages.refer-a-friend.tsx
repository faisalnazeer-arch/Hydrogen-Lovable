import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { User, Users, Mail, Gift, Trophy, ShoppingCart, Tag, Smile, Plus, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "Refer a Friend — MLS UAE" },
  { name: "description", content: "Refer a friend to MLS and earn rewards." },
];

const YOTPO_GUID = "3zSKLTmmtHC3S0CGw89ppA";
const REFERRAL_INSTANCE_ID = "822349";

const ICON_MAP: Record<string, LucideIcon> = {
  User, Users, Mail, Gift, Trophy, ShoppingCart, Tag, Smile,
};

const PAGE_QUERY = `{
  page: metaobjects(type: "mls_refer_page", first: 1) {
    nodes {
      fields {
        key
        value
        references(first: 10) {
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

function parseSteps(nodes: any[]) {
  return nodes.map((n: any) => {
    const f = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
    return { id: n.id, label: f.label ?? "", description: f.description ?? "", iconName: f.icon_name ?? "User" };
  });
}

function parseFaqs(nodes: any[]) {
  return nodes.map((n: any) => {
    const f = Object.fromEntries(n.fields.map((x: any) => [x.key, x.value]));
    return { id: n.id, question: f.question ?? "", answer: f.answer ?? "" };
  });
}

export async function loader({ context }: LoaderFunctionArgs) {
  const data = await context.adminFetch(PAGE_QUERY);
  const node = data?.page?.nodes?.[0];
  const f = Object.fromEntries((node?.fields ?? []).map((x: any) => [x.key, x]));

  return {
    heroTitle:            f.hero_title?.value              ?? "Refer a Friend & Earn Rewards",
    heroSubtitle:         f.hero_subtitle?.value           ?? "Share MLS with friends and family — you both get rewarded with exclusive discounts on premium halal meat.",
    howToReferTitle:      f.how_to_refer_title?.value      ?? "How can I refer friends?",
    howToGetSteaksTitle:  f.how_to_get_steaks_title?.value ?? "How to get your free steaks?",
    videoUrl:             f.video_url?.value               ?? "https://www.youtube.com/embed/_9VUPq3SxOc",
    videoSectionTitle:    f.video_section_title?.value     ?? "See How It Works",
    referralSteps:        parseSteps(f.referral_steps?.references?.nodes ?? []),
    steaksSteps:          parseSteps(f.steaks_steps?.references?.nodes ?? []),
    faqs:                 parseFaqs(f.faq_items?.references?.nodes ?? []),
  };
}

export default function ReferAFriendPage() {
  const { heroTitle, heroSubtitle, howToReferTitle, howToGetSteaksTitle, videoUrl, videoSectionTitle, referralSteps, steaksSteps, faqs } = useLoaderData<typeof loader>();

  useEffect(() => {
    const existing = document.getElementById("yotpo-loyalty-js");
    if (existing) {
      if ((window as any).yotpoWidgetsContainer) {
        (window as any).yotpoWidgetsContainer.initWidgets();
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "yotpo-loyalty-js";
    script.src = `https://cdn-widgetsrepository.yotpo.com/v1/loader/${YOTPO_GUID}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div
        className="relative overflow-hidden py-14 md:py-20"
        style={{ background: "radial-gradient(ellipse at 60% 40%, #b45309 0%, #1a0a0a 50%, #0a0a0a 100%)" }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute bottom-10 left-20 h-32 w-32 rounded-full bg-amber-600/10 blur-3xl" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative container mx-auto px-4 text-center text-white">
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-white/80 md:text-base">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* Yotpo Referral Widget */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="yotpo-widget-instance" data-yotpo-instance-id={REFERRAL_INSTANCE_ID} />
      </div>

      {/* How can I refer friends? */}
      {referralSteps.length > 0 && (
        <div className="border-t border-border bg-muted/20 py-20">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-12 text-center">
              <span className="inline-block rounded-full bg-crimson/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-crimson">Step by Step</span>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground">{howToReferTitle}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3 mb-6">
              {referralSteps.slice(0, 3).map((step, i) => (
                <StepCard key={step.id} {...step} step={i + 1} />
              ))}
            </div>
            {referralSteps.length > 3 && (
              <div className="grid gap-6 sm:grid-cols-2 sm:max-w-2xl sm:mx-auto">
                {referralSteps.slice(3).map((step, i) => (
                  <StepCard key={step.id} {...step} step={i + 4} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* How to get your free steaks */}
      {steaksSteps.length > 0 && (
        <div className="py-20 bg-[#fdf5f5]">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="mb-12 text-center">
              <span className="inline-block rounded-full bg-crimson/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-crimson">Free Reward</span>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground">{howToGetSteaksTitle}</h2>
            </div>
            <div className="relative grid gap-8 sm:grid-cols-3">
              <div className="absolute top-8 left-[16.67%] right-[16.67%] hidden h-0.5 bg-crimson/20 sm:block" />
              {steaksSteps.map((step, i) => (
                <SteakStepCard key={step.id} {...step} step={i + 1} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <div className="border-t border-border py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">FAQs</h2>
            <FaqList faqs={faqs} />
          </div>
        </div>
      )}

      {/* Video */}
      {videoUrl && (
        <div className="border-t border-border py-20 bg-charcoal">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white/60">Watch</span>
            <h2 className="mt-3 mb-8 font-display text-3xl font-bold text-white">{videoSectionTitle}</h2>
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl" style={{ paddingTop: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={videoUrl}
                title={videoSectionTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function StepCard({ label, description, iconName, step }: { label: string; description: string; iconName: string; step: number }) {
  const Icon = ICON_MAP[iconName] ?? User;
  return (
    <div className="relative flex flex-col items-center text-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-border hover:border-crimson/30 transition-colors">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-crimson text-[11px] font-bold text-white shadow">
        {step}
      </span>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-crimson/10 text-crimson ring-4 ring-crimson/5">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-sm font-bold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function SteakStepCard({ label, description, iconName, step }: { label: string; description: string; iconName: string; step: number }) {
  const Icon = ICON_MAP[iconName] ?? ShoppingCart;
  const desc = description.includes("https://")
    ? description.split(/(https?:\/\/\S+)/).map((part, i) =>
        part.startsWith("http")
          ? <a key={i} href={part} className="text-crimson underline" target="_blank" rel="noopener noreferrer">{part}</a>
          : part
      )
    : description;

  return (
    <div className="relative flex flex-col items-center text-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-border">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-crimson text-[11px] font-bold text-white shadow">
        {step}
      </span>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-crimson text-white shadow-md">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-sm font-bold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function FaqList({ faqs }: { faqs: { id: string; question: string; answer: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
      {faqs.map((faq) => (
        <div key={faq.id}>
          <button
            onClick={() => setOpen(open === faq.id ? null : faq.id)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <span>{faq.question}</span>
            {open === faq.id
              ? <Minus className="h-4 w-4 shrink-0 text-crimson" />
              : <Plus className="h-4 w-4 shrink-0 text-crimson" />
            }
          </button>
          {open === faq.id && (
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
              {faq.answer.includes("/pages/rewards")
                ? <><span>{faq.answer.replace("/pages/rewards", "")}</span><Link to="/pages/rewards" className="text-crimson hover:underline">Browse the MLS Rewards program here.</Link></>
                : faq.answer
              }
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
