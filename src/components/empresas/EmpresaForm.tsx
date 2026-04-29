"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Trash2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import {
  EMPRESA_CAJA_OPTIONS,
  EMPRESA_ESTADO_OPTIONS,
  EMPRESA_GESTION_OPTIONS,
} from "@/lib/empresas/constants";
import { updateEmpresaSchema, type EmpresaUpdateInput } from "@/lib/empresas/schemas";
import type { EmpresaRow } from "@/lib/empresas/server";

type EmpresaCatalogos = {
  profesionales: Array<{ id: number; nombre: string; correo: string | null }>;
  asesores: Array<{ nombre: string; email: string | null }>;
};

type EmpresaFormProps =
  | {
      mode: "create";
      catalogos: EmpresaCatalogos;
      empresa?: never;
    }
  | {
      mode: "edit";
      catalogos: EmpresaCatalogos;
      empresa: EmpresaRow;
    };

type SubmitState =
  | { status: "idle"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "error"; message: string };

function textDefault(value: string | null | undefined) {
  return value ?? "";
}

function numberDefault(value: number | null | undefined) {
  return value ? String(value) : "";
}

function buildDefaultValues(props: EmpresaFormProps): EmpresaUpdateInput {
  if (props.mode === "create") {
    return {
      nombre_empresa: "",
      nit_empresa: null,
      direccion_empresa: null,
      ciudad_empresa: null,
      sede_empresa: null,
      zona_empresa: null,
      correo_1: null,
      contacto_empresa: null,
      telefono_empresa: null,
      cargo: null,
      responsable_visita: null,
      profesional_asignado_id: null,
      asesor: null,
      correo_asesor: null,
      caja_compensacion: "Compensar",
      estado: "En Proceso",
      observaciones: null,
      gestion: "RECA",
      comentario: null,
      previous_estado: null,
    };
  }

  return {
    nombre_empresa: props.empresa.nombre_empresa,
    nit_empresa: props.empresa.nit_empresa,
    direccion_empresa: props.empresa.direccion_empresa,
    ciudad_empresa: props.empresa.ciudad_empresa,
    sede_empresa: props.empresa.sede_empresa,
    zona_empresa: props.empresa.zona_empresa,
    correo_1: props.empresa.correo_1,
    contacto_empresa: props.empresa.contacto_empresa,
    telefono_empresa: props.empresa.telefono_empresa,
    cargo: props.empresa.cargo,
    responsable_visita: props.empresa.responsable_visita,
    profesional_asignado_id: props.empresa.profesional_asignado_id,
    asesor: props.empresa.asesor,
    correo_asesor: props.empresa.correo_asesor,
    caja_compensacion:
      props.empresa.caja_compensacion === "No Compensar"
        ? "No Compensar"
        : "Compensar",
    estado:
      props.empresa.estado === "Activa" ||
      props.empresa.estado === "Pausada" ||
      props.empresa.estado === "Cerrada" ||
      props.empresa.estado === "Inactiva"
        ? props.empresa.estado
        : "En Proceso",
    observaciones: props.empresa.observaciones,
    gestion: props.empresa.gestion === "COMPENSAR" ? "COMPENSAR" : "RECA",
    comentario: null,
    previous_estado:
      props.empresa.estado === "Activa" ||
      props.empresa.estado === "En Proceso" ||
      props.empresa.estado === "Pausada" ||
      props.empresa.estado === "Cerrada" ||
      props.empresa.estado === "Inactiva"
        ? props.empresa.estado
        : null,
  };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-reca focus:ring-2 focus:ring-reca/15";

export default function EmpresaForm(props: EmpresaFormProps) {
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null,
  });
  const form = useForm<EmpresaUpdateInput>({
    resolver: zodResolver(updateEmpresaSchema) as unknown as Resolver<EmpresaUpdateInput>,
    defaultValues: buildDefaultValues(props),
  });
  const errors = form.formState.errors;

  async function onSubmit(values: EmpresaUpdateInput) {
    setSubmitState({ status: "saving", message: null });
    const endpoint =
      props.mode === "create"
        ? "/api/empresas"
        : `/api/empresas/${props.empresa.id}`;
    const response = await fetch(endpoint, {
      method: props.mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitState({
        status: "error",
        message: payload?.error ?? "No se pudo guardar la empresa.",
      });
      return;
    }

    const id =
      typeof payload?.id === "string"
        ? payload.id
        : props.mode === "edit"
          ? props.empresa.id
          : null;

    if (id) {
      router.push(`/hub/empresas/admin/empresas/${id}`);
      router.refresh();
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") {
      return;
    }

    const confirmed = window.confirm(
      "Esta accion eliminara la empresa del listado. Puedes continuar?"
    );
    if (!confirmed) {
      return;
    }

    setSubmitState({ status: "saving", message: null });
    const comentario = form.getValues("comentario");
    const response = await fetch(`/api/empresas/${props.empresa.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setSubmitState({
        status: "error",
        message: payload?.error ?? "No se pudo eliminar la empresa.",
      });
      return;
    }

    router.push("/hub/empresas/admin/empresas");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {submitState.status === "error" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {submitState.message}
        </div>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Empresa</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre de la empresa"
            error={errors.nombre_empresa?.message}
          >
            <input
              className={inputClassName}
              {...form.register("nombre_empresa")}
            />
          </Field>
          <Field label="NIT">
            <input className={inputClassName} {...form.register("nit_empresa")} />
          </Field>
          <Field label="Direccion">
            <input
              className={inputClassName}
              {...form.register("direccion_empresa")}
            />
          </Field>
          <Field label="Ciudad">
            <input
              className={inputClassName}
              {...form.register("ciudad_empresa")}
            />
          </Field>
          <Field label="Sede">
            <input
              className={inputClassName}
              {...form.register("sede_empresa")}
            />
          </Field>
          <Field label="Zona">
            <input
              className={inputClassName}
              {...form.register("zona_empresa")}
            />
          </Field>
          <Field label="Gestion" error={errors.gestion?.message}>
            <select className={inputClassName} {...form.register("gestion")}>
              {EMPRESA_GESTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado" error={errors.estado?.message}>
            <select className={inputClassName} {...form.register("estado")}>
              {EMPRESA_ESTADO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable visita">
            <input
              className={inputClassName}
              {...form.register("responsable_visita")}
            />
          </Field>
          <Field label="Cargo">
            <input className={inputClassName} {...form.register("cargo")} />
          </Field>
          <Field label="Contacto">
            <input
              className={inputClassName}
              {...form.register("contacto_empresa")}
            />
          </Field>
          <Field label="Telefono">
            <input
              className={inputClassName}
              {...form.register("telefono_empresa")}
            />
          </Field>
          <Field label="Correo">
            <input className={inputClassName} {...form.register("correo_1")} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Compensar</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Caja de compensacion">
            <select
              className={inputClassName}
              {...form.register("caja_compensacion")}
            >
              {EMPRESA_CAJA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Asesor">
            <select className={inputClassName} {...form.register("asesor")}>
              <option value="">Sin asesor</option>
              {props.catalogos.asesores.map((asesor) => (
                <option key={asesor.nombre} value={asesor.nombre}>
                  {asesor.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Correo asesor">
            <input
              className={inputClassName}
              {...form.register("correo_asesor")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">RECA</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Profesional asignado">
            <select
              className={inputClassName}
              {...form.register("profesional_asignado_id")}
              defaultValue={numberDefault(
                props.mode === "edit"
                  ? props.empresa.profesional_asignado_id
                  : null
              )}
            >
              <option value="">Sin asignar</option>
              {props.catalogos.profesionales.map((profesional) => (
                <option key={profesional.id} value={profesional.id}>
                  {profesional.nombre}
                  {profesional.correo ? ` (${profesional.correo})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comentario de cambio">
            <textarea
              className={inputClassName}
              rows={3}
              {...form.register("comentario")}
              placeholder="Opcional, excepto al cambiar estado"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Observaciones</h2>
        <textarea
          className="mt-4 min-h-28 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-reca focus:ring-2 focus:ring-reca/15"
          {...form.register("observaciones")}
          defaultValue={textDefault(
            props.mode === "edit" ? props.empresa.observaciones : null
          )}
        />
      </section>

      <input type="hidden" {...form.register("previous_estado")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {props.mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={submitState.status === "saving"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-reca px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-reca-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {props.mode === "create" ? "Crear empresa" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
