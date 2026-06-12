import { Truck, RefreshCw, ShieldCheck, Award } from "lucide-react";

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

const DEFAULT_ICONS = [Truck, ShieldCheck, Award, RefreshCw];

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

interface TrustBadgesProps {
  badges?: RawMetaobjectNode[];
}

export function TrustBadges({ badges: rawBadges = [] }: TrustBadgesProps) {
  const parsed = parseBadges(rawBadges);
  if (parsed.length === 0) return null;

  return (
    <section className="border-b border-border bg-background py-6 md:py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 md:gap-x-8">
          {parsed.map((badge, i) => (
            <div
              key={badge.id}
              className={
                parsed.length % 2 !== 0 && i === parsed.length - 1
                  ? "col-span-2 flex justify-center md:col-span-1 md:justify-start"
                  : ""
              }
            >
              <BadgeItem badge={badge} index={i} total={parsed.length} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BadgeItem({
  badge,
  index,
  total,
}: {
  badge: TrustBadge;
  index: number;
  total: number;
}) {
  const FallbackIcon = DEFAULT_ICONS[index % DEFAULT_ICONS.length];
  const showDivider = index < total - 1;

  return (
    <div className="relative flex items-center gap-4">
      {/* Icon */}
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-crimson/10 text-crimson shadow-sm">
        {badge.iconUrl ? (
          <img
            src={badge.iconUrl}
            alt={badge.heading ?? ""}
            className="h-6 w-6 object-contain"
            style={{ filter: "invert(15%) sepia(80%) saturate(400%) hue-rotate(340deg)" }}
          />
        ) : (
          <FallbackIcon className="h-6 w-6" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0">
        {badge.heading && (
          <div className="text-sm font-bold leading-tight text-foreground">{badge.heading}</div>
        )}
        {badge.subTitle && (
          <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{badge.subTitle}</div>
        )}
      </div>

      {/* Vertical divider — desktop only */}
      {showDivider && (
        <span className="absolute -right-3 top-1/2 hidden h-8 w-px -translate-y-1/2 bg-border md:block" />
      )}
    </div>
  );
}
