// cspell:ignore acta condicion contratacion evaluacion induccion sensibilizacion seguimiento

export type EmpresaLifecycleFormatType =
  | "presentacion"
  | "evaluacion"
  | "condiciones-vacante"
  | "seleccion"
  | "contratacion"
  | "sensibilizacion"
  | "induccion-organizacional"
  | "induccion-operativa"
  | "seguimiento"
  | "otro";

export type EmpresaLifecycleCompanyType =
  | "compensar"
  | "no_compensar"
  | "unknown";

export type EmpresaLifecycleSourceEmpresa = {
  id: string;
  nombre_empresa: string | null;
  nit_empresa: string | null;
  caja_compensacion: string | null;
};

export type EmpresaLifecycleEvidenceRow = {
  registro_id: string;
  nombre_formato: string | null;
  nombre_empresa: string | null;
  created_at: string | null;
  finalizado_at_colombia: string | null;
  finalizado_at_iso: string | null;
  path_formato: string | null;
  payload_source: string | null;
  payload_schema_version: string | null;
  payload_generated_at: string | null;
  acta_ref: string | null;
  payload_normalized: unknown;
};

export type EmpresaLifecycleEvidenceSummary = {
  id: string;
  registroId: string;
  type: EmpresaLifecycleFormatType;
  label: string;
  sourceFormat: string | null;
  date: string | null;
  createdAt: string | null;
  professionalName: string | null;
  cargo: string | null;
  personCedula: string | null;
  personName: string | null;
  seguimientoNumero: number | null;
  pdfLink: string | null;
  sheetLink: string | null;
  actaRef: string | null;
  source: string | null;
  schemaVersion: string | null;
  warnings: string[];
};

export type EmpresaLifecycleCompanyStage = {
  type: Extract<
    EmpresaLifecycleFormatType,
    | "presentacion"
    | "evaluacion"
    | "sensibilizacion"
    | "induccion-organizacional"
  >;
  label: string;
  latestAt: string | null;
  evidence: EmpresaLifecycleEvidenceSummary[];
  warnings: string[];
};

export type EmpresaLifecyclePersonBranch = {
  cedula: string;
  nombre: string | null;
  cargo: string | null;
  status: "seleccionada" | "contratada" | "en_seguimiento" | "archivada";
  selectedAt: string | null;
  contractedAt: string | null;
  evidence: EmpresaLifecycleEvidenceSummary[];
  seguimientos: EmpresaLifecycleEvidenceSummary[];
  warnings: string[];
};

export type EmpresaLifecycleProfileBranch = {
  id: string;
  cargo: string;
  cargoKey: string;
  latestAt: string | null;
  evidence: EmpresaLifecycleEvidenceSummary[];
  people: EmpresaLifecyclePersonBranch[];
  warnings: string[];
};

export type EmpresaLifecycleWarningCode =
  | "unknown_company_type"
  | "evidence_limit_reached"
  | "matched_by_name_fallback"
  | "missing_company_key"
  | "missing_date"
  | "missing_profile"
  | "missing_person_key"
  | "contract_without_selection"
  | "unclassified_format";

export type EmpresaLifecycleWarning = {
  code: EmpresaLifecycleWarningCode;
  message: string;
  evidenceId?: string;
};

export type EmpresaLifecycleTree = {
  empresa: {
    id: string;
    nombreEmpresa: string | null;
    nitEmpresa: string | null;
    cajaCompensacion: string | null;
    companyType: EmpresaLifecycleCompanyType;
  };
  summary: {
    companyStages: number;
    profiles: number;
    people: number;
    archivedBranches: number;
    unclassifiedEvidence: number;
    dataQualityWarnings: number;
  };
  companyStages: EmpresaLifecycleCompanyStage[];
  profileBranches: EmpresaLifecycleProfileBranch[];
  peopleWithoutProfile: EmpresaLifecyclePersonBranch[];
  archivedBranches: EmpresaLifecyclePersonBranch[];
  unclassifiedEvidence: EmpresaLifecycleEvidenceSummary[];
  dataQualityWarnings: EmpresaLifecycleWarning[];
  generatedAt: string;
};

type BuildOptions = {
  empresa: EmpresaLifecycleSourceEmpresa;
  rows: EmpresaLifecycleEvidenceRow[];
  now?: Date;
  evidenceLimitReached?: boolean;
  nameFallbackEvidenceIds?: string[];
};

type JsonRecord = Record<string, unknown>;

type ExtractedEvidence = EmpresaLifecycleEvidenceSummary & {
  companyName: string | null;
  nitEmpresa: string | null;
  cajaCompensacion: string | null;
  cargoKey: string | null;
};

