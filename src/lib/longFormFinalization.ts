export const LONG_FORM_FINALIZATION_STAGE_ORDER = [
  "validando",
  "preparando_envio",
  "enviando_al_servidor",
  "esperando_respuesta",
  "verificando_publicacion",
  "cerrando_borrador_local",
] as const;

export type LongFormFinalizationStageId =
  (typeof LONG_FORM_FINALIZATION_STAGE_ORDER)[number];

export type LongFormFinalizationPhase =
  | "idle"
  | "processing"
  | "error"
  | "completed";

export type LongFormFinalizationRetryAction = "submit" | "check_status";

export type LongFormFinalizationProgress = {
  phase: LongFormFinalizationPhase;
  currentStageId: LongFormFinalizationStageId | null;
  startedAt: number | null;
  displayMessage: string | null;
  errorMessage: string | null;
  retryAction: LongFormFinalizationRetryAction;
};

export type LongFormFinalizationDisplayStep = {
  id: LongFormFinalizationStageId;
  label: string;
  status: "pending" | "active" | "completed" | "error";
};

const LONG_FORM_FINALIZATION_STAGE_LABELS: Record<
  LongFormFinalizationStageId,
  string
> = {
  validando: "Revisando datos",
  preparando_envio: "Preparando publicación",
  enviando_al_servidor: "Enviando informacion",
  esperando_respuesta: "Procesando acta",
  verificando_publicacion: "Confirmando publicación",
  cerrando_borrador_local: "Cerrando borrador local",
};

export function getInitialLongFormFinalizationProgress(): LongFormFinalizationProgress {
  return {
    phase: "idle",
    currentStageId: null,
    startedAt: null,
    displayMessage: null,
    errorMessage: null,
    retryAction: "submit",
  };
}

export function buildLongFormFinalizationSteps(
  progress: LongFormFinalizationProgress
): LongFormFinalizationDisplayStep[] {
  const currentIndex = progress.currentStageId
    ? LONG_FORM_FINALIZATION_STAGE_ORDER.indexOf(progress.currentStageId)
    : -1;

  return LONG_FORM_FINALIZATION_STAGE_ORDER.map((stageId, index) => {
    let status: LongFormFinalizationDisplayStep["status"] = "pending";

    if (progress.phase === "completed") {
      status = "completed";
    } else if (progress.phase === "processing") {
      if (index < currentIndex) {
        status = "completed";
      } else if (index === currentIndex) {
        status = "active";
      }
    } else if (progress.phase === "error") {
      if (index < currentIndex) {
        status = "completed";
      } else if (index === currentIndex) {
        status = "error";
      }
    }

    return {
      id: stageId,
      label: LONG_FORM_FINALIZATION_STAGE_LABELS[stageId],
      status,
    };
  });
}

export function formatLongFormElapsedTime(
  startedAt: number | null,
  now = Date.now()
) {
  if (!startedAt) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
