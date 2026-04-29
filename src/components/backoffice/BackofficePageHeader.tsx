import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackofficePageHeader({
  eyebrow,
  title,
  description,
  action,
  backHref,
  backLabel = "Volver",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <section
      data-testid="backoffice-page-header"
      className={cn(
        "rounded-2xl bg-gradient-to-r from-reca-800 via-reca-700 to-teal-600 px-5 py-5 text-white shadow-sm sm:px-6",
        className
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-50 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-50">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-teal-50 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

