// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SeguimientosCaseTimeline,
} from "@/components/forms/seguimientos/SeguimientosCaseTimeline";
import {
  buildSeguimientosWorkflow,
  getSeguimientosStageRules,
  SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
  SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
} from "@/lib/seguimientosStages";
import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  SEGUIMIENTOS_FINAL_STAGE_ID,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
  type SeguimientosFollowupIndex,
} from "@/lib/seguimientos";

function setValueAtPath(target: Record<string, unknown>, path: string, value: string) {
  const segments = path.split(".");
  let current: unknown = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isLastSegment = index === segments.length - 1;

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (isLastSegment) {
        current[arrayIndex] = value;
        return;
      }
      current = current[arrayIndex];
      continue;
    }

    const record = current as Record<string, unknown>;
    if (isLastSegment) {
      record[segment] = value;
      return;
    }
    current = record[segment];
  }
}

function buildFullyCompletedBaseValues() {
  const values = createEmptySeguimientosBaseValues() as unknown as Record<string, unknown>;
  const allFields = [...new Set([...SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS, ...SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS])];
  for (const path of allFields) {
    const nextValue =
      path === "modalidad"
        ? "Presencial"
        : path === "fecha_visita"
          ? "2026-04-21"
          : path === "fecha_inicio_contrato" || path === "fecha_fin_contrato" || path === "fecha_firma_contrato"
            ? "2026-04-17"
            : "Listo";
    setValueAtPath(values, path, nextValue);
  }
  return values;
}

function buildCompletedFollowupValues(index: SeguimientosFollowupIndex) {
  const values = createEmptySeguimientosFollowupValues(index);
  const mutableValues = values as unknown as Record<string, unknown>;

  [
    ...SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
    ...SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  ].forEach((path) => {
    const nextValue =
      path === "modalidad"
        ? "Presencial"
        : path === "tipo_apoyo"
          ? "No requiere apoyo."
          : path === "fecha_seguimiento"
            ? `2026-04-0${index}`
            : "Listo";
    setValueAtPath(mutableValues, path, nextValue);
  });

  return values;
}

afterEach(() => {
  cleanup();
});

