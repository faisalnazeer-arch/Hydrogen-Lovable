import { cn } from "~/lib/utils";
import { CheckCircle2 } from "lucide-react";

export interface SellingPlan {
  id: string;
  name: string;
  discount: number;
}

export interface SellingPlanGroup {
  name: string;
  plans: SellingPlan[];
}

interface SubscriptionSelectorProps {
  groups: SellingPlanGroup[];
  selectedPlanId: string | null;
  onSelect: (planId: string | null) => void;
  regularPrice?: string;
  currency?: string;
  className?: string;
}

export function SubscriptionSelector({
  groups,
  selectedPlanId,
  onSelect,
  regularPrice = "0",
  currency = "AED",
  className,
}: SubscriptionSelectorProps) {
  if (groups.length === 0) return null;

  const allPlans = groups.flatMap((g) => g.plans);
  const isSubscribing = selectedPlanId !== null;
  const activePlan = allPlans.find((p) => p.id === selectedPlanId) ?? allPlans[0];
  const bestDiscount = Math.max(...allPlans.map((p) => p.discount), 0);

  const regularPriceNum = parseFloat(regularPrice) || 0;
  const subscriptionPrice =
    activePlan?.discount > 0
      ? regularPriceNum * (1 - activePlan.discount / 100)
      : regularPriceNum;

  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* ── One-time ── */}
      <label
        className={cn(
          "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors",
          !isSubscribing
            ? "border-crimson bg-crimson/5 ring-1 ring-crimson"
            : "border-border hover:border-muted-foreground",
        )}
      >
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="purchase-type"
            checked={!isSubscribing}
            onChange={() => onSelect(null)}
            className="accent-crimson"
          />
          <span className="font-semibold">One-time</span>
        </div>
        <span className="text-sm font-semibold">{fmt(regularPriceNum)}</span>
      </label>

      {/* ── Subscribe & save ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!isSubscribing) onSelect(allPlans[0]?.id ?? null); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isSubscribing) onSelect(allPlans[0]?.id ?? null); } }}
        className={cn(
          "relative rounded-lg border transition-colors",
          isSubscribing
            ? "border-crimson ring-1 ring-crimson"
            : "cursor-pointer border-border hover:border-muted-foreground",
        )}
      >
        {/* Badge */}
        {bestDiscount > 0 && (
          <span className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-crimson px-3 py-1 text-xs font-bold text-white">
            Save up to {bestDiscount}%
          </span>
        )}

        {/* Header row */}
        <div className={cn("flex items-start justify-between px-4 pb-3 pt-4", bestDiscount > 0 ? "pr-24" : "pr-4")}>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="purchase-type"
              checked={isSubscribing}
              onChange={() => onSelect(allPlans[0]?.id ?? null)}
              className="mt-0.5 accent-crimson"
            />
            <span className="text-base font-bold">Subscribe &amp; save</span>
          </label>
          <div className="flex flex-col items-end">
            {activePlan?.discount > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {fmt(regularPriceNum)}
              </span>
            )}
            <span className="font-bold">
              {fmt(activePlan?.discount > 0 ? subscriptionPrice : regularPriceNum)}
            </span>
          </div>
        </div>

        {/* Benefits + frequency — only shown when subscribe is selected */}
        {isSubscribing && (
          <div className="px-4 pb-4">
            <ul className="flex flex-col gap-1.5">
              <BenefitItem text="Get 10% off" />
              <BenefitItem text="Subscription of less than AED 100 order value has AED 15 delivery fees. We deliver as per your schedule." />
              <BenefitItem text="No commitment cancel anytime." />
            </ul>

            <p className="mt-3 text-sm">
              <span className="font-semibold">Please note:</span> If your subscription order
              value is more than AED 100 then you will get the following:
            </p>

            <ul className="mt-1.5 flex flex-col gap-1.5">
              <BenefitItem text="Free delivery; we deliver as per your schedule." />
              <BenefitItem text="Free NZ Beef Ribeye Steak 250gm x 1." />
              <BenefitItem text="No commitment, cancel anytime." />
            </ul>

            {/* Frequency picker */}
            {allPlans.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">Deliver every:</p>
                <div className="flex flex-wrap gap-2">
                  {allPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelect(plan.id); }}
                      className={cn(
                        "flex min-w-[80px] flex-col items-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                        plan.id === selectedPlanId
                          ? "border-crimson bg-crimson text-white"
                          : "border-border bg-muted/50 hover:border-crimson",
                      )}
                    >
                      <span>{plan.name}</span>
                      {plan.discount > 0 && (
                        <span
                          className={cn(
                            "text-[11px]",
                            plan.id === selectedPlanId
                              ? "text-white/80"
                              : "text-muted-foreground",
                          )}
                        >
                          save {plan.discount}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
      <span>{text}</span>
    </li>
  );
}

export function parseSellingPlanGroups(
  raw: any[],
  discountMap: Record<string, number> = {},
): SellingPlanGroup[] {
  if (!raw?.length) return [];
  return raw
    .map((group: any) => ({
      name: group.name ?? "Subscription",
      plans: (group.sellingPlans?.nodes ?? []).map((plan: any) => ({
        id: plan.id as string,
        name: plan.name as string,
        discount: discountMap[plan.id] ?? 0,
      })),
    }))
    .filter((g: SellingPlanGroup) => g.plans.length > 0);
}
