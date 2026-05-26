import { ProductPageShell, type ProductPageShellProps } from "./ProductPageShell";
import { MetafieldSubTabs } from "./SubAccordion";

const METAFIELD_TITLES: Record<string, string> = {
  usage_guide: "What's Inside",
  pairing_suggestions: "Serving Suggestions",
  flavor_profile: "Flavor Profiles",
  ingredients: "Box Contents",
  understanding_rubs: "About This Box",
  mls_rub: "MLS Notes",
  beef_rubs: "Additional Info",
};

export function BoxCollectionsTemplate(props: ProductPageShellProps) {
  const subTabs = (
    <MetafieldSubTabs
      product={props.product}
      metafieldTitles={METAFIELD_TITLES}
      flavorTagClass="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
    />
  );
  const hasContent = Object.keys(METAFIELD_TITLES).some(
    (key) => props.product.metafields?.find((m: any) => m?.key === key)?.value ?? null
  );
  return (
    <ProductPageShell
      {...props}
      templateSuffix="box-collections"
      extraSections={hasContent ? subTabs : undefined}
    />
  );
}