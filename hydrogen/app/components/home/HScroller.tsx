import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HScrollerProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
}

/**
 * Modern horizontal scroller: snap, hidden scrollbar, floating arrows,
 * edge gradient fades. RTL-aware via document direction.
 */
export function HScroller({ children, className }: HScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Use abs to handle RTL where scrollLeft can be negative
    const left = Math.abs(el.scrollLeft);
    setCanPrev(left > 4);
    setCanNext(left < max - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const isRtl =
      typeof document !== "undefined" &&
      document.documentElement.dir === "rtl";
    const sign = isRtl ? -1 : 1;
    el.scrollBy({ left: sign * dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={cn("group/scroller relative", className)}>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth py-2 sm:gap-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {children}
      </div>


      <button
        type="button"
        aria-label="Scroll previous"
        onClick={() => scrollBy(-1)}
        disabled={!canPrev}
        className={cn(
          "absolute start-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition-all sm:h-9 sm:w-9",
          "hover:bg-crimson hover:text-crimson-foreground",
          canPrev
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <ChevronLeft className="h-4 w-4 rtl:hidden" />
        <ChevronRight className="hidden h-4 w-4 rtl:block" />
      </button>
      <button
        type="button"
        aria-label="Scroll next"
        onClick={() => scrollBy(1)}
        disabled={!canNext}
        className={cn(
          "absolute end-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition-all sm:h-9 sm:w-9",
          "hover:bg-crimson hover:text-crimson-foreground",
          canNext
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <ChevronRight className="h-4 w-4 rtl:hidden" />
        <ChevronLeft className="hidden h-4 w-4 rtl:block" />
      </button>
    </div>
  );
}
