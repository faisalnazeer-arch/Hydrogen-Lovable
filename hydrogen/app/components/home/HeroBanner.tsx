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
    <div
      className="relative w-full min-h-[320px] sm:min-h-[420px] md:min-h-[560px] lg:min-h-[680px]"
      style={{ flexShrink: 0 }}
    >
      {slide.mobileImage && (
        <img
          src={slide.mobileImage.url}
          alt={slide.mobileImage.altText ?? ""}
          draggable={false}
          className={cn(
            "pointer-events-none block w-full select-none h-full object-cover absolute inset-0",
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
            "pointer-events-none w-full select-none h-full object-cover absolute inset-0",
            slide.mobileImage ? "hidden md:block" : "block",
          )}
        />
      )}
      {/* Overlay and content sit on top via absolute */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          hasContent
            ? "bg-gradient-to-r from-charcoal/80 via-charcoal/40 to-transparent"
            : "bg-black/10",
        )}
      />
      <div className="pointer-events-none absolute inset-0">
        {hasContent ? <DynamicContent slide={slide} active={active} /> : null}
      </div>
    </div>
  );
}

// ── Dynamic metaobject content ─────────────────────────────────────────────

function DynamicContent({ slide, active }: { slide: HeroSlide; active: boolean }) {
  return (
    <div className="flex h-full items-center">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-xl"
        >
          {slide.content && (
            <p className="text-base font-medium leading-relaxed text-off-white drop-shadow md:text-lg">
              {slide.content}
            </p>
          )}
          {slide.buttonText && slide.buttonUrl && (
            <div className="pointer-events-auto mt-6">
              <Link to={slide.buttonUrl}>
                <Button size="lg" className="bg-crimson text-crimson-foreground hover:bg-rich-red">
                  {slide.buttonText}
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
