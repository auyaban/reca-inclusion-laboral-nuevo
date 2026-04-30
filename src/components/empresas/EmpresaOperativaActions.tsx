"use client";

import { useState } from "react";
import { BackofficeFeedback } from "@/components/backoffice";
import type { EmpresaAssignmentStatus } from "@/lib/empresas/lifecycle-queries";

type ActionKind = "reclamar" | "soltar" | "nota";

type EmpresaOperativaActionsProps = {
  empresaId: string;
  assignmentStatus: EmpresaAssignmentStatus;
};

function actionLabel(status: EmpresaAssignmentStatus) {
  if (status === "tuya") {
    return "Liberar empresa";
  }
  if (status === "libre") {
    return "Asignármela";
  }
  return "Tomar control";
}

function actionEndpoint(status: EmpresaAssignmentStatus) {
  return status === "tuya" ? "soltar" : "reclamar";
}

export default function EmpresaOperativaActions({
  empresaId,
  assignmentStatus,
}: EmpresaOperativaActionsProps) {
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<ActionKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const action = actionLabel(assignmentStatus);

  async function postJson(endpoint: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/empresas/${empresaId}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "No se pudo completar la acción.");
    }

    return payload;
  }

  async function handleOwnershipAction() {
    setError(null);
    setMessage(null);
    if (!comment.trim()) {
      setError("Agrega un comentario para continuar.");
      return;
    }

    const kind: ActionKind = assignmentStatus === "tuya" ? "soltar" : "reclamar";
    setPending(kind);
    try {
      const payload = await postJson(actionEndpoint(assignmentStatus), {
        comentario: comment,
      });
      setComment("");
      setMessage(payload.message ?? "Acción guardada.");
      window.location.reload();
    } catch (actionError) {
      setError((actionError as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function handleNote() {
    setError(null);
    setMessage(null);
    if (!note.trim()) {
      setError("Escribe una nota antes de guardarla.");
      return;
    }

    setPending("nota");
    try {
      const payload = await postJson("notas", { contenido: note });
      setNote("");
      setMessage(payload.message ?? "Nota guardada.");
      window.location.reload();
    } catch (noteError) {
      setError((noteError as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <BackofficeFeedback variant="error">{error}</BackofficeFeedback> : null}
      {message ? (
        <BackofficeFeedback variant="success">{message}</BackofficeFeedback>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Asignación</h2>
        <p className="mt-1 text-sm text-gray-700">
          Las acciones de asignación requieren comentario y quedan en bitácora.
        </p>
        <label className="mt-4 block text-sm font-bold text-gray-900">
          Comentario
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Ejemplo: tomo seguimiento por solicitud de gerencia"
            className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-reca focus:outline-none focus:ring-2 focus:ring-reca/20"
            maxLength={500}
          />
        </label>
        <button
          type="button"
          onClick={handleOwnershipAction}
          disabled={pending !== null}
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-reca px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-reca-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending === "reclamar" || pending === "soltar"
            ? "Guardando cambios..."
            : action}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Agregar nota</h2>
        <p className="mt-1 text-sm text-gray-700">
          Sólo una nota explícita cierra la alerta de empresa nueva.
        </p>
        <label className="mt-4 block text-sm font-bold text-gray-900">
          Nota
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ejemplo: se agenda llamada de seguimiento para mayo"
            className="mt-1 min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-reca focus:outline-none focus:ring-2 focus:ring-reca/20"
            maxLength={2000}
          />
        </label>
        <button
          type="button"
          onClick={handleNote}
          disabled={pending !== null}
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending === "nota" ? "Guardando nota..." : "Agregar nota"}
        </button>
      </div>
    </div>
  );
}
