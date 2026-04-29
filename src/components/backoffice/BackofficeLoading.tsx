import type { ReactNode } from "react";
import { BackofficeFeedback } from "./BackofficeFeedback";
import { cn } from "@/lib/utils";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("rounded-full bg-gray-200", className)} />;
}

function LoadingShell({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section
      data-testid={testId}
      className="animate-pulse space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <BackofficeFeedback variant="loading">{title}</BackofficeFeedback>
      {children}
    </section>
  );
}

export function BackofficeTableSkeleton({
  title = "Cargando registros...",
}: {
  title?: string;
}) {
  return (
    <LoadingShell title={title} testId="backoffice-table-skeleton">
      <div className="grid gap-3 md:grid-cols-3">
        <SkeletonLine className="h-10" />
        <SkeletonLine className="h-10" />
        <SkeletonLine className="h-10" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4">
          <SkeletonLine className="h-4" />
          <SkeletonLine className="h-4" />
          <SkeletonLine className="h-4" />
          <SkeletonLine className="h-4" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="grid grid-cols-4 gap-4 border-t border-gray-100 p-4">
            <SkeletonLine className="h-4" />
            <SkeletonLine className="h-4" />
            <SkeletonLine className="h-4" />
            <SkeletonLine className="h-4" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}

export function BackofficeFormSkeleton({
  title = "Abriendo registro...",
}: {
  title?: string;
}) {
  return (
    <LoadingShell title={title} testId="backoffice-form-skeleton">
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="space-y-2">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-11" />
          </div>
        ))}
      </div>
      <SkeletonLine className="h-24" />
    </LoadingShell>
  );
}
