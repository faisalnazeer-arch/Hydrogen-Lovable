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

interface Props {
  section?: CategorySectionData | null;
}

export function ShopByCategory({ section }: Props) {
  if (!section || section.items.length === 0) return null;

  return (
    <section className="bg-bone py-6 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-4 text-center md:mb-6">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">{section.eyebrow}</div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">{section.heading}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] md:grid md:grid-cols-8">
          {section.items.map((item) => (
            <Link
              key={item.id}
              to={item.link}
              className="group flex w-[72px] flex-shrink-0 flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 transition-all hover:-translate-y-1 hover:border-crimson hover:shadow-[var(--shadow-card)] md:w-auto md:p-4"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt || item.heading}
                  className="h-9 w-9 rounded-full object-cover transition-transform group-hover:scale-110 md:h-10 md:w-10"
                />
              ) : (
                <span className="text-2xl transition-transform group-hover:scale-110 md:text-3xl">🥩</span>
              )}
              <span className="text-[10px] font-semibold uppercase leading-tight tracking-wider md:text-xs">{item.heading}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
