import { Link } from "react-router";

export interface OriginItem {
  id: string;
  heading: string;
  code: string;
  link: string;
  imageUrl: string | null;
  imageAlt: string;
}

export interface OriginSectionData {
  eyebrow: string;
  heading: string;
  items: OriginItem[];
}

const FALLBACK: OriginSectionData = {
  eyebrow: "From the World's Best Farms",
  heading: "Shop by Origin",
  items: [
    { id: "f1", heading: "AUS",      code: "AU", link: "/search?q=australia",   imageUrl: null, imageAlt: "" },
    { id: "f2", heading: "NZ",       code: "NZ", link: "/search?q=new+zealand", imageUrl: null, imageAlt: "" },
    { id: "f3", heading: "JAPAN",    code: "JP", link: "/search?q=japan",       imageUrl: null, imageAlt: "" },
    { id: "f4", heading: "RSA",      code: "ZA", link: "/search?q=south+africa",imageUrl: null, imageAlt: "" },
    { id: "f5", heading: "USA",      code: "US", link: "/search?q=usa",         imageUrl: null, imageAlt: "" },
    { id: "f6", heading: "PAK",      code: "PK", link: "/search?q=pakistan",    imageUrl: null, imageAlt: "" },
    { id: "f7", heading: "GRASS-FED",code: "🌱", link: "/search?q=grass-fed",   imageUrl: null, imageAlt: "" },
  ],
};

interface Props {
  section?: OriginSectionData | null;
}

export function ShopByOrigin({ section }: Props) {
  const { eyebrow, heading, items } = section ?? FALLBACK;

  return (
    <section className="bg-bone py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            {eyebrow}
          </div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">
            {heading}
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.link}
              className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-crimson hover:shadow-[var(--shadow-card)]"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt || item.heading}
                  className="h-10 w-10 rounded-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <span className="text-2xl font-bold transition-transform group-hover:scale-110" aria-hidden>
                  {item.code}
                </span>
              )}
              <span className="text-center text-[11px] font-bold uppercase tracking-wider">
                {item.heading}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
