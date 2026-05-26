import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  usage_guide: "Cooking Guide",
  pairing_suggestions: "Best Pairings",
  flavor_profile: "Flavor Profile",
  ingredients: "What's Included",
  understanding_rubs: "About This Cut",
  mls_rub: "MLS Notes",
  beef_rubs: "Additional Info",
};

export function WholeCutsTemplate(props: ProductPageShellProps) {
  const subTabs = (
    <MetafieldSubTabs
      product={props.product}
      metafieldTitles={METAFIELD_TITLES}
      flavorTagClass="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    />
  );
  const hasContent = Object.keys(METAFIELD_TITLES).some(
    (key) => props.product.metafields?.find((m: any) => m?.key === key)?.value ?? null
  );
  return (
    <ProductPageShell
      {...props}
      templateSuffix="whole-cuts"
      extraSections={hasContent ? subTabs : undefined}
    />
  );
}