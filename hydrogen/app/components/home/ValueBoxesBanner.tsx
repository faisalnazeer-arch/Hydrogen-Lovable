import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import valueImg from "@/assets/value-boxes.jpg";

export interface ValueBannerData {
  eyebrow: string;
  heading: string;
  body: string;
  btn1Label: string;
  btn1Link: string;
  btn2Label: string;
  btn2Link: string;
  imageUrl: string | null;
  imageAlt: string;
}

const FALLBACK: ValueBannerData = {
  eyebrow: "Curated by our butchers",
  heading: "Value Meat Boxes",
  body: "Save more on weekly essentials. Mix beef, lamb, mince and burgers in one curated box — delivered fresh.",
  btn1Label: "Shop Boxes",
  btn1Link: "/collections/box-collection",
  btn2Label: "Build Your Own",
  btn2Link: "/collections/build-box",
  imageUrl: null,
  imageAlt: "Curated meat boxes",
};

interface Props {
  banner?: ValueBannerData | null;
}

export function ValueBoxesBanner({ banner }: Props) {
  const d = banner ?? FALLBACK;
  const bgSrc = d.imageUrl ?? (valueImg as string);

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="relative overflow-hidden rounded-xl bg-charcoal text-charcoal-foreground">
        <img
          src={bgSrc}
          alt={d.imageAlt || d.heading}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-crimson/90 via-crimson/60 to-transparent" />
        <div className="relative grid min-h-[280px] items-center px-8 py-12 md:grid-cols-2 md:px-12">
          <div>
            {d.eyebrow && (
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                {d.eyebrow}
              </span>
            )}
            <h3 className="mt-2 font-display text-3xl font-extrabold leading-tight md:text-4xl">
              {d.heading}
            </h3>
            {d.body && (
              <p className="mt-3 max-w-md text-off-white/85">{d.body}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {d.btn1Label && d.btn1Link && (
                <Link to={d.btn1Link}>
                  <Button size="lg" className="bg-off-white text-charcoal hover:bg-gold hover:text-gold-foreground">
                    {d.btn1Label}
                  </Button>
                </Link>
              )}
              {d.btn2Label && d.btn2Link && (
                <Link to={d.btn2Link}>
                  <Button size="lg" variant="outline" className="border-off-white bg-transparent text-off-white hover:bg-off-white hover:text-charcoal">
                    {d.btn2Label}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
