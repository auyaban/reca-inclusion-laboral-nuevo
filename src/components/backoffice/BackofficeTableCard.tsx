import type { ReactNode } from "react";
import { BackofficeFeedback } from "./BackofficeFeedback";
import { cn } from "@/lib/utils";

export function BackofficeTableCard({
  children,
  empty,
  className,
}: {
  children: ReactNode;
  empty?: {
    title: string;
    description: string;
    action?: ReactNode;
  };
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {empty ? (
        <div className="p-8 text-center">
          <BackofficeFeedback variant="empty" title={empty.title}>
            <p>{empty.description}</p>
            {empty.action ? <div className="mt-4">{empty.action}</div> : null}
          </BackofficeFeedback>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

