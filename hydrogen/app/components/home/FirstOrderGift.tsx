// "A gift in your first box" section — shown above the pricing section

export interface GiftItem {
  emoji: string;
  title: string;
  subtitle: string;
}

export interface FirstOrderGiftData {
  eyebrow: string;
  heading: string;
  description: string;
  items: GiftItem[];
}

export function parseFirstOrderGift(nodes: any[]): FirstOrderGiftData | null {
  const node = nodes[0];
  if (!node) return null;
  const f = Object.fromEntries(node.fields.map((x: any) => [x.key, x]));

  const items: GiftItem[] = [];
  for (let i = 1; i <= 3; i++) {
    const emoji = f[`item_${i}_emoji`]?.value?.trim();
    const title = f[`item_${i}_title`]?.value?.trim();
    if (!title) continue;
    items.push({
      emoji: emoji ?? "🎁",
      title,
      subtitle: f[`item_${i}_subtitle`]?.value?.trim() ?? "",
    });
  }

  return {
    eyebrow:     f["eyebrow"]?.value     ?? "First Order, On Us",
    heading:     f["heading"]?.value     ?? "A gift in your first box.",
    description: f["description"]?.value ?? "",
    items,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  data?: FirstOrderGiftData | null;
}

export function FirstOrderGift({ data }: Props) {
  if (!data || data.items.length === 0) return null;

  return (
    <section className="bg-bone py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">

        {/* ── Centered header ── */}
        <div className="mb-10 text-center md:mb-12">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-8 rounded-full bg-crimson" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              {data.eyebrow}
            </span>
            <span className="h-px w-8 rounded-full bg-crimson" />
          </div>
          <h2 className="font-display mx-auto max-w-xl text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl">
            {data.heading}
          </h2>
          {data.description && (
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-foreground/55 md:text-[15px]">
              {data.description}
            </p>
          )}
        </div>

        {/* ── Gift cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60 md:p-6"
            >
              {/* Top row: emoji + step number */}
              <div className="mb-4 flex items-start justify-between">
                <span className="text-2xl leading-none">{item.emoji}</span>
                <span className="font-display text-4xl font-black leading-none text-foreground/10 md:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Title */}
              <p className="text-[15px] font-bold leading-snug text-foreground md:text-base">
                {item.title}
              </p>

              {/* Subtitle */}
              {item.subtitle && (
                <p className="mt-1 text-[12px] text-foreground/50 md:text-[13px]">
                  {item.subtitle}
                </p>
              )}

              {/* Crimson accent */}
              <div className="mt-5 h-[2px] w-6 rounded-full bg-crimson" />
            </div>
          ))}
        </div>

        </div>
      </div>
    </section>
  );
}
