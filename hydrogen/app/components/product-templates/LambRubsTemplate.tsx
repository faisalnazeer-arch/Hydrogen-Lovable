import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  mls_rub: "MLS Rub",
  beef_rubs: "Rub Details",
  usage_guide: "How to Apply",
  pairing_suggestions: "Best Lamb Dishes for This Rub",
  flavor_profile: "Flavor Profile",
  ingredients: "Ingredients",
  understanding_rubs: "About This Rub",
};

export function LambRubsTemplate(props: ProductPageShellProps) {
  const subTabs = (
    <MetafieldSubTabs
      product={props.product}
      metafieldTitles={METAFIELD_TITLES}
      flavorTagClass="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    />
  );
  const hasContent = Object.keys(METAFIELD_TITLES).some(
    (key) => props.product.metafields?.find((m: any) => m?.key === key)?.value ?? null
  );
  return (
    <ProductPageShell
      {...props}
      templateSuffix="lamb-rubs"
      extraSections={hasContent ? subTabs : undefined}
    />
  );
}