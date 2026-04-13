type MutableRef<T> = {
  current: T;
};

const MICROPHONE_ACCESS_ERROR_NAMES = new Set([
  "NotAllowedError",
  "NotFoundError",
  "PermissionDeniedError",
  "SecurityError",
]);

export const DICTATION_MICROPHONE_ERROR =
  "No se pudo acceder al microfono. Revisa los permisos del navegador.";
export const DICTATION_UNSUPPORTED_ERROR =
  "Este navegador no soporta dictado de voz en esta app.";
export const DICTATION_NOT_READY_ERROR =
  "No se pudo iniciar la transcripcion. Recarga e intenta de nuevo.";
export const DICTATION_TIMEOUT_ERROR =
  "La transcripcion tardo demasiado. Intenta de nuevo.";
export const DICTATION_TRANSCRIPTION_ERROR =
  "No se pudo transcribir el audio. Intenta de nuevo.";
export const DICTATION_REQUESTING_PERMISSION_LABEL =
  "Solicitando permiso...";
export const DICTATION_REQUESTING_PERMISSION_TITLE =
  "Solicitando permiso del micrófono";
export const DICTATION_LOADING_LABEL = "Transcribiendo...";
export const DICTATION_LOADING_TITLE = "Transcribiendo audio";
export const DICTATION_RECORDING_LABEL = "Detener";
export const DICTATION_RECORDING_TITLE = "Detener y transcribir";
export const DICTATION_IDLE_LABEL = "Dictar";
export const DICTATION_IDLE_TITLE = "Dictar con OpenAI Whisper";

type DictationErrorCode =
  | "backend"
  | "not_ready"
  | "timeout"
  | "transcription_failed"
  | "unsupported";

export type DictationButtonUiStatus =
  | "requesting_permission"
  | "loading"
  | "recording"
  | "idle";

type DictationButtonUiStateInput = {
  disabled: boolean;
  loading: boolean;
  recording: boolean;
  requestingPermission: boolean;
};

export type DictationButtonUiState = {
  status: DictationButtonUiStatus;
  label: string;
  title: string;
  isDisabled: boolean;
};

type MediaTrackLike = {
  stop: () => void;
};

type MediaStreamLike = {
  getTracks: () => MediaTrackLike[];
} | null;

type MediaRecorderLike = {
  state?: string;
  stop?: () => void;
  ondataavailable: MediaRecorder["ondataavailable"];
  onstop: MediaRecorder["onstop"];
};

type DictationResourceRefs = {
  mediaRecorderRef: MutableRef<MediaRecorderLike | null>;
  streamRef: MutableRef<MediaStreamLike>;
  chunksRef: MutableRef<BlobPart[]>;
  shouldTranscribeRef: MutableRef<boolean>;
  abortControllerRef?: MutableRef<AbortController | null>;
};

type ReleaseOptions = {
  stopRecorder: boolean;
  clearChunks: boolean;
  abortRequest?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isDictationSuccessPayload(
  payload: unknown
): payload is Record<string, unknown> & { ok: true } {
  return isRecord(payload) && payload.ok === true;
}

export class DictationRuntimeError extends Error {
  readonly code: DictationErrorCode;

  constructor(code: DictationErrorCode, message?: string) {
    super(message);
    this.code = code;
    this.name = "DictationRuntimeError";
  }
}

export function createDictationRuntimeError(
  code: DictationErrorCode,
  message?: string
) {
  return new DictationRuntimeError(code, message);
}

export function releaseDictationResources(
  {
    mediaRecorderRef,
    streamRef,
    chunksRef,
    shouldTranscribeRef,
    abortControllerRef,
  }: DictationResourceRefs,
  { stopRecorder, clearChunks, abortRequest = false }: ReleaseOptions
) {
  const recorder = mediaRecorderRef.current;
  if (recorder) {
    recorder.ondataavailable = null;
    recorder.onstop = null;

    if (stopRecorder && recorder.state !== "inactive") {
      try {
        recorder.stop?.();
      } catch {
        // ignore
      }
    }
  }

  const stream = streamRef.current;
  if (stream) {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
  }

  if (abortRequest) {
    try {
      abortControllerRef?.current?.abort();
    } catch {
      // ignore
    }
  }

  mediaRecorderRef.current = null;
  streamRef.current = null;
  shouldTranscribeRef.current = false;
  if (abortControllerRef) {
    abortControllerRef.current = null;
  }
  if (clearChunks) {
    chunksRef.current = [];
  }
}

export function getDictationBackendMessage(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  const directMessage =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : null;
  if (directMessage) {
    return directMessage;
  }

  if (isRecord(payload.error)) {
    const nestedMessage =
      typeof payload.error.message === "string" && payload.error.message.trim()
        ? payload.error.message.trim()
        : null;
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return null;
}

export function getDictationTranscriptText(payload: unknown) {
  if (!isRecord(payload) || typeof payload.text !== "string") {
    return null;
  }

  const text = payload.text.trim();
  return text || null;
}

export function getDictationErrorMessage(error: unknown) {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    MICROPHONE_ACCESS_ERROR_NAMES.has(error.name)
  ) {
    return DICTATION_MICROPHONE_ERROR;
  }

  if (error instanceof DictationRuntimeError) {
    switch (error.code) {
      case "unsupported":
        return DICTATION_UNSUPPORTED_ERROR;
      case "not_ready":
        return DICTATION_NOT_READY_ERROR;
      case "timeout":
        return DICTATION_TIMEOUT_ERROR;
      case "backend":
        return error.message.trim() || DICTATION_TRANSCRIPTION_ERROR;
      case "transcription_failed":
      default:
        return DICTATION_TRANSCRIPTION_ERROR;
    }
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return DICTATION_TIMEOUT_ERROR;
    }

    if (error.message.includes("NEXT_PUBLIC_SUPABASE_URL")) {
      return DICTATION_NOT_READY_ERROR;
    }
  }

  return DICTATION_TRANSCRIPTION_ERROR;
}

export function getDictationButtonUiState({
  disabled,
  loading,
  recording,
  requestingPermission,
}: DictationButtonUiStateInput): DictationButtonUiState {
  if (requestingPermission) {
    return {
      status: "requesting_permission",
      label: DICTATION_REQUESTING_PERMISSION_LABEL,
      title: DICTATION_REQUESTING_PERMISSION_TITLE,
      isDisabled: true,
    };
  }

  if (loading) {
    return {
      status: "loading",
      label: DICTATION_LOADING_LABEL,
      title: DICTATION_LOADING_TITLE,
      isDisabled: true,
    };
  }

  if (recording) {
    return {
      status: "recording",
      label: DICTATION_RECORDING_LABEL,
      title: DICTATION_RECORDING_TITLE,
      isDisabled: disabled,
    };
  }

  return {
    status: "idle",
    label: DICTATION_IDLE_LABEL,
    title: DICTATION_IDLE_TITLE,
    isDisabled: disabled,
  };
}
