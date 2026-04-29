"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import {
  EMPRESA_CAJA_OPTIONS,
  EMPRESA_ESTADO_OPTIONS,
  EMPRESA_GESTION_OPTIONS,
} from "@/lib/empresas/constants";
import {
  deserializeEmpresaContacts,
  serializeEmpresaContacts,
  validateSerializedEmpresaContacts,
  type EmpresaContact,
} from "@/lib/empresas/contacts";
import {
  createEmpresaSchema,
  updateEmpresaSchema,
  type EmpresaUpdateInput,
} from "@/lib/empresas/schemas";
import type { EmpresaRow } from "@/lib/empresas/server";
import {
  BROWSER_AUTOFILL_OFF_PROPS,
  BROWSER_AUTOFILL_SEARCH_GUARD_PROPS,
} from "@/lib/browserAutofill";
import {
  BackofficeFeedback,
  BackofficeField as Field,
  BackofficeSectionCard,
  backofficeInputClassName,
} from "@/components/backoffice";

type EmpresaCatalogos = {
  profesionales: Array<{ id: number; nombre: string; correo: string | null }>;
  asesores: Array<{ nombre: string; email: string | null }>;
  zonasCompensar: string[];
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
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type EmpresaFieldErrors = Partial<Record<keyof EmpresaUpdateInput, string[]>>;

function textDefault(value: string | null | undefined) {
  return value ?? "";
}

function numberDefault(value: number | null | undefined) {
  return value ? String(value) : "";
}

function contactDefault(): EmpresaContact {
  return { nombre: null, cargo: null, telefono: null, correo: null };
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

const inputClassName = backofficeInputClassName;
const INVALID_FORM_MESSAGE = "Revisa los campos obligatorios antes de guardar.";
const LEGACY_DATA_WARNING =
  "Esta empresa tiene datos históricos incompletos. Puedes guardar cambios, pero conviene normalizarla cuando sea posible.";

function hasIncompleteLegacyData(empresa: EmpresaRow) {
  const requiredFields = [
    empresa.nombre_empresa,
    empresa.nit_empresa,
    empresa.direccion_empresa,
    empresa.ciudad_empresa,
    empresa.sede_empresa,
    empresa.zona_empresa,
    empresa.gestion,
    empresa.estado,
    empresa.asesor,
    empresa.correo_asesor,
    empresa.caja_compensacion,
    empresa.profesional_asignado_id,
  ];
  const contacts = deserializeEmpresaContacts(empresa);
  const responsableIncomplete = !(
    contacts.responsable.nombre &&
    contacts.responsable.cargo &&
    contacts.responsable.telefono &&
    contacts.responsable.correo
  );
  const contactIssues = validateSerializedEmpresaContacts(empresa);

  return (
    requiredFields.some((value) => !value) ||
    responsableIncomplete ||
    contactIssues.length > 0
  );
}


export default function EmpresaForm(props: EmpresaFormProps) {
  const router = useRouter();
  const preserveLegacyContactValues = props.mode === "edit";
  const initialContacts = deserializeEmpresaContacts(
    props.mode === "edit"
      ? props.empresa
      : {
          responsable_visita: null,
          contacto_empresa: null,
          cargo: null,
          telefono_empresa: null,
          correo_1: null,
        },
    { preserveLegacyContactValues }
  );
  const [responsable, setResponsable] = useState<EmpresaContact>(
    initialContacts.responsable
  );
  const [additionalContacts, setAdditionalContacts] = useState<EmpresaContact[]>(
    initialContacts.adicionales
  );
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null,
  });
  const [fieldErrorMessages, setFieldErrorMessages] = useState<
    Partial<Record<keyof EmpresaUpdateInput, string>>
  >({});
  const formSchema =
    props.mode === "create" ? createEmpresaSchema : updateEmpresaSchema;
  const showLegacyDataWarning =
    props.mode === "edit" && hasIncompleteLegacyData(props.empresa);
  const form = useForm<EmpresaUpdateInput>({
    resolver: zodResolver(formSchema) as unknown as Resolver<EmpresaUpdateInput>,
    defaultValues: buildDefaultValues(props),
  });
  const asesorValue = useWatch({ control: form.control, name: "asesor" }) ?? "";
  const correoAsesorValue =
    useWatch({ control: form.control, name: "correo_asesor" }) ?? "";
  const errors = form.formState.errors;
  const zonaOptions = [
    ...new Set(
      [
        ...props.catalogos.zonasCompensar,
        props.mode === "edit" ? props.empresa.zona_empresa : null,
      ].filter(Boolean) as string[]
    ),
  ];

  function syncContactFields(
    nextResponsable = responsable,
    nextAdditionalContacts = additionalContacts,
    shouldValidate = false
  ) {
    const contactFields = serializeEmpresaContacts(
      {
        responsable: nextResponsable,
        adicionales: nextAdditionalContacts,
      },
      { preserveLegacyContactValues }
    );

    form.setValue("responsable_visita", contactFields.responsable_visita, {
      shouldDirty: true,
      shouldValidate,
    });
    form.setValue("contacto_empresa", contactFields.contacto_empresa, {
      shouldDirty: true,
      shouldValidate,
    });
    form.setValue("cargo", contactFields.cargo, {
      shouldDirty: true,
      shouldValidate,
    });
    form.setValue("telefono_empresa", contactFields.telefono_empresa, {
      shouldDirty: true,
      shouldValidate,
    });
    form.setValue("correo_1", contactFields.correo_1, {
      shouldDirty: true,
      shouldValidate,
    });

    return contactFields;
  }

  function updateResponsable(field: keyof EmpresaContact, value: string) {
    setResponsable((current) => {
      const next = { ...current, [field]: value };
      syncContactFields(next, additionalContacts, true);
      return next;
    });
  }

  function updateAdditionalContact(
    index: number,
    field: keyof EmpresaContact,
    value: string
  ) {
    setAdditionalContacts((current) => {
      const next = current.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact
      );
      syncContactFields(responsable, next, true);
      return next;
    });
  }

  function addAdditionalContact() {
    setAdditionalContacts((current) => {
      const next = [...current, contactDefault()];
      syncContactFields(responsable, next, true);
      return next;
    });
  }

  function removeAdditionalContact(index: number) {
    setAdditionalContacts((current) => {
      const next = current.filter((_, contactIndex) => contactIndex !== index);
      syncContactFields(responsable, next, true);
      return next;
    });
  }

  function applyServerFieldErrors(fieldErrors: EmpresaFieldErrors | undefined) {
    if (!fieldErrors) {
      return;
    }

    const nextErrors: Partial<Record<keyof EmpresaUpdateInput, string>> = {};
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0];
      if (!message) {
        continue;
      }

      nextErrors[field as keyof EmpresaUpdateInput] = message;
      form.setError(field as keyof EmpresaUpdateInput, {
        type: "server",
        message,
      });
    }
    setFieldErrorMessages((current) => ({ ...current, ...nextErrors }));
  }

  function getFieldError(field: keyof EmpresaUpdateInput) {
    return fieldErrorMessages[field] ?? errors[field]?.message;
  }

  function readFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
    const nextErrors: Partial<Record<keyof EmpresaUpdateInput, string>> = {};
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0];
      if (message) {
        nextErrors[field as keyof EmpresaUpdateInput] = message;
      }
    }
    return nextErrors;
  }

  function handleAsesorChange(value: string) {
    form.setValue("asesor", value, { shouldDirty: true, shouldValidate: true });
    const selected = props.catalogos.asesores.find(
      (asesor) =>
        asesor.nombre.toLocaleLowerCase("es-CO") === value.toLocaleLowerCase("es-CO")
    );
    if (selected?.email) {
      form.setValue("correo_asesor", selected.email, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(values: EmpresaUpdateInput) {
    form.clearErrors();
    setFieldErrorMessages({});
    setSubmitState({ status: "saving", message: "Guardando cambios..." });
    const contactFields = syncContactFields(responsable, additionalContacts, false);
    const endpoint =
      props.mode === "create"
        ? "/api/empresas"
        : `/api/empresas/${props.empresa.id}`;
    const response = await fetch(endpoint, {
      method: props.mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, ...contactFields }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      applyServerFieldErrors(payload?.fieldErrors);
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

    if (props.mode === "create" && id) {
      router.push(`/hub/empresas/admin/empresas/${id}`);
      return;
    }

    setSubmitState({ status: "success", message: "Cambios guardados." });
    router.refresh();
  }

  function onInvalid() {
    const currentValues = {
      ...form.getValues(),
      ...syncContactFields(responsable, additionalContacts, false),
    };
    const parsed = formSchema.safeParse(currentValues);
    setFieldErrorMessages(
      parsed.success ? {} : readFieldErrors(parsed.error.flatten().fieldErrors)
    );
    setSubmitState({
      status: "error",
      message: INVALID_FORM_MESSAGE,
    });
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    syncContactFields(responsable, additionalContacts, false);
    void form.handleSubmit(onSubmit, onInvalid)(event);
  }

  function handleFormChange() {
    if (Object.keys(fieldErrorMessages).length > 0) {
      setFieldErrorMessages({});
    }
    if (submitState.status === "error" || submitState.status === "success") {
      setSubmitState({ status: "idle", message: null });
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") {
      return;
    }

    const confirmed = window.confirm(
      "Esta acción eliminará la empresa del listado. ¿Puedes continuar?"
    );
    if (!confirmed) {
      return;
    }

    setSubmitState({ status: "saving", message: "Eliminando registro..." });
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
    <form
      onSubmit={handleFormSubmit}
      onChangeCapture={handleFormChange}
      noValidate
      autoComplete="off"
      className="space-y-6"
    >
      {submitState.status === "error" ? (
        <BackofficeFeedback variant="error">
          {submitState.message}
        </BackofficeFeedback>
      ) : null}
      {submitState.status === "success" ? (
        <BackofficeFeedback variant="success">
          {submitState.message}
        </BackofficeFeedback>
      ) : null}
      {submitState.status === "saving" && submitState.message ? (
        <BackofficeFeedback variant="loading">
          {submitState.message}
        </BackofficeFeedback>
      ) : null}
      {showLegacyDataWarning ? (
        <BackofficeFeedback variant="warning">
          {LEGACY_DATA_WARNING}
        </BackofficeFeedback>
      ) : null}

      <BackofficeSectionCard title="Empresa">
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre de la empresa"
            error={getFieldError("nombre_empresa")}
          >
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. Industrias Andinas S. A. S."
              {...form.register("nombre_empresa")}
            />
          </Field>
          <Field label="NIT" error={getFieldError("nit_empresa")}>
            <input
              {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
              className={inputClassName}
              placeholder="Ej. 900123456-7"
              {...form.register("nit_empresa")}
            />
          </Field>
          <Field label="Dirección" error={getFieldError("direccion_empresa")}>
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. Calle 80 # 15-20"
              {...form.register("direccion_empresa")}
            />
          </Field>
          <Field label="Ciudad" error={getFieldError("ciudad_empresa")}>
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. Bogotá"
              {...form.register("ciudad_empresa")}
            />
          </Field>
          <Field label="Sede empresa" error={getFieldError("sede_empresa")}>
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. Sede principal"
              {...form.register("sede_empresa")}
            />
          </Field>
          <Field label="Zona Compensar" error={getFieldError("zona_empresa")}>
            <select className={inputClassName} {...form.register("zona_empresa")}>
              <option value="">Selecciona una zona</option>
              {zonaOptions.map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gestión" error={getFieldError("gestion")}>
            <select className={inputClassName} {...form.register("gestion")}>
              {EMPRESA_GESTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado" error={getFieldError("estado")}>
            <select className={inputClassName} {...form.register("estado")}>
              {EMPRESA_ESTADO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </BackofficeSectionCard>

      <BackofficeSectionCard title="Responsable de visita">
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre responsable de visita"
            error={
              getFieldError("responsable_visita") ??
              getFieldError("contacto_empresa")
            }
          >
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. Sandra Pachón"
              value={responsable.nombre ?? ""}
              onChange={(event) => updateResponsable("nombre", event.target.value)}
            />
          </Field>
          <Field label="Cargo responsable de visita" error={getFieldError("cargo")}>
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. Gerente de Talento Humano"
              value={responsable.cargo ?? ""}
              onChange={(event) => updateResponsable("cargo", event.target.value)}
            />
          </Field>
          <Field
            label="Teléfono responsable de visita"
            error={getFieldError("telefono_empresa")}
          >
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              placeholder="Ej. 3001234567"
              value={responsable.telefono ?? ""}
              onChange={(event) => updateResponsable("telefono", event.target.value)}
            />
          </Field>
          <Field label="Correo responsable de visita" error={getFieldError("correo_1")}>
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              type="email"
              placeholder="Ej. contacto@empresa.com"
              value={responsable.correo ?? ""}
              onChange={(event) => updateResponsable("correo", event.target.value)}
            />
          </Field>
        </div>
      </BackofficeSectionCard>

      <BackofficeSectionCard
        title="Contactos"
        action={
          <button
            type="button"
            onClick={addAdditionalContact}
            className="inline-flex items-center justify-center rounded-xl border border-reca px-4 py-2 text-sm font-bold text-reca-800 hover:bg-reca-50"
          >
            Agregar contacto adicional
          </button>
        }
      >
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Primer contacto
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-4">
            <Field label="Nombre primer contacto" labelClassName="min-h-10">
              <input
                className={inputClassName}
                placeholder="Se replica del responsable"
                value={responsable.nombre ?? ""}
                readOnly
              />
            </Field>
            <Field label="Cargo primer contacto" labelClassName="min-h-10">
              <input
                className={inputClassName}
                placeholder="Se replica del responsable"
                value={responsable.cargo ?? ""}
                readOnly
              />
            </Field>
            <Field label="Teléfono primer contacto" labelClassName="min-h-10">
              <input
                className={inputClassName}
                placeholder="Se replica del responsable"
                value={responsable.telefono ?? ""}
                readOnly
              />
            </Field>
            <Field label="Correo primer contacto" labelClassName="min-h-10">
              <input
                className={inputClassName}
                placeholder="Se replica del responsable"
                value={responsable.correo ?? ""}
                readOnly
              />
            </Field>
          </div>
        </div>
        {additionalContacts.map((contact, index) => (
          <div
            key={index}
            className="mt-4 rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-700">
                Contacto adicional {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeAdditionalContact(index)}
                aria-label={`Eliminar contacto adicional ${index + 1}`}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-50"
              >
                Eliminar contacto adicional
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              <Field
                label={`Nombre contacto adicional ${index + 1}`}
                labelClassName="min-h-10"
              >
                <input
                  {...BROWSER_AUTOFILL_OFF_PROPS}
                  className={inputClassName}
                  placeholder="Ej. Laura Pérez"
                  value={contact.nombre ?? ""}
                  onChange={(event) =>
                    updateAdditionalContact(index, "nombre", event.target.value)
                  }
                />
              </Field>
              <Field
                label={`Cargo contacto adicional ${index + 1}`}
                labelClassName="min-h-10"
              >
                <input
                  {...BROWSER_AUTOFILL_OFF_PROPS}
                  className={inputClassName}
                  placeholder="Ej. Coordinadora administrativa"
                  value={contact.cargo ?? ""}
                  onChange={(event) =>
                    updateAdditionalContact(index, "cargo", event.target.value)
                  }
                />
              </Field>
              <Field
                label={`Teléfono contacto adicional ${index + 1}`}
                labelClassName="min-h-10"
              >
                <input
                  {...BROWSER_AUTOFILL_OFF_PROPS}
                  className={inputClassName}
                  placeholder="Ej. 3011234567"
                  value={contact.telefono ?? ""}
                  onChange={(event) =>
                    updateAdditionalContact(index, "telefono", event.target.value)
                  }
                />
              </Field>
              <Field
                label={`Correo contacto adicional ${index + 1}`}
                labelClassName="min-h-10"
              >
                <input
                  {...BROWSER_AUTOFILL_OFF_PROPS}
                  className={inputClassName}
                  type="email"
                  placeholder="Ej. contacto.adicional@empresa.com"
                  value={contact.correo ?? ""}
                  onChange={(event) =>
                    updateAdditionalContact(index, "correo", event.target.value)
                  }
                />
              </Field>
            </div>
          </div>
        ))}
      </BackofficeSectionCard>

      <BackofficeSectionCard title="Compensar">
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Caja de compensación"
            error={getFieldError("caja_compensacion")}
          >
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
          <Field label="Asesor" error={getFieldError("asesor")}>
            <input
              {...BROWSER_AUTOFILL_SEARCH_GUARD_PROPS}
              className={inputClassName}
              list="empresa-asesores-list"
              placeholder="Escribe o selecciona un asesor"
              value={asesorValue}
              onChange={(event) => handleAsesorChange(event.currentTarget.value)}
            />
            <datalist id="empresa-asesores-list">
              {props.catalogos.asesores.map((asesor) => (
                <option key={asesor.nombre} value={asesor.nombre} />
              ))}
            </datalist>
          </Field>
          <Field label="Correo asesor" error={getFieldError("correo_asesor")}>
            <input
              {...BROWSER_AUTOFILL_OFF_PROPS}
              className={inputClassName}
              type="email"
              placeholder="Ej. asesor@compensar.com"
              value={correoAsesorValue}
              onChange={(event) =>
                form.setValue("correo_asesor", event.currentTarget.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </Field>
        </div>
      </BackofficeSectionCard>

      <BackofficeSectionCard title="RECA">
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Profesional asignado"
            error={getFieldError("profesional_asignado_id")}
          >
            <select
              className={inputClassName}
              {...form.register("profesional_asignado_id")}
              defaultValue={numberDefault(
                props.mode === "edit"
                  ? props.empresa.profesional_asignado_id
                  : null
              )}
            >
              <option value="">Selecciona un profesional</option>
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
      </BackofficeSectionCard>

      <BackofficeSectionCard title="Observaciones">
        <textarea
          {...BROWSER_AUTOFILL_OFF_PROPS}
          aria-label="Observaciones"
          className="mt-4 min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-reca focus:ring-2 focus:ring-reca/20"
          placeholder="Ej. Cliente solicita seguimiento en mayo."
          {...form.register("observaciones")}
          defaultValue={textDefault(
            props.mode === "edit" ? props.empresa.observaciones : null
          )}
        />
      </BackofficeSectionCard>

      <input type="hidden" {...form.register("responsable_visita")} />
      <input type="hidden" {...form.register("contacto_empresa")} />
      <input type="hidden" {...form.register("cargo")} />
      <input type="hidden" {...form.register("telefono_empresa")} />
      <input type="hidden" {...form.register("correo_1")} />
      <input type="hidden" {...form.register("previous_estado")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {props.mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitState.status === "saving"}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-800 hover:bg-red-50"
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-reca px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-reca-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState.status === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitState.status === "saving"
            ? "Guardando..."
            : props.mode === "create"
              ? "Crear empresa"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
