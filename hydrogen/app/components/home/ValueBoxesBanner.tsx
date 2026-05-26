import { Link } from "react-router";
import { Button } from "@/components/ui/button";

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

interface Props {
  banner?: ValueBannerData | null;
}

export function ValueBoxesBanner({ banner }: Props) {
  if (!banner || !banner.heading) return null;

  return (
    <section className="container mx-auto px-4 py-6 md:py-12">
      <div className="relative overflow-hidden rounded-xl bg-charcoal text-charcoal-foreground">
        {banner.imageUrl && (
          <img
            src={banner.imageUrl}
            alt={banner.imageAlt || banner.heading}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-crimson/90 via-crimson/60 to-transparent" />
        <div className="relative grid min-h-[280px] items-center px-8 py-12 md:grid-cols-2 md:px-12">
          <div>
            {banner.eyebrow && (
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{banner.eyebrow}</span>
            )}
            <h3 className="mt-2 font-display text-3xl font-extrabold leading-tight md:text-4xl">{banner.heading}</h3>
            {banner.body && <p className="mt-3 max-w-md text-off-white/85">{banner.body}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {banner.btn1Label && banner.btn1Link && (
                <Link to={banner.btn1Link}>
                  <Button size="lg" className="bg-off-white text-charcoal hover:bg-gold hover:text-gold-foreground">
                    {banner.btn1Label}
                  </Button>
                </Link>
              )}
              {banner.btn2Label && banner.btn2Link && (
                <Link to={banner.btn2Link}>
                  <Button size="lg" variant="outline" className="border-off-white bg-transparent text-off-white hover:bg-off-white hover:text-charcoal">
                    {banner.btn2Label}
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
