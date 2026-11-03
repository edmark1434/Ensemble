import { cn } from "@/lib/utils";

export function PlanIcon({ plan, className }: {
  plan: "Premium" | "Business";
  className?: string;
}) {
  return <img
    src={`/icons/subscription/${plan === "Premium" ? "premium" : "studio"}.png`}
    alt={plan}
    title={plan}
    className={cn("size-5 shrink-0 object-contain", className)}
  />;
}
