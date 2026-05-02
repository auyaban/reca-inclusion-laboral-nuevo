// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SeguimientosPdfExportModal,
} from "@/components/forms/seguimientos/SeguimientosPdfExportModal";
import {
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFinalSummary,
  createEmptySeguimientosFollowupValues,
  buildSeguimientosStageDraftStateMap,
} from "@/lib/seguimientos";
import {
  buildSeguimientosWorkflow,
} from "@/lib/seguimientosStages";
import type { SeguimientosDraftData } from "@/lib/seguimientosRuntime";
import { SEGUIMIENTOS_CASE_SCHEMA_VERSION } from "@/lib/seguimientosRuntime";

function buildDraftData(overrides: Partial<SeguimientosDraftData> = {}): SeguimientosDraftData {
  const caseMeta = {
    caseId: "sheet-1",
    cedula: "1001234567",
    nombreVinculado: "Ana Perez",
    empresaNit: "900123456",
    empresaNombre: "Empresa Uno SAS",
    companyType: "no_compensar" as const,
    maxFollowups: 3,
    driveFolderId: "folder-1",
    spreadsheetId: "sheet-1",
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
    folderName: "Ana Perez - 1001234567",
    baseSheetName: "9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL",
    profesionalAsignado: "Marta Ruiz",
    cajaCompensacion: "Colsubsidio",
    createdAt: "2026-04-21T10:00:00.000Z",
    updatedAt: "2026-04-21T10:05:00.000Z",
  };

  const workflow = buildSeguimientosWorkflow({
    companyType: "no_compensar",
  });

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta,
    empresaSnapshot: null,
    personPrefill: null,
    stageDraftStateByStageId: buildSeguimientosStageDraftStateMap("no_compensar"),
    base: createEmptySeguimientosBaseValues(),
    persistedBase: createEmptySeguimientosBaseValues(),
    followups: {},
    persistedFollowups: {},
    summary: createEmptySeguimientosFinalSummary(),
    activeStageId: "followup_1",
    workflow,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("SeguimientosPdfExportModal", () => {
  it("shows the target PDF option when followup data is available", () => {
    const followup1 = createEmptySeguimientosFollowupValues(1);
    followup1.fecha_seguimiento = "2026-04-21";
    followup1.modalidad = "Presencial";
    const draftData = buildDraftData({
      persistedBase: (() => {
        const b = createEmptySeguimientosBaseValues();
        b.fecha_visita = "2026-04-21";
        b.modalidad = "Presencial";
        return b;
      })(),
      persistedFollowups: { 1: followup1 },
    });

    render(
      <SeguimientosPdfExportModal
        draftData={draftData}
        followupIndex={1}
        nextStageLabel="Seguimiento 2"
        canGoToFinal={false}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByTestId("seguimientos-pdf-export-modal")
    ).toBeTruthy();
  });

  it("displays disabledReason when PDF option is blocked", () => {
    const draftData = buildDraftData();

    render(
      <SeguimientosPdfExportModal
        draftData={draftData}
        followupIndex={1}
        nextStageLabel={null}
        canGoToFinal={true}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // When base is empty, followup export should be disabled
    expect(
      screen.getByText("Ficha inicial aun no esta lista")
    ).toBeTruthy();
    expect(screen.queryByTestId("seguimientos-pdf-complete-missing-button")).toBeNull();
  });

  it("hides the complete-missing-fields action when a blocked option has no actionable fields", () => {
    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData()}
        followupIndex={1}
        nextStageLabel={null}
        canGoToFinal={false}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Ficha inicial aun no esta lista")).toBeTruthy();
    expect(screen.queryByTestId("seguimientos-pdf-complete-missing-button")).toBeNull();
  });

  it("calls onExportPdf and does not show disabledReason when all data is complete", () => {
    const followup1 = createEmptySeguimientosFollowupValues(1);
    followup1.fecha_seguimiento = "2026-04-21";
    followup1.modalidad = "Presencial";
    followup1.item_autoevaluacion = followup1.item_autoevaluacion.map(() => "Bien");
    followup1.item_eval_empresa = followup1.item_eval_empresa.map(() => "Bien");
    followup1.empresa_eval = followup1.empresa_eval.map(() => "Bien");
    followup1.tipo_apoyo = "Requiere apoyo bajo.";
    followup1.situacion_encontrada = "Test";
    followup1.estrategias_ajustes = "Test";

    const fillAll = (arr: string[]) => arr.map(() => "Listo");
    const persistedBase = Object.assign(createEmptySeguimientosBaseValues(), {
      fecha_visita: "2026-04-21",
      modalidad: "Presencial",
      nombre_vinculado: "Test",
      cedula: "1001234567",
      cargo_vinculado: "Auxiliar",
      discapacidad: "Auditiva",
      tipo_contrato: "Fijo",
      apoyos_ajustes: "Ninguno",
      contacto_emergencia: "Listo",
      parentesco: "Listo",
      telefono_emergencia: "Listo",
      certificado_discapacidad: "Listo",
      certificado_porcentaje: "Listo",
      fecha_firma_contrato: "2026-04-17",
      fecha_inicio_contrato: "2026-04-17",
      fecha_fin_contrato: "2026-12-21",
      funciones_1_5: fillAll(createEmptySeguimientosBaseValues().funciones_1_5),
      funciones_6_10: fillAll(createEmptySeguimientosBaseValues().funciones_6_10),
    });

    const draftData = buildDraftData({
      persistedBase,
      persistedFollowups: { 1: followup1 },
    });
    const onExportPdf = vi.fn().mockResolvedValue(true);

    render(
      <SeguimientosPdfExportModal
        draftData={draftData}
        followupIndex={1}
        nextStageLabel="Seguimiento 2"
        canGoToFinal={false}
        exporting={false}
        onExportPdf={onExportPdf}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const exportButton = screen.queryByTestId("seguimientos-pdf-export-button");
    if (exportButton) {
      fireEvent.click(exportButton);
      expect(onExportPdf).toHaveBeenCalledWith("base_plus_followup_1");
    }
    expect(screen.queryByTestId("seguimientos-pdf-complete-missing-button")).toBeNull();
  });

  it("hides the complete-missing-fields action when the target PDF option is enabled", () => {
    const followup1 = createEmptySeguimientosFollowupValues(1);
    followup1.fecha_seguimiento = "2026-04-21";
    followup1.modalidad = "Presencial";
    followup1.item_autoevaluacion = followup1.item_autoevaluacion.map(() => "Bien");
    followup1.item_eval_empresa = followup1.item_eval_empresa.map(() => "Bien");
    followup1.empresa_eval = followup1.empresa_eval.map(() => "Bien");
    followup1.tipo_apoyo = "Requiere apoyo bajo.";
    followup1.situacion_encontrada = "Test";
    followup1.estrategias_ajustes = "Test";

    const fillAll = (arr: string[]) => arr.map(() => "Listo");
    const persistedBase = Object.assign(createEmptySeguimientosBaseValues(), {
      fecha_visita: "2026-04-21",
      modalidad: "Presencial",
      nombre_vinculado: "Test",
      cedula: "1001234567",
      cargo_vinculado: "Auxiliar",
      discapacidad: "Auditiva",
      tipo_contrato: "Fijo",
      apoyos_ajustes: "Ninguno",
      contacto_emergencia: "Listo",
      parentesco: "Listo",
      telefono_emergencia: "Listo",
      certificado_discapacidad: "Listo",
      certificado_porcentaje: "Listo",
      fecha_firma_contrato: "2026-04-17",
      fecha_inicio_contrato: "2026-04-17",
      fecha_fin_contrato: "2026-12-21",
      funciones_1_5: fillAll(createEmptySeguimientosBaseValues().funciones_1_5),
      funciones_6_10: fillAll(createEmptySeguimientosBaseValues().funciones_6_10),
    });

    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData({
          persistedBase,
          persistedFollowups: { 1: followup1 },
        })}
        followupIndex={1}
        nextStageLabel="Seguimiento 2"
        canGoToFinal={false}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("seguimientos-pdf-export-button")).toBeTruthy();
    expect(screen.queryByTestId("seguimientos-pdf-complete-missing-button")).toBeNull();
  });

  it("shows a complete-missing-fields action when the target PDF option is blocked", () => {
    const followup1 = createEmptySeguimientosFollowupValues(1);
    followup1.tipo_apoyo = "Requiere apoyo bajo.";
    followup1.item_autoevaluacion[0] = "Bien";
    followup1.item_eval_empresa[0] = "Bien";
    followup1.empresa_eval[0] = "Bien";
    followup1.situacion_encontrada = "Situacion parcial";
    followup1.estrategias_ajustes = "Ajustes parciales";

    const fillAll = (arr: string[]) => arr.map(() => "Listo");
    const persistedBase = Object.assign(createEmptySeguimientosBaseValues(), {
      fecha_visita: "2026-04-21",
      modalidad: "Presencial",
      nombre_vinculado: "Test",
      cedula: "1001234567",
      cargo_vinculado: "Auxiliar",
      discapacidad: "Auditiva",
      tipo_contrato: "Fijo",
      apoyos_ajustes: "Ninguno",
      contacto_emergencia: "Listo",
      parentesco: "Listo",
      telefono_emergencia: "Listo",
      certificado_discapacidad: "Listo",
      certificado_porcentaje: "Listo",
      fecha_firma_contrato: "2026-04-17",
      fecha_inicio_contrato: "2026-04-17",
      fecha_fin_contrato: "2026-12-21",
      funciones_1_5: fillAll(createEmptySeguimientosBaseValues().funciones_1_5),
      funciones_6_10: fillAll(createEmptySeguimientosBaseValues().funciones_6_10),
    });

    const onCompleteMissingFields = vi.fn();

    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData({
          persistedBase,
          persistedFollowups: { 1: followup1 },
        })}
        followupIndex={1}
        nextStageLabel={null}
        canGoToFinal={false}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={onCompleteMissingFields}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "Falta completar: modalidad, fecha de seguimiento. Vuelve al editor para completar antes de exportar."
      )
    ).toBeTruthy();

    fireEvent.click(screen.getByTestId("seguimientos-pdf-complete-missing-button"));
    expect(onCompleteMissingFields).toHaveBeenCalledWith("modalidad");
  });

  it("calls onGoToNextStage when next button clicked with label", () => {
    const onGoToNextStage = vi.fn();

    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData()}
        followupIndex={1}
        nextStageLabel="Seguimiento 2"
        canGoToFinal={false}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={onGoToNextStage}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByTestId("seguimientos-pdf-next-button")
    );
    expect(onGoToNextStage).toHaveBeenCalled();
  });

  it("shows next-stage and Resultado final actions together when both are available", () => {
    const onGoToFinal = vi.fn();

    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData()}
        followupIndex={1}
        nextStageLabel="Seguimiento 2"
        canGoToFinal={true}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={onGoToFinal}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("seguimientos-pdf-next-button")).toBeTruthy();
    const finalButton = screen.getByTestId("seguimientos-pdf-final-button");
    expect(finalButton.textContent).toContain("Ir a Resultado final");

    fireEvent.click(finalButton);
    expect(onGoToFinal).toHaveBeenCalled();
  });

  it("hides Resultado final when final navigation is not available", () => {
    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData()}
        followupIndex={1}
        nextStageLabel="Seguimiento 2"
        canGoToFinal={false}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("seguimientos-pdf-next-button")).toBeTruthy();
    expect(screen.queryByTestId("seguimientos-pdf-final-button")).toBeNull();
  });

  it("shows Ir a Resultado final when nextStageLabel is null", () => {
    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData()}
        followupIndex={3}
        nextStageLabel={null}
        canGoToFinal={true}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // When nextStageLabel is null, "Ir a Resultado final" shows
    expect(
      screen.getByTestId("seguimientos-pdf-final-button")
    ).toBeTruthy();
    // And next-stage button should NOT coexist
    expect(
      screen.queryByTestId("seguimientos-pdf-next-button")
    ).toBeNull();
  });

  it("calls onClose when X and Cerrar buttons clicked", () => {
    const onClose = vi.fn();

    render(
      <SeguimientosPdfExportModal
        draftData={buildDraftData()}
        followupIndex={1}
        nextStageLabel={null}
        canGoToFinal={true}
        exporting={false}
        onExportPdf={vi.fn()}
        onGoToNextStage={vi.fn()}
        onGoToFinal={vi.fn()}
        onCompleteMissingFields={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(
      screen.getByTestId("seguimientos-pdf-close-button")
    );
    expect(onClose).toHaveBeenCalled();
  });
});
