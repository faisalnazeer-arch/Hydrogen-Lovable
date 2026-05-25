import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { btn: "h-7 w-7", icon: "h-3 w-3", text: "w-8 text-xs" },
  md: { btn: "h-9 w-9", icon: "h-4 w-4", text: "w-10 text-sm" },
  lg: { btn: "h-11 w-11", icon: "h-4 w-4", text: "w-8 text-sm" },
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  className,
}: QuantitySelectorProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border", className)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          s.btn,
          "grid place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
        )}
      >
        <Minus className={s.icon} />
      </button>
      <span className={cn(s.text, "text-center font-semibold")}>{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className={cn(
          s.btn,
          "grid place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
        )}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}
