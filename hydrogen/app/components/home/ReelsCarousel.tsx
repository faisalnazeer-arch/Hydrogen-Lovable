import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useLocalePath } from "@/stores/localeStore";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Volume2, VolumeX, ChevronUp, ChevronDown, ShoppingBag } from "lucide-react";
import {
  formatPrice,
  shopifyImageUrl,
  type ReelProduct,
} from "@/lib/shopify";
import { Button } from "@/components/ui/button";
import { HScroller } from "./HScroller";
import { cn } from "@/lib/utils";


export function ReelsCarousel({ reels, label = "Watch & Shop", heading = "MLS Reels" }: { reels: ReelProduct[]; label?: string; heading?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Start with original order (same on server + client) then shuffle after hydration
  const [shuffled, setShuffled] = useState<ReelProduct[]>(reels);

  useEffect(() => {
    const arr = [...reels];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffled(arr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (shuffled.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-4 text-center md:mb-5">
        <div className="mb-1.5 flex items-center justify-center gap-3">
          <span className="h-px w-6 rounded-full bg-crimson" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">{label}</p>
          <span className="h-px w-6 rounded-full bg-crimson" />
        </div>
        <h2 className="font-display text-2xl font-bold leading-snug tracking-tight md:text-3xl">{heading}</h2>
      </div>

      <HScroller>
        {shuffled.map((r, i) => (
          <ReelCard key={r.id} reel={r} onOpen={() => setActiveIndex(i)} />
        ))}
      </HScroller>

      <AnimatePresence>
        {activeIndex !== null && (
          <ReelsPlayer
            reels={shuffled}
            startIndex={activeIndex}
            onClose={() => setActiveIndex(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ReelCard({ reel: r, onOpen }: { reel: ReelProduct; onOpen: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <button
      onClick={onOpen}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative aspect-[3/4] w-[76vw] flex-shrink-0 snap-start overflow-hidden rounded-xl bg-muted transition-transform hover:-translate-y-1 md:aspect-[9/16] md:w-[260px]"
    >
      {/* Poster image */}
      {r.poster && (
        <img
          src={shopifyImageUrl(r.poster, 400)}
          alt={r.title}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${r.videoUrl ? "group-hover:opacity-0" : ""}`}
        />
      )}
      {/* Hover video */}
      {r.videoUrl && (
        <video
          ref={videoRef}
          src={r.videoUrl}
          muted
          playsInline
          loop
          preload="none"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/10 to-transparent" />
      <div className="absolute inset-x-2 top-2 text-left">
        <div className="line-clamp-2 text-[11px] font-semibold leading-tight text-off-white">{r.title}</div>
        <div className="mt-0.5 text-[10px] font-bold text-crimson-foreground">
          {formatPrice(r.price.amount, r.price.currencyCode)}
        </div>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-off-white/90 text-charcoal shadow-md transition-all duration-300 group-hover:scale-110 group-hover:opacity-0">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
      </div>
    </button>
  );
}

function ReelsPlayer({
  reels,
  startIndex,
  onClose,
}: {
  reels: ReelProduct[];
  startIndex: number;
  onClose: () => void;
}) {
  const lp = useLocalePath();
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reel = reels[index];

  // Autoplay on change
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {/* autoplay blocked */});
  }, [index]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIndex((i) => Math.min(reels.length - 1, i + 1));
      if (e.key === "ArrowUp") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [reels.length, onClose]);

  const next = () => setIndex((i) => Math.min(reels.length - 1, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  if (!reel) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-charcoal/95 backdrop-blur"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative h-[88vh] max-h-[800px] aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {reel.videoUrl ? (
          <video
            ref={videoRef}
            key={reel.id}
            src={reel.videoUrl}
            poster={reel.poster ?? undefined}
            playsInline
            autoPlay
            loop
            muted={muted}
            className="h-full w-full object-cover"
          />
        ) : reel.embedUrl ? (
          <iframe
            key={reel.id}
            src={`${reel.embedUrl}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1`}
            allow="autoplay; encrypted-media"
            className="h-full w-full"
          />
        ) : null}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 to-transparent" />

        {/* Top-right controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {reel.videoUrl && (
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
              className="grid h-10 w-10 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Up/Down navigation */}
        <button
          type="button"
          aria-label="Previous reel"
          onClick={prev}
          disabled={index === 0}
          className={cn(
            "absolute left-1/2 top-3 -translate-x-1/2 grid h-9 w-9 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20",
            index === 0 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next reel"
          onClick={next}
          disabled={index === reels.length - 1}
          className={cn(
            "absolute bottom-24 left-1/2 -translate-x-1/2 grid h-9 w-9 place-items-center rounded-full bg-off-white/10 text-off-white hover:bg-off-white/20",
            index === reels.length - 1 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronDown className="h-5 w-5" />
        </button>

        {/* Bottom info + CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="mb-2 line-clamp-2 text-sm font-semibold text-off-white">
            {reel.title}
          </div>
          <div className="mb-3 font-display text-xl font-bold text-off-white">
            {formatPrice(reel.price.amount, reel.price.currencyCode)}
          </div>
          <Button
            asChild
            className="w-full bg-crimson text-crimson-foreground hover:bg-rich-red"
            onClick={onClose}
          >
            <Link to={lp(`/products/${reel.handle}`)}>
              <ShoppingBag className="mr-2 h-4 w-4" /> Shop this
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
