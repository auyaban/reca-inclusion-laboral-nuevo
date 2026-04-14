import { describe, expect, it, vi } from "vitest";
import {
  createDictationRuntimeError,
  getDictationButtonUiState,
  getDictationBackendMessage,
  getDictationErrorMessage,
  getDictationTranscriptText,
  releaseDictationResources,
} from "@/components/forms/shared/dictationRuntime";

describe("dictationRuntime", () => {
  it("releases recorder resources on cleanup without attempting transcription", () => {
    const stopRecorder = vi.fn();
    const stopTrackA = vi.fn();
    const stopTrackB = vi.fn();
    const mediaRecorderRef = {
      current: {
        state: "recording",
        stop: stopRecorder,
        ondataavailable: vi.fn(),
        onstop: vi.fn(),
      },
    };
    const streamRef = {
      current: {
        getTracks: () => [{ stop: stopTrackA }, { stop: stopTrackB }],
      },
    };
    const chunksRef = {
      current: [new Blob(["hola"])],
    };
    const shouldTranscribeRef = { current: true };

    releaseDictationResources(
      {
        mediaRecorderRef,
        streamRef,
        chunksRef,
        shouldTranscribeRef,
      },
      { stopRecorder: true, clearChunks: true }
    );

    expect(stopRecorder).toHaveBeenCalledOnce();
    expect(stopTrackA).toHaveBeenCalledOnce();
    expect(stopTrackB).toHaveBeenCalledOnce();
    expect(mediaRecorderRef.current).toBeNull();
    expect(streamRef.current).toBeNull();
    expect(chunksRef.current).toEqual([]);
    expect(shouldTranscribeRef.current).toBe(false);
  });

  it("keeps backend-provided transcription errors when available", () => {
    const message = getDictationErrorMessage(
      createDictationRuntimeError("backend", "Audio demasiado corto.")
    );

    expect(message).toBe("Audio demasiado corto.");
  });

  it("maps missing Supabase configuration to the startup error message", () => {
    const message = getDictationErrorMessage(
      new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.")
    );

    expect(message).toBe(
      "No se pudo iniciar la transcripcion. Recarga e intenta de nuevo."
    );
  });

  it("maps timeouts to the timeout-specific transcription message", () => {
    const timeoutError = new Error("Timed out");
    timeoutError.name = "AbortError";

    expect(getDictationErrorMessage(timeoutError)).toBe(
      "La transcripcion tardo demasiado. Intenta de nuevo."
    );
  });

  it("extracts payload text only when the transcript is non-empty", () => {
    expect(getDictationTranscriptText({ text: "  Hola mundo  " })).toBe("Hola mundo");
    expect(getDictationTranscriptText({ text: "   " })).toBeNull();
  });

  it("extracts nested backend messages when the edge function returns them", () => {
    expect(
      getDictationBackendMessage({
        error: {
          message: "No se pudo leer el audio.",
        },
      })
    ).toBe("No se pudo leer el audio.");
  });

  it("prioritizes microphone permission requests over every other button state", () => {
    expect(
      getDictationButtonUiState({
        disabled: false,
        loading: true,
        recording: true,
        requestingPermission: true,
      })
    ).toEqual({
      status: "requesting_permission",
      label: "Solicitando permiso...",
      title: "Solicitando permiso del micrófono",
      isDisabled: true,
    });
  });

  it("prioritizes transcription over recording when audio is already being processed", () => {
    expect(
      getDictationButtonUiState({
        disabled: false,
        loading: true,
        recording: true,
        requestingPermission: false,
      })
    ).toEqual({
      status: "loading",
      label: "Transcribiendo...",
      title: "Transcribiendo audio",
      isDisabled: true,
    });
  });

  it("keeps the idle copy and disabled flag when nothing else is happening", () => {
    expect(
      getDictationButtonUiState({
        disabled: true,
        loading: false,
        recording: false,
        requestingPermission: false,
      })
    ).toEqual({
      status: "idle",
      label: "Dictar",
      title: "Dictar con OpenAI Whisper",
      isDisabled: true,
    });
  });
});
