import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "Customer Reviews — MLS UAE" },
  { name: "description", content: "Read genuine customer reviews for MLS UAE. Over 7000 verified buyers share their experience with our premium halal meat." },
];

const JDGM_CDN = "https://cdn.shopify.com/extensions/019e9257-9cd0-7747-929e-9d784ac61d90/judgeme-556/assets";

const METAFIELD_QUERY = `{
  shop {
    settings:     metafield(namespace: "judgeme", key: "settings")           { value }
    miracle:      metafield(namespace: "judgeme", key: "html_miracle_0")     { value }
    header:       metafield(namespace: "judgeme", key: "all_reviews_header") { value }
    reviews0:     metafield(namespace: "judgeme", key: "all_reviews_0")      { value }
    reviews1:     metafield(namespace: "judgeme", key: "all_reviews_1")      { value }
    count:        metafield(namespace: "judgeme", key: "all_reviews_count")  { value }
    rating:       metafield(namespace: "judgeme", key: "all_reviews_rating") { value }
  }
}`;

export async function loader({ context }: LoaderFunctionArgs) {
  const data = await context.adminFetch(METAFIELD_QUERY);
  const shop = data?.shop ?? {};

  return {
    settings:  shop.settings?.value  ?? "",
    miracle:   shop.miracle?.value   ?? "",
    header:    shop.header?.value    ?? "",
    reviews0:  shop.reviews0?.value  ?? "",
    reviews1:  shop.reviews1?.value  ?? "",
    count:     Number(shop.count?.value  ?? 0),
    rating:    Number(shop.rating?.value ?? 0),
  };
}

export default function CustomerReviewsPage() {
  const { settings, miracle, header, reviews0, reviews1, count, rating } = useLoaderData<typeof loader>();

  useEffect(() => {
    // Load Judge.me CSS for styling
    const cssFiles = [
      "https://cdn.judge.me/shopify_v2.css",
      `${JDGM_CDN}/widget_v3_theme_leex.css`,
      `${JDGM_CDN}/shopify_v2.css`,
    ];
    cssFiles.forEach((href) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });

    // Add jdgm--leex-done-setup to all reviews so CSS doesn't hide them
    document.querySelectorAll(".jdgm-rev").forEach((el) => {
      el.classList.add("jdgm--leex-done-setup");
    });
  }, []);

  const reviewsHtml = reviews0 + reviews1;
  const hasData = !!header;

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div
        className="relative overflow-hidden py-20 md:py-28"
        style={{ background: "linear-gradient(135deg, #1a0a0a 0%, #3d0000 50%, #1a0a0a 100%)" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container mx-auto px-4 text-center text-white">
          <span className="mb-4 inline-block rounded-full border border-crimson/40 bg-crimson/20 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            Verified Reviews
          </span>
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">
            Take our customers' words<br className="hidden md:block" /> for our products
          </h1>
          {count > 0 && (
            <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
              {rating.toFixed(2)} ★ from {count.toLocaleString()} verified buyers
            </p>
          )}
        </div>
      </div>

      {/* Judge.me Widget */}
      <div className="container mx-auto max-w-5xl px-4 py-14">
        {hasData ? (
          <>
            {/* Judge.me settings + miracle styles */}
            <div dangerouslySetInnerHTML={{ __html: settings + miracle }} />

            {/* Pre-rendered reviews from Shopify metafields */}
            <article className="jdgm-widget jdgm-all-reviews-widget"
              dangerouslySetInnerHTML={{
                __html: header + `<div class="jdgm-all-reviews__body">${reviewsHtml}</div>`,
              }}
            />
          </>
        ) : (
          <p className="text-center text-muted-foreground">No reviews found.</p>
        )}
      </div>
    </div>
  );
}
