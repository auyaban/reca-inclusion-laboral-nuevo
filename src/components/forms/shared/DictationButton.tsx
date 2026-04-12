"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseFunctionUrl } from "@/lib/supabase/functions";
import {
  createDictationRuntimeError,
  getDictationBackendMessage,
  getDictationErrorMessage,
  getDictationTranscriptText,
  isDictationSuccessPayload,
  releaseDictationResources,
} from "./dictationRuntime";

type DictationButtonProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

export function DictationButton({
  onTranscript,
  disabled = false,
  className,
}: DictationButtonProps) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const shouldTranscribeRef = useRef(false);
  const mountedRef = useRef(true);

  const cleanupRecordingResources = useCallback(
    ({
      stopRecorder = false,
      clearChunks = true,
      abortRequest = false,
    }: {
      stopRecorder?: boolean;
      clearChunks?: boolean;
      abortRequest?: boolean;
    } = {}) => {
      releaseDictationResources(
        {
          mediaRecorderRef: mediaRef,
          streamRef,
          chunksRef,
          shouldTranscribeRef,
          abortControllerRef,
        },
        {
          stopRecorder,
          clearChunks,
          abortRequest,
        }
      );
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanupRecordingResources({
        stopRecorder: true,
        clearChunks: true,
        abortRequest: true,
      });
    };
  }, [cleanupRecordingResources]);

  const handleRecorderFailure = useCallback(
    (nextError: unknown) => {
      cleanupRecordingResources({
        stopRecorder: false,
        clearChunks: true,
        abortRequest: true,
      });

      if (!mountedRef.current) {
        return;
      }

      setRecording(false);
      setLoading(false);
      setError(getDictationErrorMessage(nextError));
    },
    [cleanupRecordingResources]
  );

  const handleRecorderStop = useCallback(
    async (mediaRecorder: MediaRecorder) => {
      const shouldTranscribe = shouldTranscribeRef.current;
      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob([...chunksRef.current], { type: mimeType });

      if (mountedRef.current) {
        setRecording(false);
      }

      if (!shouldTranscribe) {
        cleanupRecordingResources({
          stopRecorder: false,
          clearChunks: true,
          abortRequest: false,
        });
        return;
      }

      if (mountedRef.current) {
        setLoading(true);
      }

      try {
        if (!blob.size) {
          throw createDictationRuntimeError("transcription_failed");
        }

        const functionUrl = getSupabaseFunctionUrl("dictate-transcribe");
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw createDictationRuntimeError("not_ready");
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timeoutId = window.setTimeout(() => controller.abort(), 60_000);

        try {
          const formData = new FormData();
          formData.append("audio_file", blob, "dictation.webm");
          formData.append("language", "es");

          const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
            signal: controller.signal,
          });

          let payload: unknown = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }

          if (!response.ok || !isDictationSuccessPayload(payload)) {
            throw createDictationRuntimeError(
              "backend",
              getDictationBackendMessage(payload) ?? undefined
            );
          }

          const transcript = getDictationTranscriptText(payload);
          if (!transcript) {
            throw createDictationRuntimeError("transcription_failed");
          }

          if (mountedRef.current) {
            onTranscript(transcript);
          }
        } finally {
          window.clearTimeout(timeoutId);
          abortControllerRef.current = null;
        }
      } catch (nextError) {
        if (mountedRef.current) {
          setError(getDictationErrorMessage(nextError));
        }
      } finally {
        cleanupRecordingResources({
          stopRecorder: false,
          clearChunks: true,
          abortRequest: false,
        });

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [cleanupRecordingResources, onTranscript]
  );

  const startRecording = useCallback(async () => {
    setError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(getDictationErrorMessage(createDictationRuntimeError("unsupported")));
      return;
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      shouldTranscribeRef.current = false;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onerror = () => {
        handleRecorderFailure(createDictationRuntimeError("unsupported"));
      };
      mediaRecorder.onstop = () => {
        void handleRecorderStop(mediaRecorder);
      };

      mediaRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (nextError) {
      if (stream) {
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch {
            // ignore
          }
        }
      }

      cleanupRecordingResources({
        stopRecorder: false,
        clearChunks: true,
        abortRequest: true,
      });
      setError(getDictationErrorMessage(nextError));
    }
  }, [cleanupRecordingResources, handleRecorderFailure, handleRecorderStop]);

  const stopRecording = useCallback(() => {
    setError(null);

    if (!mediaRef.current) {
      return;
    }

    shouldTranscribeRef.current = true;

    try {
      mediaRef.current.stop();
    } catch {
      handleRecorderFailure(createDictationRuntimeError("unsupported"));
    }
  }, [handleRecorderFailure]);

  function toggle() {
    if (recording) {
      stopRecording();
      return;
    }

    void startRecording();
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || loading}
        title={recording ? "Detener y transcribir" : "Dictar con OpenAI Whisper"}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          recording
            ? "animate-pulse bg-red-100 text-red-600 hover:bg-red-200"
            : disabled || loading
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : recording ? (
          <MicOff className="h-3.5 w-3.5" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
        {loading ? "Transcribiendo..." : recording ? "Detener" : "Dictar"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
