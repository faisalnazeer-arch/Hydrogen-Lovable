import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export interface PromoSideBySideData {
  badgeText: string | null;
  heading: string;
  bodyText: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

export function parsePromoSideBySide(nodes: any[]): PromoSideBySideData | null {
  const node = nodes[0];
  if (!node) return null;
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));
  const heading = f["heading"]?.value;
  if (!heading) return null;
  return {
    badgeText:   f["badge_text"]?.value   ?? null,
    heading,
    bodyText:    f["body_text"]?.value    ?? null,
    buttonLabel: f["button_label"]?.value ?? null,
    buttonUrl:   f["button_url"]?.value   ?? null,
    imageUrl:    f["image"]?.reference?.image?.url    ?? null,
    imageAlt:    f["image"]?.reference?.image?.altText ?? null,
  };
}

interface PromoSideBySideProps {
  promo?: PromoSideBySideData | null;
}

export function PromoSideBySide({ promo }: PromoSideBySideProps) {
  if (!promo) return null;

  return (
    <section className="container mx-auto px-4 py-6 md:py-12">
      <div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] md:grid-cols-2">
        <div className="flex flex-col justify-center gap-3 p-5 md:gap-4 md:p-12">
          {promo.badgeText && (
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{promo.badgeText}</span>
          )}
          <h3 className="font-display text-2xl font-extrabold leading-tight md:text-4xl">{promo.heading}</h3>
          {promo.bodyText && <p className="text-sm text-muted-foreground md:text-base">{promo.bodyText}</p>}
          {promo.buttonLabel && promo.buttonUrl && (
            <div>
              <Link to={promo.buttonUrl}>
                <Button size="sm" className="bg-crimson text-crimson-foreground hover:bg-rich-red md:text-sm md:h-10 md:px-6">
                  {promo.buttonLabel}
                </Button>
              </Link>
            </div>
          )}
        </div>
        {promo.imageUrl && (
          <div className="relative min-h-[200px] bg-charcoal md:min-h-0">
            <img
              src={promo.imageUrl}
              alt={promo.imageAlt ?? promo.heading}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
