import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackVariant = "error" | "success" | "warning" | "info" | "loading" | "empty";

const variantClasses: Record<FeedbackVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800",
  loading: "border-reca-200 bg-reca-50 text-reca-800",
  empty: "border-gray-200 bg-white text-gray-700",
};

const iconClasses: Record<FeedbackVariant, string> = {
  error: "text-red-700",
  success: "text-emerald-700",
  warning: "text-amber-800",
  info: "text-cyan-700",
  loading: "text-reca",
  empty: "text-gray-600",
};

const contentClasses: Record<FeedbackVariant, string> = {
  error: "text-red-800",
  success: "text-emerald-800",
  warning: "text-amber-900",
  info: "text-cyan-800",
  loading: "text-reca-800",
  empty: "text-gray-700",
};

function FeedbackIcon({ variant }: { variant: FeedbackVariant }) {
  const className = cn("mt-0.5 h-4 w-4 shrink-0", iconClasses[variant]);
  if (variant === "success") {
    return <CheckCircle2 className={className} aria-hidden="true" />;
  }
  if (variant === "warning") {
    return <TriangleAlert className={className} aria-hidden="true" />;
  }
  if (variant === "loading") {
    return <Loader2 className={cn(className, "animate-spin")} aria-hidden="true" />;
  }
  if (variant === "info" || variant === "empty") {
    return <Info className={className} aria-hidden="true" />;
  }
  return <AlertCircle className={className} aria-hidden="true" />;
}

export function BackofficeFeedback({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: FeedbackVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm font-semibold",
        variantClasses[variant],
        className
      )}
    >
      <FeedbackIcon variant={variant} />
      <div className="min-w-0">
        {title ? (
          <p
            className={cn(
              "font-bold",
              variant === "error" && "text-red-900",
              variant === "success" && "text-emerald-900",
              variant === "warning" && "text-amber-950",
              variant === "info" && "text-cyan-900",
              variant === "loading" && "text-reca-900",
              variant === "empty" && "text-gray-900"
            )}
          >
            {title}
          </p>
        ) : null}
        <div className={cn(title ? "mt-0.5" : undefined, contentClasses[variant])}>
          {children}
        </div>
      </div>
    </div>
  );
}
