import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  beef_rubs: "Beef Rubs",
  mls_rub: "MLS Rub",
  usage_guide: "How to Apply",
  pairing_suggestions: "Best Beef Cuts for This Rub",
  flavor_profile: "Flavor Profile",
  ingredients: "Ingredients",
  understanding_rubs: "About This Rub",
};

export function BeefRubsTemplate(props: ProductPageShellProps) {
  const subTabs = (
    <MetafieldSubTabs
      product={props.product}
      metafieldTitles={METAFIELD_TITLES}
      flavorTagClass="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    />
  );
  const hasContent = Object.keys(METAFIELD_TITLES).some(
    (key) => props.product.metafields?.find((m: any) => m?.key === key)?.value ?? null
  );
  return (
    <ProductPageShell
      {...props}
      templateSuffix="beef-rubs"
      extraSections={hasContent ? subTabs : undefined}
    />
  );
}