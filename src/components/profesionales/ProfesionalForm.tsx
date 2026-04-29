"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { listAppRoleOptions, type AppRole } from "@/lib/auth/appRoles";
import {
  createProfesionalSchema,
  updateProfesionalSchema,
  type ProfesionalFormInput,
} from "@/lib/profesionales/schemas";
import { cn } from "@/lib/utils";
import TemporaryPasswordPanel from "@/components/profesionales/TemporaryPasswordPanel";

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
    correo_profesional: initialData?.correo_profesional ?? null,
    programa: initialData?.programa ?? null,
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
  const selectedRoles = useWatch({ control, name: "roles" }) ?? [];
  const rolesDisabled = accessMode !== "auth";

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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/hub/empresas/admin/profesionales"
          className="inline-flex items-center gap-2 text-sm font-semibold text-reca hover:text-reca-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a profesionales
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {mode === "create" ? "Nuevo profesional" : "Editar profesional"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona los datos legacy y, cuando aplique, el acceso Auth y roles de
          Inclusión.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        {serverError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        ) : null}
        {temporaryPassword ? (
          <TemporaryPasswordPanel password={temporaryPassword} />
        ) : null}

        <section>
          <h2 className="text-base font-bold text-gray-900">Datos legacy</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Nombre profesional
              <input
                {...register("nombre_profesional")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
              {errors.nombre_profesional ? (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.nombre_profesional.message}
                </span>
              ) : null}
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Correo
              <input
                {...register("correo_profesional")}
                type="email"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
              {errors.correo_profesional ? (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.correo_profesional.message}
                </span>
              ) : null}
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Usuario login
              <input
                {...register("usuario_login")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
              {errors.usuario_login ? (
                <span className="mt-1 block text-xs text-red-600">
                  {errors.usuario_login.message}
                </span>
              ) : null}
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Programa
              <input
                {...register("programa")}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Antigüedad
              <input
                {...register("antiguedad")}
                type="number"
                min="0"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900">Acceso</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label
              className={cn(
                "rounded-lg border p-4 text-sm",
                accessMode === "catalogo"
                  ? "border-reca bg-reca-50"
                  : "border-gray-200"
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
              <span className="mt-1 block text-xs text-gray-500">
                No puede iniciar sesión ni tener roles.
              </span>
            </label>
            <label
              className={cn(
                "rounded-lg border p-4 text-sm",
                accessMode === "auth" ? "border-reca bg-reca-50" : "border-gray-200"
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
              <span className="mt-1 block text-xs text-gray-500">
                Requiere correo, usuario login y al menos un rol.
              </span>
            </label>
          </div>
          {errors.accessMode ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.accessMode.message}
            </span>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {roleOptions.map((role) => (
              <label
                key={role.value}
                className={cn(
                  "rounded-lg border p-4 text-sm font-semibold",
                  rolesDisabled
                    ? "border-gray-200 bg-gray-50 text-gray-400"
                    : "border-gray-200 text-gray-800"
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
            <span className="mt-1 block text-xs text-red-600">
              {errors.roles.message}
            </span>
          ) : null}
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-reca px-4 py-2 text-sm font-semibold text-white hover:bg-reca-700 disabled:cursor-not-allowed disabled:opacity-60"
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
