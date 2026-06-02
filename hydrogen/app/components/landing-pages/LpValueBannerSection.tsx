import { ValueBoxesBanner, type ValueBannerData } from "~/components/home/ValueBoxesBanner";

function getField(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.value ?? null;
}

function getImageUrl(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.reference?.image?.url ?? null;
}

export function LpValueBannerSection({ node }: { node: any }) {
  const f: any[] = node.fields ?? [];

  const banner: ValueBannerData = {
    eyebrow: getField(f, "eyebrow") ?? "",
    heading: getField(f, "heading") ?? "",
    body: getField(f, "body") ?? "",
    btn1Label: getField(f, "btn1_label") ?? getField(f, "cta_text") ?? "",
    btn1Link: getField(f, "btn1_link") ?? getField(f, "cta_url") ?? "",
    btn2Label: getField(f, "btn2_label") ?? "",
    btn2Link: getField(f, "btn2_link") ?? "",
    imageUrl: getImageUrl(f, "image") ?? getImageUrl(f, "background_image") ?? null,
    imageAlt: getField(f, "image_alt") ?? getField(f, "heading") ?? "",
  };

  return <ValueBoxesBanner banner={banner} />;
}