type MutablePersonBranch = EmpresaLifecyclePersonBranch & {
  profileKey: string | null;
  contracted: boolean;
};

const COMPANY_STAGE_ORDER: EmpresaLifecycleCompanyStage["type"][] = [
  "presentacion",
  "evaluacion",
  "sensibilizacion",
  "induccion-organizacional",
];

const FORMAT_LABELS: Record<EmpresaLifecycleFormatType, string> = {
  presentacion: "Presentacion del programa",
  evaluacion: "Evaluacion de accesibilidad",
  "condiciones-vacante": "Condiciones de vacante",
  seleccion: "Seleccion",
  contratacion: "Contratacion",
  sensibilizacion: "Sensibilizacion",
  "induccion-organizacional": "Induccion organizacional",
  "induccion-operativa": "Induccion operativa",
  seguimiento: "Seguimiento",
  otro: "Evidencia sin clasificar",
};

const NAME_FALLBACK_WARNING =
  "Evidencia asociada por nombre de empresa; validar NIT cuando sea posible.";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value: unknown) {
  const text = cleanText(value);
  if (!text) {
    return "";
  }

  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("es-CO");
}

export function normalizeLifecycleDigits(value: unknown) {
  // Lifecycle matching uses digits only because finalized legacy payloads store
  // NITs with inconsistent punctuation and DV separators. Do not reuse this for
  // empresa write normalization, where normalizeEmpresaNit preserves more input.
  return cleanText(value)?.replace(/\D+/g, "") || "";
}

