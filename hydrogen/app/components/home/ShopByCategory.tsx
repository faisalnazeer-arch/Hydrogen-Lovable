import { Link } from "react-router";

export interface CategoryItem {
  id: string;
  heading: string;
  link: string;
  imageUrl: string | null;
  imageAlt: string;
}

export interface CategorySectionData {
  eyebrow: string;
  heading: string;
  items: CategoryItem[];
}

const FALLBACK: CategorySectionData = {
  eyebrow: "Browse the Butcher",
  heading: "Shop by Category",
  items: [
    { id: "f1", heading: "Beef",    link: "/collections/all-beef",                      imageUrl: null, imageAlt: "" },
    { id: "f2", heading: "Lamb",    link: "/collections/all-lamb",                      imageUrl: null, imageAlt: "" },
    { id: "f3", heading: "Mutton",  link: "/collections/all-mutton",                    imageUrl: null, imageAlt: "" },
    { id: "f4", heading: "Wagyu",   link: "/collections/australian-wagyu-beef-mb-4-5",  imageUrl: null, imageAlt: "" },
    { id: "f5", heading: "Veal",    link: "/collections/all",                            imageUrl: null, imageAlt: "" },
    { id: "f6", heading: "Ostrich", link: "/collections/all",                            imageUrl: null, imageAlt: "" },
    { id: "f7", heading: "Poultry", link: "/collections/all",                            imageUrl: null, imageAlt: "" },
    { id: "f8", heading: "Sausages",link: "/collections/all",                            imageUrl: null, imageAlt: "" },
  ],
};

const EMOJI: Record<string, string> = {
  beef: "🐂", lamb: "🐑", mutton: "🍖", wagyu: "🥩",
  veal: "🐄", ostrich: "🦃", poultry: "🍗", sausages: "🌭",
};

function emojiFor(heading: string): string {
  return EMOJI[heading.toLowerCase()] ?? "🥩";
}

interface Props {
  section?: CategorySectionData | null;
}

export function ShopByCategory({ section }: Props) {
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
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
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
                <span className="text-3xl transition-transform group-hover:scale-110">
                  {emojiFor(item.heading)}
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {item.heading}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
