import {
  normalizeEmpresaPhone,
  normalizeEmpresaNullableText,
  normalizeEmpresaTitleText,
} from "@/lib/empresas/normalization";

export type EmpresaContactInput = {
  nombre?: string | null;
  cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
};

export type EmpresaContact = {
  nombre: string | null;
  cargo: string | null;
  telefono: string | null;
  correo: string | null;
};

type LegacyContactFields = {
  responsable_visita?: string | null;
  contacto_empresa?: string | null;
  cargo?: string | null;
  telefono_empresa?: string | null;
  correo_1?: string | null;
};

type ContactNormalizationOptions = {
  preserveLegacyContactValues?: boolean;
};

type ContactValidationIssue = {
  field: "contacto_empresa" | "cargo" | "telefono_empresa" | "correo_1";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{1,10}$/;

function normalizeText(value: unknown) {
  const normalized = normalizeEmpresaNullableText(value);
  return typeof normalized === "string" ? normalized : null;
}

function normalizeTitle(value: unknown) {
  const normalized = normalizeEmpresaTitleText(value);
  return typeof normalized === "string" ? normalized : null;
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLocaleLowerCase("es-CO") : null;
}

function normalizePhone(value: unknown, options?: ContactNormalizationOptions) {
  const normalized = options?.preserveLegacyContactValues
    ? normalizeEmpresaNullableText(value)
    : normalizeEmpresaPhone(value);
  return typeof normalized === "string" ? normalized : null;
}

function normalizeContact(
  input: EmpresaContactInput,
  options?: ContactNormalizationOptions
): EmpresaContact {
  return {
    nombre: normalizeTitle(input.nombre),
    cargo: normalizeTitle(input.cargo),
    telefono: normalizePhone(input.telefono, options),
    correo: normalizeEmail(input.correo),
  };
}

function hasAnyValue(contact: EmpresaContact) {
  return Boolean(contact.nombre || contact.cargo || contact.telefono || contact.correo);
}

function joinLegacy(values: Array<string | null>) {
  if (values.every((value) => !value)) {
    return null;
  }

  return values.map((value) => value ?? "").join(";");
}

function splitLegacy(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value.split(";").map((item) => normalizeText(item) ?? "");
}

function readAt(values: string[], index: number) {
  return values[index] ? values[index] : null;
}

export function serializeEmpresaContacts(
  input: {
    responsable: EmpresaContactInput;
    adicionales?: EmpresaContactInput[];
  },
  options?: ContactNormalizationOptions
): Required<LegacyContactFields> {
  const responsable = normalizeContact(input.responsable, options);
  const adicionales = (input.adicionales ?? [])
    .map((contact) => normalizeContact(contact, options))
    .filter(hasAnyValue);
  const contacts = [responsable, ...adicionales];

  return {
    responsable_visita: responsable.nombre,
    contacto_empresa: joinLegacy(contacts.map((contact) => contact.nombre)),
    cargo: joinLegacy(contacts.map((contact) => contact.cargo)),
    telefono_empresa: joinLegacy(contacts.map((contact) => contact.telefono)),
    correo_1: joinLegacy(contacts.map((contact) => contact.correo)),
  };
}

export function deserializeEmpresaContacts(
  fields: LegacyContactFields,
  options?: ContactNormalizationOptions
): { responsable: EmpresaContact; adicionales: EmpresaContact[] } {
  const nombres = splitLegacy(fields.contacto_empresa);
  const cargos = splitLegacy(fields.cargo);
  const telefonos = splitLegacy(fields.telefono_empresa);
  const correos = splitLegacy(fields.correo_1);
  const total = Math.max(
    1,
    nombres.length,
    cargos.length,
    telefonos.length,
    correos.length
  );
  const responsableNombre =
    normalizeTitle(fields.responsable_visita) ?? normalizeTitle(readAt(nombres, 0));
  const responsable = normalizeContact(
    {
      nombre: responsableNombre,
      cargo: readAt(cargos, 0),
      telefono: readAt(telefonos, 0),
      correo: readAt(correos, 0),
    },
    options
  );
  const adicionales: EmpresaContact[] = [];

  for (let index = 1; index < total; index += 1) {
    const contact = normalizeContact(
      {
        nombre: readAt(nombres, index),
        cargo: readAt(cargos, index),
        telefono: readAt(telefonos, index),
        correo: readAt(correos, index),
      },
      options
    );
    if (hasAnyValue(contact)) {
      adicionales.push(contact);
    }
  }

  return { responsable, adicionales };
}

export function validateSerializedEmpresaContacts(
  fields: Pick<
    LegacyContactFields,
    "contacto_empresa" | "cargo" | "telefono_empresa" | "correo_1"
  >
): ContactValidationIssue[] {
  const nombres = splitLegacy(fields.contacto_empresa);
  const cargos = splitLegacy(fields.cargo);
  const telefonos = splitLegacy(fields.telefono_empresa);
  const correos = splitLegacy(fields.correo_1);
  const total = Math.max(nombres.length, cargos.length, telefonos.length, correos.length);
  const issues: ContactValidationIssue[] = [];

  for (const correo of correos) {
    if (correo && !EMAIL_PATTERN.test(correo)) {
      issues.push({
        field: "correo_1",
        message: "Ingresa correos de contacto válidos.",
      });
      break;
    }
  }

  for (const telefono of telefonos) {
    if (telefono && !PHONE_PATTERN.test(telefono)) {
      issues.push({
        field: "telefono_empresa",
        message: "El teléfono solo puede contener números y máximo 10 dígitos.",
      });
      break;
    }
  }

  for (let index = 1; index < total; index += 1) {
    const hasOtherData = Boolean(cargos[index] || telefonos[index] || correos[index]);
    if (hasOtherData && !nombres[index]) {
      issues.push({
        field: "contacto_empresa",
        message: "Cada contacto adicional debe tener nombre.",
      });
      break;
    }
    if (nombres[index] && !cargos[index]) {
      issues.push({
        field: "cargo",
        message: "Cada contacto adicional debe tener cargo.",
      });
      break;
    }
  }

  return issues;
}
