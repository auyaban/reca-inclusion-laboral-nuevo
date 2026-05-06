"use client";

import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import {
  BackofficeBadge,
  type BackofficeBadgeTone,
} from "@/components/backoffice";
import {
  getSeguimientosStageRules,
  type SeguimientosWorkflow,
} from "@/lib/seguimientosStages";
import type { SeguimientosCompanyType } from "@/lib/seguimientos";
import { cn } from "@/lib/utils";

type SeguimientosCaseTimelineProps = {
  companyType: SeguimientosCompanyType;
  workflow: SeguimientosWorkflow;
  activeStageId: string;
  onStageSelect: (stageId: string) => void;
};

// Timeline consumes getSeguimientosStageRules(companyType) for ALL stages.
// visibleStageIds from the workflow governs clickability only.
// Future stages (not in visibleStageIds) render as disabled badges.

export function SeguimientosCaseTimeline({
  companyType,
  workflow,
  activeStageId,
  onStageSelect,
}: SeguimientosCaseTimelineProps) {
  const stageRules = getSeguimientosStageRules(companyType);
  const visibleSet = new Set(workflow.visibleStageIds);

  return (
    <div
      data-testid="seguimientos-case-timeline"
      className="flex flex-wrap items-center gap-1"
    >
      {stageRules.map((rule, index) => {
        const stageState = workflow.stageStates.find(
          (state) => state.stageId === rule.stageId
        );
        if (!stageState) {
          return null;
        }

        const isActive = stageState.stageId === activeStageId;
        const isClickable = visibleSet.has(stageState.stageId);
        const isCompleted = stageState.progress.isCompleted;
        const isSuggested = stageState.isSuggested;
        const isProtected = stageState.isProtectedByDefault;
        const isLast = index === stageRules.length - 1;

        let badgeIcon = null;
        if (isCompleted) {
          badgeIcon = <CheckCircle2 className="h-3.5 w-3.5" />;
        } else if (isSuggested) {
          badgeIcon = <ChevronRight className="h-3.5 w-3.5" />;
        } else if (isProtected) {
          badgeIcon = <Lock className="h-3.5 w-3.5" />;
        }

        const badgeTone: BackofficeBadgeTone = isCompleted
          ? "success"
          : isProtected
            ? "warning"
            : isSuggested || isActive
              ? "reca"
              : "neutral";

        return (
          <div
            key={stageState.stageId}
            data-testid={`seguimientos-timeline-${stageState.stageId}`}
            className="flex items-center gap-1"
          >
            <button
              type="button"
              data-testid={`seguimientos-timeline-badge-${stageState.stageId}`}
              disabled={!isClickable}
              aria-current={isActive ? "step" : undefined}
              onClick={() => isClickable && onStageSelect(stageState.stageId)}
              className={cn(
                "rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-reca-300",
                isActive && "shadow-sm ring-2 ring-reca-300",
                !isActive && isSuggested && "ring-1 ring-reca-300",
                isClickable && "hover:opacity-90",
                !isClickable && "cursor-not-allowed opacity-60"
              )}
            >
              <BackofficeBadge
                tone={badgeTone}
                className={cn(
                  "gap-1.5 rounded-xl px-2.5 py-1.5",
                  isActive && "border-reca bg-reca text-white",
                  !isClickable && "border-gray-100 bg-gray-50 text-gray-400"
                )}
              >
                {badgeIcon}
                {rule.kind === "followup"
                  ? `S${rule.followupIndex}`
                  : rule.label}
              </BackofficeBadge>
            </button>
            {!isLast && (
              <span className="mx-0.5 text-gray-300">
                <ChevronRight className="h-3 w-3" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
