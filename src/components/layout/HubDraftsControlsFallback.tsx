import { FileClock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HubDraftsControlsFallback() {
  return (
    <button
      type="button"
      disabled
      data-testid="hub-drafts-button"
      className={cn(
        "inline-flex min-w-[8.5rem] items-center justify-center gap-1.5",
        "rounded-lg border border-white/15 bg-white/10 px-3 py-2",
        "text-xs font-semibold text-white transition-colors",
        "disabled:cursor-wait disabled:opacity-80"
      )}
    >
      <FileClock className="h-4 w-4" />
      Borradores (...)
    </button>
  );
}
