import { Truck, RefreshCw, ShieldCheck, Award } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface TrustBadge {
  id: string;
  handle: string | null;
  iconUrl: string | null;
  heading: string | null;
  subTitle: string | null;
}

interface RawMetaobjectNode {
  id: string;
  handle?: string | null;
  fields: Array<{
    key: string;
    value: string | null;
    reference?: { image?: { url: string } } | null;
  }>;
}

const DEFAULT_ICONS = [RefreshCw, Truck, ShieldCheck, Award];

// ── Parser ─────────────────────────────────────────────────────────────────

function parseBadges(nodes: RawMetaobjectNode[]): TrustBadge[] {
  return nodes
    .map((node) => {
      const fieldMap = Object.fromEntries(node.fields.map((f) => [f.key, f]));
      const heading = fieldMap["heading"]?.value ?? null;
      const subTitle = fieldMap["sub_title"]?.value ?? null;

      if (!heading && !subTitle) return null;

      return {
        id: node.id,
        handle: node.handle ?? null,
        iconUrl: fieldMap["icon"]?.reference?.image?.url ?? null,
        heading,
        subTitle,
      } satisfies TrustBadge;
    })
    .filter((b): b is TrustBadge => b !== null);
}

// ── Component ──────────────────────────────────────────────────────────────

interface TrustBadgesProps {
  badges?: RawMetaobjectNode[];
}

export function TrustBadges({ badges: rawBadges = [] }: TrustBadgesProps) {
  const parsed = parseBadges(rawBadges);

  return (
    <section className="border-b border-border bg-bone">
      <div className="container mx-auto grid grid-cols-2 gap-3 px-4 py-6 md:grid-cols-4 md:gap-6 md:py-8">
        {parsed.map((badge, i) => (
          <DynamicBadge key={badge.id} badge={badge} index={i} />
        ))}
      </div>
    </section>
  );
}

// ── Dynamic badge — text from Shopify API (T Lab syncs translations here) ─

function DynamicBadge({ badge, index }: { badge: TrustBadge; index: number }) {
  const FallbackIcon = DEFAULT_ICONS[index % DEFAULT_ICONS.length];
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-background/60 p-4 text-center md:flex-row md:gap-3 md:bg-transparent md:p-0 md:text-start">
      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson md:h-12 md:w-12">
        {badge.iconUrl ? (
          <img src={badge.iconUrl} alt={badge.heading ?? ""} className="h-6 w-6 object-contain" />
        ) : (
          <FallbackIcon className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        {badge.heading && (
          <div className="font-display text-[13px] font-bold leading-tight md:text-sm">
            {badge.heading}
          </div>
        )}
        {badge.subTitle && (
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground md:text-xs">
            {badge.subTitle}
          </div>
        )}
      </div>
    </div>
  );
}