function readString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function readHttpUrl(record: JsonRecord, keys: string[]) {
  const value = readString(record, keys);
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function readNumber(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    const text = cleanText(value);
    if (text) {
      const parsed = Number.parseInt(text.replace(/\D+/g, ""), 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readParsedRaw(payload: unknown): JsonRecord {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.parsed_raw)) {
    return payload.parsed_raw;
  }

  return payload;
}

function readParticipants(raw: JsonRecord) {
  const participants = raw.participantes;
  if (!Array.isArray(participants)) {
    return [];
  }

  return participants.filter(isRecord);
}

function evidenceDate(row: EmpresaLifecycleEvidenceRow, raw: JsonRecord) {
  return (
    readString(raw, ["fecha_servicio", "fecha", "fecha_ingreso"]) ??
    cleanText(row.finalizado_at_iso) ??
    cleanText(row.finalizado_at_colombia) ??
    cleanText(row.created_at)
  );
}

function compareEvidenceDate(
  left: { date: string | null; createdAt: string | null },
  right: { date: string | null; createdAt: string | null }
) {
  const leftValue = Date.parse(left.date ?? left.createdAt ?? "");
  const rightValue = Date.parse(right.date ?? right.createdAt ?? "");
  const safeLeft = Number.isFinite(leftValue) ? leftValue : 0;
  const safeRight = Number.isFinite(rightValue) ? rightValue : 0;
  return safeLeft - safeRight;
}

function latestDate(items: EmpresaLifecycleEvidenceSummary[]) {
  return [...items].sort(compareEvidenceDate).at(-1)?.date ?? null;
}

function lifecycleLabel(type: EmpresaLifecycleFormatType, seguimientoNumero: number | null) {
  if (type === "seguimiento" && seguimientoNumero) {
    return `Seguimiento ${seguimientoNumero}`;
  }

  return FORMAT_LABELS[type];
}

export function normalizeLifecycleFormatType(
  nombreFormato: string | null | undefined
): EmpresaLifecycleFormatType {
  const key = normalizeKey(nombreFormato);

  if (key.includes("presentacion")) {
    return "presentacion";
  }
  if (key.includes("evaluacion") && key.includes("accesibilidad")) {
    return "evaluacion";
  }
  if (
    key.includes("condiciones") ||
    key.includes("condicion") ||
    key.includes("revision condicion")
  ) {
    return "condiciones-vacante";
  }
  if (key.includes("seleccion")) {
    return "seleccion";
  }
  if (key.includes("contratacion")) {
    return "contratacion";
  }
  if (key.includes("sensibilizacion")) {
    return "sensibilizacion";
  }
  if (key.includes("induccion") && key.includes("organizacional")) {
    return "induccion-organizacional";
  }
  if (key.includes("induccion") && key.includes("operativa")) {
    return "induccion-operativa";
  }
  if (key.includes("seguimiento")) {
    return "seguimiento";
  }

  return "otro";
}

export function resolveLifecycleCompanyType(
  cajaCompensacion: string | null | undefined
): EmpresaLifecycleCompanyType {
  const key = normalizeKey(cajaCompensacion);
  if (!key) {
    return "unknown";
  }

  if (key.includes("no compensar")) {
    return "no_compensar";
  }

  if (key.includes("compensar")) {
    return "compensar";
  }

  return "unknown";
}

function buildWarning(
  code: EmpresaLifecycleWarningCode,
  message: string,
  evidenceId?: string
): EmpresaLifecycleWarning {
  return evidenceId ? { code, message, evidenceId } : { code, message };
}

function baseEvidenceFromRow(
  row: EmpresaLifecycleEvidenceRow,
  raw: JsonRecord,
  person?: JsonRecord,
  index = 0
): ExtractedEvidence {
  const type = normalizeLifecycleFormatType(row.nombre_formato);
  const personCedula =
    normalizeLifecycleDigits(
      person
        ? readString(person, ["cedula_usuario", "cedula", "documento_usuario"])
        : readString(raw, [
            "linked_person_cedula",
            "vinculado_cedula",
            "cedula_usuario",
          ])
    ) || null;
  const personName =
    (person
      ? readString(person, ["nombre_usuario", "nombre", "nombre_persona"])
      : readString(raw, [
          "linked_person_name",
          "vinculado_nombre",
          "nombre_usuario",
        ])) ?? null;
  const cargo =
    (person ? readString(person, ["cargo_servicio", "cargo"]) : null) ??
    readString(raw, ["cargo_objetivo", "cargo_servicio", "cargo"]);
  const seguimientoNumero = readNumber(raw, [
    "seguimiento_numero",
    "seguimiento_servicio",
  ]);
  const id = personCedula
    ? `${row.registro_id}:${personCedula}`
    : index > 0
      ? `${row.registro_id}:${index}`
      : row.registro_id;
  const warnings: string[] = [];

  const date = evidenceDate(row, raw);
  if (!date) {
    warnings.push("Sin fecha operativa confiable.");
  }

  return {
    id,
    registroId: row.registro_id,
    type,
    label: lifecycleLabel(type, seguimientoNumero),
    sourceFormat: row.nombre_formato,
    date,
    createdAt: row.created_at,
    professionalName: readString(raw, ["nombre_profesional", "profesional"]),
    cargo,
    cargoKey: cargo ? normalizeKey(cargo) : null,
    personCedula,
    personName,
    seguimientoNumero,
    pdfLink: readHttpUrl(raw, ["pdf_link"]),
    sheetLink: readHttpUrl(raw, ["sheet_link"]),
    actaRef: row.acta_ref,
    source: row.payload_source,
    schemaVersion: row.payload_schema_version,
    warnings,
    companyName: readString(raw, ["nombre_empresa"]) ?? cleanText(row.nombre_empresa),
    nitEmpresa: readString(raw, ["nit_empresa"]),
    cajaCompensacion: readString(raw, ["caja_compensacion"]),
  };
}

function extractEvidenceRows(row: EmpresaLifecycleEvidenceRow): ExtractedEvidence[] {
  const raw = readParsedRaw(row.payload_normalized);
  const type = normalizeLifecycleFormatType(row.nombre_formato);

  if (type === "seleccion" || type === "contratacion") {
    const participants = readParticipants(raw);
    if (participants.length > 0) {
      return participants.map((participant, index) =>
        baseEvidenceFromRow(row, raw, participant, index + 1)
      );
    }
  }

  if (type === "seguimiento") {
    const participants = readParticipants(raw);
    if (participants.length > 0) {
      return participants.map((participant, index) =>
        baseEvidenceFromRow(row, raw, participant, index + 1)
      );
    }
  }

  return [baseEvidenceFromRow(row, raw)];
}

function addGlobalWarning(
  warnings: EmpresaLifecycleWarning[],
  evidence: EmpresaLifecycleEvidenceSummary,
  code: EmpresaLifecycleWarningCode,
  message: string
) {
  evidence.warnings.push(message);
  warnings.push(buildWarning(code, message, evidence.id));
}

function addEvidenceToPerson(
  person: MutablePersonBranch,
  evidence: EmpresaLifecycleEvidenceSummary
) {
  person.evidence.push(evidence);
  person.evidence.sort(compareEvidenceDate);

  if (evidence.type === "contratacion") {
    person.status = "contratada";
    person.contracted = true;
    person.contractedAt = evidence.date;
  }

  if (evidence.type === "induccion-operativa") {
    person.status = "en_seguimiento";
  }

  if (evidence.type === "seguimiento") {
    person.status = "en_seguimiento";
    person.seguimientos.push(evidence);
    person.seguimientos.sort(compareEvidenceDate);
  }
}

function selectedWithoutContractOlderThan(
  person: MutablePersonBranch,
  now: Date
) {
  if (person.contracted || !person.selectedAt) {
    return false;
  }

  const selectedAt = Date.parse(person.selectedAt);
  if (!Number.isFinite(selectedAt)) {
    return false;
  }

  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - 6);
  return selectedAt <= threshold.getTime();
}

function publicPerson(person: MutablePersonBranch): EmpresaLifecyclePersonBranch {
  return {
    cedula: person.cedula,
    nombre: person.nombre,
    cargo: person.cargo,
    status: person.status,
    selectedAt: person.selectedAt,
    contractedAt: person.contractedAt,
    evidence: person.evidence,
    seguimientos: person.seguimientos,
    warnings: person.warnings,
  };
}

function createPerson(evidence: ExtractedEvidence): MutablePersonBranch {
  return {
    cedula: evidence.personCedula ?? "sin-cedula",
    nombre: evidence.personName,
    cargo: evidence.cargo,
    status: evidence.type === "contratacion" ? "contratada" : "seleccionada",
    selectedAt: evidence.type === "seleccion" ? evidence.date : null,
    contractedAt: evidence.type === "contratacion" ? evidence.date : null,
    evidence: [],
    seguimientos: [],
    warnings: [],
    profileKey: null,
    contracted: evidence.type === "contratacion",
  };
}

export function buildEmpresaLifecycleTree(options: BuildOptions): EmpresaLifecycleTree {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const dataQualityWarnings: EmpresaLifecycleWarning[] = [];
  const companyStages = new Map<
    EmpresaLifecycleCompanyStage["type"],
    EmpresaLifecycleCompanyStage
  >();
  const profiles = new Map<string, EmpresaLifecycleProfileBranch>();
  const people = new Map<string, MutablePersonBranch>();
  const unclassifiedEvidence: EmpresaLifecycleEvidenceSummary[] = [];
  const companyType = resolveLifecycleCompanyType(options.empresa.caja_compensacion);
  const nameFallbackEvidenceIds = new Set(options.nameFallbackEvidenceIds ?? []);

  if (companyType === "unknown") {
    dataQualityWarnings.push(
      buildWarning(
        "unknown_company_type",
        "No se pudo identificar si la empresa es Compensar o No Compensar."
      )
    );
  }

  if (options.evidenceLimitReached) {
    dataQualityWarnings.push(
      buildWarning(
        "evidence_limit_reached",
        "La consulta alcanzo el limite seguro de evidencias."
      )
    );
  }

  for (const evidence of options.rows.flatMap(extractEvidenceRows)) {
    if (
      nameFallbackEvidenceIds.has(evidence.registroId) ||
      nameFallbackEvidenceIds.has(evidence.id)
    ) {
      addGlobalWarning(
        dataQualityWarnings,
        evidence,
        "matched_by_name_fallback",
        NAME_FALLBACK_WARNING
      );
    }

    if (!evidence.nitEmpresa && !evidence.companyName) {
      addGlobalWarning(
        dataQualityWarnings,
        evidence,
        "missing_company_key",
        "Evidencia sin NIT ni nombre de empresa."
      );
    }

    if (!evidence.date) {
      dataQualityWarnings.push(
        buildWarning(
          "missing_date",
          "Evidencia sin fecha operativa confiable.",
          evidence.id
        )
      );
    }

    if (COMPANY_STAGE_ORDER.includes(evidence.type as EmpresaLifecycleCompanyStage["type"])) {
      const stageType = evidence.type as EmpresaLifecycleCompanyStage["type"];
      const current =
        companyStages.get(stageType) ??
        ({
          type: stageType,
          label: FORMAT_LABELS[stageType],
          latestAt: null,
          evidence: [],
          warnings: [],
        } satisfies EmpresaLifecycleCompanyStage);
      current.evidence.push(evidence);
      current.evidence.sort(compareEvidenceDate);
      current.latestAt = latestDate(current.evidence);
      current.warnings = [
        ...new Set(current.evidence.flatMap((item) => item.warnings)),
      ];
      companyStages.set(stageType, current);
      continue;
    }

    if (evidence.type === "condiciones-vacante") {
      if (!evidence.cargo || !evidence.cargoKey) {
        addGlobalWarning(
          dataQualityWarnings,
          evidence,
          "missing_profile",
          "Condiciones de vacante sin cargo objetivo."
        );
        unclassifiedEvidence.push(evidence);
        continue;
      }

      const profile =
        profiles.get(evidence.cargoKey) ??
        ({
          id: `profile:${evidence.cargoKey}`,
          cargo: evidence.cargo,
          cargoKey: evidence.cargoKey,
          latestAt: null,
          evidence: [],
          people: [],
          warnings: [],
        } satisfies EmpresaLifecycleProfileBranch);
      profile.evidence.push(evidence);
      profile.evidence.sort(compareEvidenceDate);
      profile.latestAt = latestDate(profile.evidence);
      profiles.set(evidence.cargoKey, profile);
      continue;
    }

    if (
      evidence.type === "seleccion" ||
      evidence.type === "contratacion" ||
      evidence.type === "induccion-operativa" ||
      evidence.type === "seguimiento"
    ) {
      if (!evidence.personCedula) {
        addGlobalWarning(
          dataQualityWarnings,
          evidence,
          "missing_person_key",
          "Evidencia de persona sin cedula."
        );
        unclassifiedEvidence.push(evidence);
        continue;
      }

      const person = people.get(evidence.personCedula) ?? createPerson(evidence);
      person.nombre = person.nombre ?? evidence.personName;
      person.cargo = person.cargo ?? evidence.cargo;

      if (
        !person.profileKey &&
        evidence.cargoKey &&
        profiles.has(evidence.cargoKey)
      ) {
        person.profileKey = evidence.cargoKey;
      }

      if (evidence.type === "seleccion") {
        person.selectedAt = person.selectedAt ?? evidence.date;
      }

      if (evidence.type === "contratacion" && person.selectedAt === null) {
        person.warnings.push("Contratacion sin seleccion previa detectada.");
        dataQualityWarnings.push(
          buildWarning(
            "contract_without_selection",
            "Contratacion sin seleccion previa detectada.",
            evidence.id
          )
        );
      }

      addEvidenceToPerson(person, evidence);
      people.set(evidence.personCedula, person);
      continue;
    }

    dataQualityWarnings.push(
      buildWarning(
        "unclassified_format",
        "Formato fuera del ciclo de vida inicial.",
        evidence.id
      )
    );
    unclassifiedEvidence.push(evidence);
  }

  const peopleWithoutProfile: EmpresaLifecyclePersonBranch[] = [];
  const archivedBranches: EmpresaLifecyclePersonBranch[] = [];

  for (const person of people.values()) {
    if (selectedWithoutContractOlderThan(person, options.now ?? new Date())) {
      person.status = "archivada";
      archivedBranches.push(publicPerson(person));
      continue;
    }

    if (person.profileKey && profiles.has(person.profileKey)) {
      profiles.get(person.profileKey)?.people.push(publicPerson(person));
      continue;
    }

    peopleWithoutProfile.push(publicPerson(person));
  }

  const profileBranches = [...profiles.values()]
    .map((profile) => ({
      ...profile,
      people: profile.people.sort((left, right) =>
        (left.nombre ?? left.cedula).localeCompare(
          right.nombre ?? right.cedula,
          "es"
        )
      ),
    }))
    .sort((left, right) => left.cargo.localeCompare(right.cargo, "es"));

  const orderedCompanyStages = COMPANY_STAGE_ORDER.flatMap((type) => {
    const stage = companyStages.get(type);
    return stage ? [stage] : [];
  });

  const activePeopleCount =
    profileBranches.reduce((count, profile) => count + profile.people.length, 0) +
    peopleWithoutProfile.length;

  return {
    empresa: {
      id: options.empresa.id,
      nombreEmpresa: options.empresa.nombre_empresa,
      nitEmpresa: options.empresa.nit_empresa,
      cajaCompensacion: options.empresa.caja_compensacion,
      companyType,
    },
    summary: {
      companyStages: orderedCompanyStages.length,
      profiles: profileBranches.length,
      people: activePeopleCount,
      archivedBranches: archivedBranches.length,
      unclassifiedEvidence: unclassifiedEvidence.length,
      dataQualityWarnings: dataQualityWarnings.length,
    },
    companyStages: orderedCompanyStages,
    profileBranches,
    peopleWithoutProfile: peopleWithoutProfile.sort((left, right) =>
      (left.nombre ?? left.cedula).localeCompare(right.nombre ?? right.cedula, "es")
    ),
    archivedBranches: archivedBranches.sort((left, right) =>
      (left.nombre ?? left.cedula).localeCompare(right.nombre ?? right.cedula, "es")
    ),
    unclassifiedEvidence: unclassifiedEvidence.sort(compareEvidenceDate),
    dataQualityWarnings,
    generatedAt,
  };
}