describe("SeguimientosCaseTimeline", () => {
  it("shows all stages from getSeguimientosStageRules for no_compensar (3 followups)", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
    });
    const stageRules = getSeguimientosStageRules("no_compensar");

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId={SEGUIMIENTOS_BASE_STAGE_ID}
        onStageSelect={vi.fn()}
      />
    );

    // All 5 stages (base + 3 followups + final) should be rendered
    expect(screen.getByTestId("seguimientos-case-timeline")).toBeTruthy();
    for (const rule of stageRules) {
      expect(
        screen.getByTestId(`seguimientos-timeline-${rule.stageId}`)
      ).toBeTruthy();
    }
  });

  it("shows all stages from getSeguimientosStageRules for compensar (6 followups)", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "compensar",
    });
    const stageRules = getSeguimientosStageRules("compensar");

    render(
      <SeguimientosCaseTimeline
        companyType="compensar"
        workflow={workflow}
        activeStageId={SEGUIMIENTOS_BASE_STAGE_ID}
        onStageSelect={vi.fn()}
      />
    );

    // All 8 stages (base + 6 followups + final) should be rendered
    expect(screen.getByTestId("seguimientos-case-timeline")).toBeTruthy();
    for (const rule of stageRules) {
      expect(
        screen.getByTestId(`seguimientos-timeline-${rule.stageId}`)
      ).toBeTruthy();
    }
  });

  it("renders future followup badges as disabled (not clickable) when not in visibleStageIds", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: createEmptySeguimientosBaseValues(),
    });
    // With empty base, only base_process should be visible
    const visibleSet = new Set(workflow.visibleStageIds);

    const futureStageIds = getSeguimientosStageRules("no_compensar")
      .filter((rule) => !visibleSet.has(rule.stageId))
      .map((rule) => rule.stageId);

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId={SEGUIMIENTOS_BASE_STAGE_ID}
        onStageSelect={vi.fn()}
      />
    );

    for (const stageId of futureStageIds) {
      const badge = screen.getByTestId(`seguimientos-timeline-badge-${stageId}`) as HTMLButtonElement;
      expect(badge.disabled).toBe(true);
    }
  });

  it("makes visible and non-protected stages clickable", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: createEmptySeguimientosBaseValues(),
    });
    // Base is suggested and visible
    const onStageSelect = vi.fn();

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId={SEGUIMIENTOS_BASE_STAGE_ID}
        onStageSelect={onStageSelect}
      />
    );

    const baseBadge = screen.getByTestId(
      `seguimientos-timeline-badge-${SEGUIMIENTOS_BASE_STAGE_ID}`
    ) as HTMLButtonElement;
    expect(baseBadge.disabled).toBe(false);

    baseBadge.click();
    expect(onStageSelect).toHaveBeenCalledWith(SEGUIMIENTOS_BASE_STAGE_ID);
  });

  it("makes Resultado final clickable with neutral styling when it is visible but not suggested", () => {
    const completedBaseValues = buildFullyCompletedBaseValues();
    const followup1 = buildCompletedFollowupValues(1);
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: completedBaseValues,
      persistedBaseValues: completedBaseValues,
      followups: {
        1: followup1,
      },
      persistedFollowups: {
        1: followup1,
      },
      activeStageId: "followup_2",
    });
    const onStageSelect = vi.fn();

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId="followup_2"
        onStageSelect={onStageSelect}
      />
    );

    const finalBadge = screen.getByTestId(
      `seguimientos-timeline-badge-${SEGUIMIENTOS_FINAL_STAGE_ID}`
    ) as HTMLButtonElement;

    expect(workflow.suggestedStageId).toBe("followup_2");
    expect(finalBadge.disabled).toBe(false);
    expect(finalBadge.className).toContain("bg-gray-100");
    expect(finalBadge.className).not.toContain("ring-1");

    finalBadge.click();
    expect(onStageSelect).toHaveBeenCalledWith(SEGUIMIENTOS_FINAL_STAGE_ID);
  });

  it("marks the active stage with distinct styling", () => {
    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: createEmptySeguimientosBaseValues(),
      activeStageId: SEGUIMIENTOS_BASE_STAGE_ID,
    });

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId={SEGUIMIENTOS_BASE_STAGE_ID}
        onStageSelect={vi.fn()}
      />
    );

    const baseBadge = screen.getByTestId(
      `seguimientos-timeline-badge-${SEGUIMIENTOS_BASE_STAGE_ID}`
    );
    // Active badge should have reca bg class and ring
    expect(baseBadge.className).toContain("bg-reca");
    expect(baseBadge.className).toContain("ring-2");
  });

  it("marks the suggested (non-active) stage with distinct styling", () => {
    const completedBaseValues = buildFullyCompletedBaseValues();

    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: completedBaseValues,
      persistedBaseValues: completedBaseValues,
    });

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId="followup_1"
        onStageSelect={vi.fn()}
      />
    );

    const s1Badge = screen.getByTestId("seguimientos-timeline-badge-followup_1");
    expect(s1Badge.className).toContain("ring-2");
  });

  it("shows suggested-not-active badge with suggested styling and not active styling", () => {
    const completedBaseValues = buildFullyCompletedBaseValues();

    const workflow = buildSeguimientosWorkflow({
      companyType: "no_compensar",
      baseValues: completedBaseValues,
      persistedBaseValues: completedBaseValues,
    });
    // Base is complete, suggested is followup_1, but we set active to base_process
    const s1Stage = workflow.stageStates.find(
      (s) => s.stageId === "followup_1"
    );
    expect(s1Stage?.isSuggested).toBe(true);

    render(
      <SeguimientosCaseTimeline
        companyType="no_compensar"
        workflow={workflow}
        activeStageId="base_process"
        onStageSelect={vi.fn()}
      />
    );

    const s1Badge = screen.getByTestId(
      "seguimientos-timeline-badge-followup_1"
    ) as HTMLButtonElement;
    // Suggested and visible (base complete, so followup_1 is clickable)
    expect(s1Badge.disabled).toBe(false);
    // Suggested but not active: should have reca-styled ring but NOT ring-2
    expect(s1Badge.className).toContain("ring-1");
    expect(s1Badge.className).not.toContain("ring-2");
    expect(s1Badge.className).not.toContain("text-white");
  });
});
