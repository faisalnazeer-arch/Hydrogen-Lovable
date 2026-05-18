import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";

function getMeta(product: any, key: string): string | null {
  return product.metafields?.find((m: any) => m?.key === key)?.value ?? null;
}

function ChickenRubsExtraSections({ product }: { product: any }) {
  const usageGuide = getMeta(product, "usage_guide");
  const pairing = getMeta(product, "pairing_suggestions");
  const flavorProfile = getMeta(product, "flavor_profile");
  const ingredients = getMeta(product, "ingredients");

  if (!usageGuide && !pairing && !flavorProfile && !ingredients) return null;

  return (
    <div className="container mx-auto px-4 pb-10">
      <div className="grid gap-5 md:grid-cols-2">
        {usageGuide && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              How to Apply
            </h3>
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: usageGuide }}
            />
          </div>
        )}

        {pairing && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Best Chicken Dishes for This Rub
            </h3>
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: pairing }}
            />
          </div>
        )}

        {flavorProfile && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Flavor Profile
            </h3>
            <div className="flex flex-wrap gap-2">
              {flavorProfile.split(",").map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-crimson/10 px-3 py-1 text-xs font-semibold text-crimson"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {ingredients && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ingredients
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{ingredients}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChickenRubsTemplate(props: ProductPageShellProps) {
  return (
    <ProductPageShell
      {...props}
      extraSections={<ChickenRubsExtraSections product={props.product} />}
    />
  );
}
