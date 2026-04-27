"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type LongFormFailedVisitNoticeProps = {
  title: string;
  description: string;
  appliedMessage: string;
  actionLabel: string;
  appliedActionLabel: string;
  failedVisitAppliedAt: string | null;
  disabled?: boolean;
  onRequestApply: () => void;
};

export function LongFormFailedVisitNotice({
  title,
  description,
  appliedMessage,
  actionLabel,
  appliedActionLabel,
  failedVisitAppliedAt,
  disabled = false,
  onRequestApply,
}: LongFormFailedVisitNoticeProps) {
  const alreadyApplied = Boolean(failedVisitAppliedAt);
  const buttonDisabled = disabled || alreadyApplied;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            <p className="leading-relaxed">
              {alreadyApplied ? appliedMessage : description}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="long-form-failed-visit-button"
          disabled={buttonDisabled}
          onClick={onRequestApply}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            buttonDisabled
              ? "cursor-not-allowed border border-amber-200 bg-white/70 text-amber-700 opacity-70"
              : "bg-amber-700 text-white hover:bg-amber-800"
          )}
        >
          {alreadyApplied ? appliedActionLabel : actionLabel}
        </button>
      </div>
    </div>
  );
}
