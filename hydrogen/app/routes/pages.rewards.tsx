import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "MLS Rewards — Unlock Savings & Rewards" },
  { name: "description", content: "Join MLS Rewards and earn points on every purchase. Redeem for discounts on fresh halal meat delivery." },
];

const YOTPO_GUID = "3zSKLTmmtHC3S0CGw89ppA";

const REWARDS_QUERY = `{
  nodes: metaobjects(type: "mls_rewards_page", first: 1) {
    nodes {
      fields {
        key
        value
        reference {
          ... on MediaImage { image { url altText } }
        }
      }
    }
  }
}`;

const DEFAULTS = {
  heroImage:    null as string | null,
  heroTitle:    "Unlock Savings & Rewards With MLS",
  heroSubtitle: "We value you and this program is built to save you money and upgrade your meat shopping experience.",
};

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const data = await context.adminFetch(REWARDS_QUERY);
    const node = data?.nodes?.nodes?.[0];
    if (!node) return DEFAULTS;
    const f = Object.fromEntries((node.fields as any[]).map((x: any) => [x.key, x]));
    return {
      heroImage:    (f.hero_image?.reference?.image?.url ?? null) as string | null,
      heroTitle:    (f.hero_title?.value   ?? DEFAULTS.heroTitle)    as string,
      heroSubtitle: (f.hero_subtitle?.value ?? DEFAULTS.heroSubtitle) as string,
    };
  } catch {
    return DEFAULTS;
  }
}

export default function RewardsPage() {
  const { heroImage, heroTitle, heroSubtitle } = useLoaderData<typeof loader>();

  useEffect(() => {
    const SCRIPT_ID = "yotpo-loyalty-script";
    let active = true;

    // Swell/Yotpo Loyalty SDK throws "already loaded" if window.swellConfig exists.
    // Clear it + remove any stale script before each mount so the widget always
    // initialises fresh (handles SPA navigation and React Strict Mode dev remounts).
    try { delete (window as any).swellConfig; } catch {}
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://cdn-loyalty.yotpo.com/loader/${YOTPO_GUID}.js`;
    script.async = true;

    // If Strict Mode's cleanup ran before this script executed, clear swellConfig
    // so the live script (from the second mount) can set it without throwing.
    script.addEventListener("load", () => {
      if (!active) try { delete (window as any).swellConfig; } catch {}
    });

    document.head.appendChild(script);

    return () => {
      active = false;
      const s = document.getElementById(SCRIPT_ID);
      if (s) s.remove();
      try { delete (window as any).swellConfig; } catch {}
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden py-24 md:py-36"
        style={heroImage
          ? { backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "radial-gradient(ellipse at 60% 40%, #b45309 0%, #1a0a0a 50%, #0a0a0a 100%)" }
        }
      >
        {/* Bokeh glow overlay */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute top-32 right-40 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
          <div className="absolute bottom-10 left-20 h-32 w-32 rounded-full bg-amber-600/10 blur-3xl" />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative container mx-auto px-4 text-center text-white">
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-white/80 md:text-base">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* ── Yotpo Loyalty Widget ─────────────────────────── */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div
          className="yotpo-widget-instance"
          data-yotpo-instance-id="567647"
        />
      </div>

    </div>
  );
}
