"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { listAppRoleOptions, type AppRole } from "@/lib/auth/appRoles";
import {
  deleteProfesionalSchema,
  enableProfesionalAccessSchema,
  type EnableProfesionalAccessInput,
} from "@/lib/profesionales/schemas";
import { getRecaEmailLocalPart } from "@/lib/profesionales/normalization";
import { BROWSER_AUTOFILL_OFF_PROPS } from "@/lib/browserAutofill";
import {
  BackofficeFeedback,
  BackofficeField,
  BackofficeSectionCard,
  backofficeInputClassName,
} from "@/components/backoffice";
import TemporaryPasswordPanel from "@/components/profesionales/TemporaryPasswordPanel";

type ProfesionalActionsProps = {
  profesional: {
    id: number;
    nombre_profesional: string;
    correo_profesional: string | null;
    usuario_login: string | null;
    auth_user_id: string | null;
    deleted_at: string | null;
  };
};

type ActionResponse = {
  temporaryPassword?: string;
  error?: string;
};

const roleOptions = listAppRoleOptions();

export default function ProfesionalActions({ profesional }: ProfesionalActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const enableForm = useForm<EnableProfesionalAccessInput>({
    resolver: zodResolver(
      enableProfesionalAccessSchema
    ) as Resolver<EnableProfesionalAccessInput>,
    defaultValues: {
      accessMode: "auth",
      correo_profesional: getRecaEmailLocalPart(profesional.correo_profesional),
      usuario_login: profesional.usuario_login ?? null,
      roles: [],
    },
  });
  const deleteForm = useForm<{ comentario: string }>({
    resolver: zodResolver(deleteProfesionalSchema) as Resolver<{
      comentario: string;
    }>,
    defaultValues: { comentario: "" },
  });
  const enableRoles =
    useWatch({ control: enableForm.control, name: "roles" }) ?? [];

  useEffect(() => {
    if (profesional.usuario_login || profesional.deleted_at || profesional.auth_user_id) {
      return;
    }

    const params = new URLSearchParams({
      nombre: profesional.nombre_profesional,
      excludeId: String(profesional.id),
    });

    fetch(`/api/empresas/profesionales/login-sugerido?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (typeof payload?.usuarioLogin === "string") {
          enableForm.setValue("usuario_login", payload.usuarioLogin, {
            shouldDirty: false,
            shouldValidate: true,
          });
        }
      })
      .catch((error) => {
        console.error("[ProfesionalActions] login suggestion failed", error);
      });
  }, [enableForm, profesional]);

  async function runAction(endpoint: string, init: RequestInit = {}) {
    setBusyAction(endpoint);
    setError(null);
    setMessage(null);
    setTemporaryPassword(null);
    const response = await fetch(endpoint, init);
    const payload = (await response.json().catch(() => ({}))) as ActionResponse;
    setBusyAction(null);

    if (!response.ok) {
      setError(
        typeof payload.error === "string"
          ? payload.error
          : "No se pudo completar la acción."
      );
      return null;
    }

    if (typeof payload.temporaryPassword === "string") {
      setTemporaryPassword(payload.temporaryPassword);
    }

    router.refresh();
    return payload;
  }

  async function onEnable(values: EnableProfesionalAccessInput) {
    const payload = await runAction(
      `/api/empresas/profesionales/${profesional.id}/enable-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }
    );
    if (payload) {
      setMessage("Acceso habilitado.");
    }
  }

  async function onReset() {
    const payload = await runAction(
      `/api/empresas/profesionales/${profesional.id}/reset-password`,
      { method: "POST" }
    );
    if (payload) {
      setMessage("Contraseña temporal generada.");
    }
  }

  async function onDelete(values: { comentario: string }) {
    const payload = await runAction(`/api/empresas/profesionales/${profesional.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (payload) {
      setMessage("Profesional eliminado.");
    }
  }

  async function onRestore() {
    const payload = await runAction(
      `/api/empresas/profesionales/${profesional.id}/restore`,
      { method: "POST" }
    );
    if (payload) {
      setMessage("Profesional restaurado como perfil sin acceso.");
    }
  }

  return (
    <aside className="space-y-4">
      {error ? (
        <BackofficeFeedback variant="error">
          {error}
        </BackofficeFeedback>
      ) : null}
      {message ? (
        <BackofficeFeedback variant="success">
          {message}
        </BackofficeFeedback>
      ) : null}
      {temporaryPassword ? (
        <TemporaryPasswordPanel password={temporaryPassword} />
      ) : null}

      {profesional.deleted_at ? (
        <BackofficeSectionCard
          title="Restaurar"
          description="Restaura el registro como perfil sin acceso. Gerencia deberá habilitar Auth y roles nuevamente si aplica."
          icon={RotateCcw}
          accent="teal"
        >
          <button
            type="button"
            onClick={onRestore}
            disabled={Boolean(busyAction)}
            className="inline-flex items-center gap-2 rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white hover:bg-reca-700 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </button>
        </BackofficeSectionCard>
      ) : null}

      {!profesional.deleted_at && !profesional.auth_user_id ? (
        <form onSubmit={enableForm.handleSubmit(onEnable)} autoComplete="off">
          <BackofficeSectionCard
            title="Habilitar acceso"
            description="Crea o enlaza el usuario Auth y genera una contraseña temporal única."
            icon={ShieldCheck}
            accent="reca"
          >
            <div className="space-y-4">
              <BackofficeField
                label="Correo"
                error={enableForm.formState.errors.correo_profesional?.message}
              >
                <div className="mt-1 flex overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <input
                    {...BROWSER_AUTOFILL_OFF_PROPS}
                    {...enableForm.register("correo_profesional")}
                    type="text"
                    className="min-w-0 flex-1 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    aria-label="Correo"
                    placeholder="nombre.apellido"
                  />
                  <span className="border-l border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
                    @recacolombia.org
                  </span>
                </div>
              </BackofficeField>
              <BackofficeField
                label="Usuario login"
                error={enableForm.formState.errors.usuario_login?.message}
              >
                <input
                  {...BROWSER_AUTOFILL_OFF_PROPS}
                  {...enableForm.register("usuario_login")}
                  readOnly
                  className={backofficeInputClassName}
                  placeholder="Se genera automáticamente"
                />
              </BackofficeField>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">Roles</p>
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className="block text-sm font-medium text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={enableRoles.includes(role.value)}
                      onChange={(event) => {
                        const next = event.currentTarget.checked
                          ? [...new Set([...enableRoles, role.value as AppRole])]
                          : enableRoles.filter((value) => value !== role.value);
                        enableForm.setValue("roles", next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      className="mr-2"
                    />
                    {role.label}
                  </label>
                ))}
                {enableForm.formState.errors.roles ? (
                  <p className="text-xs font-semibold text-red-700">
                    {enableForm.formState.errors.roles.message}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="submit"
              disabled={Boolean(busyAction)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white hover:bg-reca-700 disabled:opacity-60"
            >
              {busyAction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Habilitar acceso
            </button>
          </BackofficeSectionCard>
        </form>
      ) : null}

      {!profesional.deleted_at && profesional.auth_user_id ? (
        <BackofficeSectionCard
          title="Contraseña"
          description="Genera una contraseña temporal nueva y obliga cambio al iniciar."
          icon={ShieldCheck}
          accent="amber"
        >
          <button
            type="button"
            onClick={onReset}
            disabled={Boolean(busyAction)}
            className="inline-flex items-center gap-2 rounded-xl border border-reca px-4 py-2 text-sm font-semibold text-reca-800 hover:bg-reca-50 disabled:opacity-60"
          >
            Resetear contraseña
          </button>
        </BackofficeSectionCard>
      ) : null}

      {!profesional.deleted_at ? (
        <form onSubmit={deleteForm.handleSubmit(onDelete)} autoComplete="off">
          <BackofficeSectionCard
            title="Eliminar"
            description="Es un soft delete. Si tenía empresas asignadas, quedarán liberadas."
            icon={Trash2}
            accent="red"
            className="border-red-200"
          >
            <textarea
              {...BROWSER_AUTOFILL_OFF_PROPS}
              {...deleteForm.register("comentario")}
              placeholder="Comentario obligatorio"
              className={`${backofficeInputClassName} min-h-24`}
            />
            {deleteForm.formState.errors.comentario ? (
              <span className="mt-2 block text-xs font-semibold text-red-700">
                {deleteForm.formState.errors.comentario.message}
              </span>
            ) : null}
            <button
              type="submit"
              disabled={Boolean(busyAction)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar profesional
            </button>
          </BackofficeSectionCard>
        </form>
      ) : null}
    </aside>
  );
}
