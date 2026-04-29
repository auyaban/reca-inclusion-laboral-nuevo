"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import {
  BackofficeFeedback,
  BackofficeField,
  BackofficePageHeader,
  BackofficeSectionCard,
  backofficeInputClassName,
} from "@/components/backoffice";
import TemporaryPasswordPanel from "@/components/profesionales/TemporaryPasswordPanel";
import { listAppRoleOptions, type AppRole } from "@/lib/auth/appRoles";
import { BROWSER_AUTOFILL_OFF_PROPS } from "@/lib/browserAutofill";
import {
  getRecaEmailLocalPart,
  PROFESIONAL_PROGRAM_OPTIONS,
} from "@/lib/profesionales/normalization";
import {
  createProfesionalSchema,
  updateProfesionalSchema,
  type ProfesionalFormInput,
} from "@/lib/profesionales/schemas";
import { cn } from "@/lib/utils";

type ProfesionalFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id: number;
    nombre_profesional: string;
    correo_profesional: string | null;
    programa: string | null;
    antiguedad: number | null;
    usuario_login: string | null;
    auth_user_id: string | null;
    roles: AppRole[];
  };
};

type SaveResponse =
  | {
      profesional?: { id: number };
      id?: number;
      temporaryPassword?: string;
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | Record<string, never>;

const roleOptions = listAppRoleOptions();

function getInitialValues(
  initialData: ProfesionalFormProps["initialData"]
): ProfesionalFormInput {
  return {
    accessMode: initialData?.auth_user_id ? "auth" : "catalogo",
    nombre_profesional: initialData?.nombre_profesional ?? "",
    correo_profesional: getRecaEmailLocalPart(initialData?.correo_profesional),
    programa:
      initialData?.programa === "Inclusión Laboral"
        ? "Inclusión Laboral"
        : "Inclusión Laboral",
    antiguedad: initialData?.antiguedad ?? null,
    usuario_login: initialData?.usuario_login ?? null,
    roles: initialData?.roles ?? [],
  };
}

export default function ProfesionalForm({ mode, initialData }: ProfesionalFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const schema = mode === "create" ? createProfesionalSchema : updateProfesionalSchema;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfesionalFormInput>({
    resolver: zodResolver(schema) as Resolver<ProfesionalFormInput>,
    defaultValues: getInitialValues(initialData),
  });
  const accessMode = useWatch({ control, name: "accessMode" });
  const nombreProfesional = useWatch({ control, name: "nombre_profesional" });
  const selectedRoles = useWatch({ control, name: "roles" }) ?? [];
  const rolesDisabled = accessMode !== "auth";

  useEffect(() => {
    const nombre = nombreProfesional?.trim();
    if (!nombre || nombre.split(/\s+/).length < 2) {
      setValue("usuario_login", initialData?.usuario_login ?? null, {
        shouldDirty: false,
        shouldValidate: false,
      });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ nombre });
    if (initialData?.id) {
      params.set("excludeId", String(initialData.id));
    }

    fetch(`/api/empresas/profesionales/login-sugerido?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (typeof payload?.usuarioLogin === "string") {
          setValue("usuario_login", payload.usuarioLogin, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("[ProfesionalForm] login suggestion failed", error);
        }
      });

    return () => controller.abort();
  }, [initialData?.id, initialData?.usuario_login, nombreProfesional, setValue]);

  function toggleRole(role: AppRole, checked: boolean) {
    const nextRoles = checked
      ? [...new Set([...selectedRoles, role])]
      : selectedRoles.filter((value) => value !== role);
    setValue("roles", nextRoles, { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: ProfesionalFormInput) {
    setServerError(null);
    setTemporaryPassword(null);

    const endpoint =
      mode === "create"
        ? "/api/empresas/profesionales"
        : `/api/empresas/profesionales/${initialData?.id}`;
    const response = await fetch(endpoint, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json().catch(() => ({}))) as SaveResponse;

    if (!response.ok) {
      setServerError(
        typeof payload.error === "string"
          ? payload.error
          : "No se pudo guardar el profesional."
      );
      return;
    }

    if (typeof payload.temporaryPassword === "string") {
      setTemporaryPassword(payload.temporaryPassword);
      router.refresh();
      return;
    }

    const id = payload.profesional?.id ?? payload.id ?? initialData?.id;
    router.push(`/hub/empresas/admin/profesionales/${id}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackofficePageHeader
        eyebrow="Profesionales"
        title={mode === "create" ? "Nuevo profesional" : "Editar profesional"}
        description="Gestiona los datos legacy y, cuando aplique, el acceso Auth y roles de Inclusión."
        backHref="/hub/empresas/admin/profesionales"
        backLabel="Volver a profesionales"
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        autoComplete="off"
        className="space-y-6"
      >
        {serverError ? (
          <BackofficeFeedback variant="error">{serverError}</BackofficeFeedback>
        ) : null}
        {temporaryPassword ? (
          <TemporaryPasswordPanel password={temporaryPassword} />
        ) : null}

        <BackofficeSectionCard title="Datos legacy">
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <BackofficeField
              label="Nombre profesional"
              error={errors.nombre_profesional?.message}
              className="sm:col-span-2"
            >
              <input
                {...BROWSER_AUTOFILL_OFF_PROPS}
                {...register("nombre_profesional")}
                className={backofficeInputClassName}
                placeholder="Ej. María del Pilar Gómez López"
              />
            </BackofficeField>
            <BackofficeField label="Correo" error={errors.correo_profesional?.message}>
              <div className="flex overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-reca focus-within:ring-2 focus-within:ring-reca/20">
                <input
                  {...BROWSER_AUTOFILL_OFF_PROPS}
                  {...register("correo_profesional")}
                  type="text"
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  aria-label="Correo"
                  placeholder="nombre.apellido"
                />
                <span className="border-l border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700">
                  @recacolombia.org
                </span>
              </div>
            </BackofficeField>
            <BackofficeField label="Usuario login" error={errors.usuario_login?.message}>
              <input
                {...BROWSER_AUTOFILL_OFF_PROPS}
                {...register("usuario_login")}
                readOnly
                className={backofficeInputClassName}
                placeholder="Se genera automáticamente"
              />
            </BackofficeField>
            <BackofficeField label="Programa">
              <select {...register("programa")} className={backofficeInputClassName}>
                {PROFESIONAL_PROGRAM_OPTIONS.map((programa) => (
                  <option key={programa} value={programa}>
                    {programa}
                  </option>
                ))}
              </select>
            </BackofficeField>
            <BackofficeField label="Antigüedad">
              <input
                {...BROWSER_AUTOFILL_OFF_PROPS}
                {...register("antiguedad")}
                type="number"
                min="0"
                className={backofficeInputClassName}
                placeholder="Ej. 12"
              />
            </BackofficeField>
          </div>
        </BackofficeSectionCard>

        <BackofficeSectionCard
          title="Acceso"
          description="Define si el perfil queda solo como catálogo o con acceso a la aplicación."
        >
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label
              className={cn(
                "rounded-xl border p-4 text-sm font-semibold text-gray-800",
                accessMode === "catalogo"
                  ? "border-reca bg-reca-50"
                  : "border-gray-200 bg-white"
              )}
            >
              <input
                {...register("accessMode")}
                type="radio"
                value="catalogo"
                disabled={mode === "edit" && Boolean(initialData?.auth_user_id)}
                className="mr-2"
              />
              Catálogo sin acceso
              <span className="mt-1 block text-xs font-medium text-gray-700">
                No puede iniciar sesión ni tener roles.
              </span>
            </label>
            <label
              className={cn(
                "rounded-xl border p-4 text-sm font-semibold text-gray-800",
                accessMode === "auth" ? "border-reca bg-reca-50" : "border-gray-200 bg-white"
              )}
            >
              <input
                {...register("accessMode")}
                type="radio"
                value="auth"
                disabled={mode === "edit" && !initialData?.auth_user_id}
                className="mr-2"
              />
              Con acceso Auth
              <span className="mt-1 block text-xs font-medium text-gray-700">
                Requiere correo, usuario login y al menos un rol.
              </span>
            </label>
          </div>
          {errors.accessMode ? (
            <span className="mt-2 block text-xs font-semibold text-red-700">
              {errors.accessMode.message}
            </span>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {roleOptions.map((role) => (
              <label
                key={role.value}
                className={cn(
                  "rounded-xl border p-4 text-sm font-bold",
                  rolesDisabled
                    ? "border-gray-200 bg-gray-50 text-gray-700"
                    : "border-gray-200 bg-white text-gray-900"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  disabled={rolesDisabled}
                  onChange={(event) =>
                    toggleRole(role.value, event.currentTarget.checked)
                  }
                  className="mr-2"
                />
                {role.label}
              </label>
            ))}
          </div>
          {errors.roles ? (
            <span className="mt-2 block text-xs font-semibold text-red-700">
              {errors.roles.message}
            </span>
          ) : null}
        </BackofficeSectionCard>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2.5 text-sm font-bold text-white hover:bg-reca-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar
        </button>
      </form>
    </main>
  );
}
