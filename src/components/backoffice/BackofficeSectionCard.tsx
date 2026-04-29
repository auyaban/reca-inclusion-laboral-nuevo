import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BackofficeSectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  accent = "reca",
}: {
  title?: string;
  description?: string;
  icon?: ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: "reca" | "teal" | "amber" | "red" | "gray";
}) {
  const accentClasses = {
    reca: "bg-reca text-white",
    teal: "bg-teal-600 text-white",
    amber: "bg-amber-600 text-white",
    red: "bg-red-700 text-white",
    gray: "bg-gray-700 text-white",
  }[accent];

  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6",
        className
      )}
    >
      {title || description || action ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span
                className={cn(
                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  accentClasses
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2 className="text-base font-bold text-gray-900">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

