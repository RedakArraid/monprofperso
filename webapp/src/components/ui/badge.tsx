import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "orange" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold",
        variant === "default" && "bg-secondary text-primary",
        variant === "orange" && "bg-orange-soft text-[#8a5b33]",
        variant === "outline" && "border border-border text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
