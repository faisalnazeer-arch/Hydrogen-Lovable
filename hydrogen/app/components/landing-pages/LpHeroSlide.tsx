import { Link } from "react-router";

function getField(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.value ?? null;
}

function getImageUrl(fields: any[], key: string): string | null {
  return fields?.find((f: any) => f.key === key)?.reference?.image?.url ?? null;
}

interface ParsedSlide {
  desktopImage: string;
  mobileImage: string | null;
  ctaUrl: string | null;
  scrollTarget: string | null;
}

function toRelative(raw: string): string {
  try {
    const u = new URL(raw);
    return u.pathname + u.search + u.hash;
  } catch {
    return raw; // already relative
  }
}

function parseSlide(node: any): ParsedSlide | null {
  const f = node.fields ?? [];
  const desktopImage = getImageUrl(f, "desktop_image");
  if (!desktopImage) return null;

  const scrollTarget = getField(f, "scroll_target");

  let ctaUrl: string | null = null;
  if (!scrollTarget) {
    const ctaLinkField = f.find((x: any) => x.key === "cta_link");

    // 1. page_reference / collection_reference resolved in GraphQL query
    const refUrl: string | null =
      ctaLinkField?.reference?.url ??
      (ctaLinkField?.reference?.handle
        ? `/collections/${ctaLinkField.reference.handle}`
        : null);

    if (refUrl) {
      ctaUrl = toRelative(refUrl);
    } else {
      // 2. url / link / text field stored as plain URL or JSON {"url":"..."}
      const rawValue = ctaLinkField?.value ?? getField(f, "cta_url");
      if (rawValue) {
        try {
          ctaUrl = JSON.parse(rawValue)?.url ?? rawValue;
        } catch {
          ctaUrl = rawValue;
        }
        // Strip hostname so internal links stay in-app
        ctaUrl = toRelative(ctaUrl!);
      }
    }
  }

  return {
    desktopImage,
    mobileImage: getImageUrl(f, "mobile_image"),
    ctaUrl,
    scrollTarget,
  };
}

export function LpHeroSlide({ node }: { node: any }) {
  const slide = parseSlide(node);
  if (!slide) return null;

  const imgContent = (
    <>
      <img
        src={slide.desktopImage}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className={slide.mobileImage ? "hidden w-full md:block" : "w-full"}
      />
      {slide.mobileImage && (
        <img
          src={slide.mobileImage}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="w-full md:hidden"
        />
      )}
    </>
  );

  if (slide.scrollTarget) {
    return (
      <section className="w-full overflow-hidden">
        <button
          type="button"
          className="block w-full cursor-pointer"
          onClick={() => {
            const el = document.getElementById(slide.scrollTarget!);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {imgContent}
        </button>
      </section>
    );
  }

  if (!slide.ctaUrl) {
    return <section className="w-full overflow-hidden">{imgContent}</section>;
  }

  return (
    <section className="w-full overflow-hidden">
      <Link to={slide.ctaUrl} className="block">
        {imgContent}
      </Link>
    </section>
  );
}
