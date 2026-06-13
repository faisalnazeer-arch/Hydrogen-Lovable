import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface ShopifyImage {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

interface HeroSlide {
  id: string;
  desktopImage: ShopifyImage | null;
  mobileImage: ShopifyImage | null;
  content: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}

interface RawMetaobjectNode {
  id: string;
  fields: Array<{
    key: string;
    value: string | null;
    type: string;
    reference?: { image?: ShopifyImage } | null;
  }>;
}

// ── Parser ─────────────────────────────────────────────────────────────────

function parseSlides(nodes: RawMetaobjectNode[]): HeroSlide[] {
  return nodes
    .map((node) => {
      const fieldMap = Object.fromEntries(node.fields.map((f) => [f.key, f]));

      const desktopImage =
        fieldMap["desktop_image"]?.reference?.image ??
        fieldMap["hero_image_1"]?.reference?.image ??
        null;

      const mobileImage =
        fieldMap["mobile_image"]?.reference?.image ??
        fieldMap["hero_image_2"]?.reference?.image ??
        null;

      if (!desktopImage && !mobileImage) return null;

      let buttonUrl: string | null = null;
      const rawUrl = fieldMap["button_url"]?.value ?? null;
      if (rawUrl) {
        try {
          const parsed = JSON.parse(rawUrl);
          buttonUrl = parsed.url ?? rawUrl;
        } catch {
          buttonUrl = rawUrl;
        }
      }

      return {
        id: node.id,
        desktopImage,
        mobileImage,
        content: fieldMap["content"]?.value ?? null,
        buttonText: fieldMap["button_text"]?.value ?? null,
        buttonUrl,
      } satisfies HeroSlide;
    })
    .filter((s): s is HeroSlide => s !== null);
}

// ── Main component ─────────────────────────────────────────────────────────

interface HeroBannerProps {
  slides?: RawMetaobjectNode[];
}

const AUTOPLAY_MS = 5000;

export function HeroBanner({ slides: rawSlides = [] }: HeroBannerProps) {
  const parsed = parseSlides(rawSlides);
  if (parsed.length === 0) return null;
  const slides = parsed;
  const count = slides.length;
  const isSingle = count === 1;

  const [current, setCurrent] = useState(0);

  const goPrev = () => setCurrent((c) => (c - 1 + count) % count);
  const goNext = () => setCurrent((c) => (c + 1) % count);
  const goTo = (i: number) => setCurrent(i);

  // Stable ref so interval never re-creates
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  useEffect(() => {
    if (isSingle) return;
    const id = setInterval(() => goNextRef.current(), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isSingle]);

  return (
    <section className="relative bg-charcoal">
      {/* overflow-hidden on the immediate wrapper ensures translateX clips correctly */}
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${current * 100}%)`,
            transition: "transform 500ms ease-in-out",
            willChange: "transform",
          }}
        >
          {slides.map((slide, i) => (
            <SlideItem key={slide.id} slide={slide} active={i === current} />
          ))}
        </div>
      </div>

      {/* ── Arrows ── */}
      {!isSingle && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/60 text-white transition-all hover:bg-black/80 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/60 text-white transition-all hover:bg-black/80 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      )}

      {/* ── Dot indicators ── */}
      {!isSingle && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "cursor-pointer rounded-full transition-all duration-300 ease-out",
                i === current
                  ? "h-2.5 w-7 bg-white shadow-md"
                  : "h-2 w-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Slide ──────────────────────────────────────────────────────────────────

function SlideItem({ slide, active }: { slide: HeroSlide; active: boolean }) {
  const hasContent = slide.content || slide.buttonText;

  return (
    <div className="relative w-full" style={{ flexShrink: 0 }}>
      {/* Images are natural-size (no cropping) — the image height drives the slide height */}
      {slide.mobileImage && (
        <img
          src={slide.mobileImage.url}
          alt={slide.mobileImage.altText ?? ""}
          draggable={false}
          className={cn(
            "pointer-events-none block w-full select-none",
            slide.desktopImage ? "md:hidden" : "",
          )}
        />
      )}
      {slide.desktopImage && (
        <img
          src={slide.desktopImage.url}
          alt={slide.desktopImage.altText ?? ""}
          draggable={false}
          className={cn(
            "pointer-events-none w-full select-none",
            slide.mobileImage ? "hidden md:block" : "block",
          )}
        />
      )}

      {/* Overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          hasContent
            ? "bg-gradient-to-r from-charcoal/80 via-charcoal/40 to-transparent"
            : "bg-black/10",
        )}
      />

      {/* Content */}
      <div className="pointer-events-none absolute inset-0">
        {hasContent ? <DynamicContent slide={slide} active={active} /> : null}
      </div>
    </div>
  );
}

// ── Dynamic metaobject content ─────────────────────────────────────────────

function DynamicContent({ slide, active }: { slide: HeroSlide; active: boolean }) {
  // Split on "—" so "Australian Wagyu — Butcher's Cut Series" renders as eyebrow + headline
  const parts = slide.content?.split(/\s*—\s*/) ?? [];
  const eyebrow = parts.length > 1 ? parts[0] : null;
  const headline = parts.length > 1 ? parts.slice(1).join(" — ") : parts[0] ?? null;

  return (
    <div className="flex h-full items-center">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-off-white backdrop-blur-sm"
            >
              <span className="h-1 w-1 rounded-full bg-crimson" />
              {eyebrow}
            </motion.span>
          )}
          {headline && (
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-3xl font-black leading-[1.1] tracking-tight text-off-white drop-shadow-lg md:text-5xl lg:text-6xl"
            >
              {headline}
            </motion.h1>
          )}
          {slide.buttonText && slide.buttonUrl && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
              className="pointer-events-auto mt-8"
            >
              <Link to={slide.buttonUrl}>
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-crimson px-8 text-base font-bold text-crimson-foreground shadow-lg transition-all duration-200 hover:bg-rich-red hover:scale-105 hover:shadow-xl"
                >
                  {slide.buttonText}
                </Button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
