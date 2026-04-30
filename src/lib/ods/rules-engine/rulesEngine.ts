export type TarifaRow = {
  codigo_servicio: string | null;
  referencia_servicio: string | null;
  descripcion_servicio: string | null;
  modalidad_servicio: string | null;
  valor_base: number | null;
};

export type CompanyRow = {
  nombre_empresa: string | null;
  nit_empresa: string | null;
  ciudad_empresa: string | null;
  sede_empresa: string | null;
  zona_empresa: string | null;
  caja_compensacion: string | null;
  correo_profesional: string | null;
  profesional_asignado: string | null;
  asesor: string | null;
};

export type DecisionSuggestion = {
  codigo_servicio?: string;
  referencia_servicio?: string;
  descripcion_servicio?: string;
  modalidad_servicio?: string;
  valor_base?: number;
  observaciones?: string;
  observacion_agencia?: string;
  seguimiento_servicio?: string;
  confidence: "low" | "medium" | "high";
  rationale: string[];
};

export type RulesEngineInput = {
  analysis: Record<string, unknown>;
  message: { subject?: string };
  tarifas: TarifaRow[];
  companyByNit: (nit: string) => CompanyRow | null;
};

function normalizeText(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedModalidad(value: string): string {
  const text = normalizeText(value || "");
  if (text.includes("virtual")) return "Virtual";
  if (text.includes("bogota")) return "Bogota";
  if (text.includes("fuera") || text.includes("otro")) return "Fuera de Bogota";
  return "";
}

function firstNonEmpty(analysis: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = String(analysis[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function managementFamily(analysis: Record<string, unknown>): [string, string, boolean] {
  const rawValue = firstNonEmpty(analysis, "gestion_servicio", "gestion_empresarial", "tipo_gestion", "gestion");
  const normalized = normalizeText(rawValue);
  if (normalized.includes("compensar")) return ["compensar", "Gestion detectada en el acta/templete: COMPENSAR.", false];
  if (normalized.includes("reca")) return ["reca", "Gestion detectada en el acta/templete: RECA.", false];
  return ["reca", "No se detecto gestion en el acta; se aplica valor por defecto RECA.", true];
}

function companySizeBucket(analysis: Record<string, unknown>): [string, string, boolean] {
  const rawValue = firstNonEmpty(analysis, "tamano_empresa", "tamano_empresa_servicio", "size_bucket");
  const normalized = normalizeText(rawValue);
  if (["hasta 50", "menos de 50", "<50", "micro", "pequena"].some((t) => normalized.includes(t))) {
    return ["hasta_50", "Tamano de empresa detectado: hasta 50 trabajadores.", false];
  }
  if (["desde 51", "51", ">50", "mas de 50", "grande"].some((t) => normalized.includes(t))) {
    return ["desde_51", "Tamano de empresa detectado: desde 51 trabajadores.", false];
  }

  const workersRaw = firstNonEmpty(analysis, "cantidad_trabajadores", "numero_trabajadores", "total_trabajadores");
  const workersMatch = workersRaw.trim().match(/^\d+/);
  if (workersMatch) {
    const workers = parseInt(workersMatch[0], 10);
    if (workers <= 50) return ["hasta_50", `Tamano de empresa inferido desde total de trabajadores: ${workers}.`, false];
    return ["desde_51", `Tamano de empresa inferido desde total de trabajadores: ${workers}.`, false];
  }

  return ["hasta_50", "No se detecto tamano de empresa; se aplica valor por defecto hasta 50 trabajadores.", true];
}

function extractCompanyNits(analysis: Record<string, unknown>): string[] {
  const nitRe = /\b\d{6,12}(?:-\d)?\b/g;
  const rawSources: unknown[] = [
    analysis.nits_empresas,
    analysis.nit_empresas,
    analysis.nits_detectados,
    analysis.multi_nits,
    analysis.nit_empresa,
  ];
  const collected: string[] = [];
  const seen = new Set<string>();
  for (const source of rawSources) {
    if (!source) continue;
    const values = Array.isArray(source) ? source : [source];
    for (const value of values) {
      const matches = String(value ?? "").match(nitRe);
      if (matches) {
        for (const nit of matches) {
          if (!seen.has(nit)) {
            seen.add(nit);
            collected.push(nit);
          }
        }
      }
    }
  }
  return collected;
}

function promotionCompanyCount(analysis: Record<string, unknown>): [number, string, boolean] {
  const explicitCount = firstNonEmpty(analysis, "cantidad_empresas", "numero_empresas", "company_count");
  const explicitDigits = explicitCount.replace(/\D/g, "");
  if (explicitDigits) {
    const count = Math.max(1, parseInt(explicitDigits, 10));
    return [count, `Cantidad de empresas detectada en el acta/templete: ${count}.`, false];
  }

  const nitCount = extractCompanyNits(analysis).length;
  if (nitCount > 1) return [nitCount, `Cantidad de empresas inferida desde ${nitCount} NIT(s) detectados.`, false];

  return [1, "No se detecto cantidad de empresas; se aplica valor por defecto 1 empresa.", true];
}

function promotionBucketToken(count: number): [string, string] {
  if (count <= 1) return ["individual", "Promocion clasificada como individual."];
  if (count <= 3) return ["2-3 empresas", "Promocion clasificada en rango de 2 a 3 empresas."];
  if (count <= 5) return ["4-5 empresas", "Promocion clasificada en rango de 4 a 5 empresas."];
  if (count <= 10) return ["6-10 empresas", "Promocion clasificada en rango de 6 a 10 empresas."];
  if (count <= 15) return ["11-15 empresas", "Promocion clasificada en rango de 11 a 15 empresas."];
  return ["mas de 15 empresas", "Promocion clasificada en rango de mas de 15 empresas."];
}

function selectTarifa(tarifas: TarifaRow[], predicate: (row: TarifaRow) => boolean): TarifaRow | null {
  for (const row of tarifas) {
    if (predicate(row)) return row;
  }
  return null;
}

function selectionSizeBucket(participants: unknown[]): [string, string] {
  const count = participants.length;
  if (count <= 1) return ["individual", "Cantidad de oferentes detectada: 1."];
  if (count <= 4) return ["2-4", "Cantidad de oferentes detectada entre 2 y 4."];
  if (count <= 7) return ["5-7", "Cantidad de oferentes detectada entre 5 y 7."];
  return ["8+", "Cantidad de oferentes detectada mayor o igual a 8."];
}

function cleanObservationText(value: string): string {
  return String(value || "").trim().replace(/\s+/g, " ").trim();
}

function extractVacancyCount(analysis: Record<string, unknown>): number {
  for (const key of ["total_vacantes", "cantidad_vacantes", "numero_vacantes", "vacantes"]) {
    const raw = String(analysis[key] ?? "").trim();
    if (!raw) continue;
    const digits = raw.replace(/\D/g, "");
    if (digits) return parseInt(digits, 10);
  }
  const processText = cleanObservationText(
    `${analysis.cargo_objetivo ?? ""} ${analysis.process_name_hint ?? ""} ${analysis.file_path ?? ""}`
  );
  const match = processText.match(/\((\d+)\)/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

function extractCargoObjetivo(analysis: Record<string, unknown>): string {
  for (const key of ["cargo_objetivo", "cargo_servicio", "cargo", "nombre_cargo"]) {
    const value = cleanObservationText(String(analysis[key] ?? ""));
    if (value) return value.replace(/\s*\(\d+\)\s*$/, "").trim();
  }
  const processName = cleanObservationText(String(analysis.process_name_hint ?? ""));
  if (processName) {
    let cleaned = processName.replace(/\s*\(\d+\)\s*$/, "").trim();
    cleaned = cleaned.replace(/^proceso de seleccion incluyente(?: individual)?/i, "").replace(/^[\s-:]+|[\s-:]+$/g, "");
    cleaned = cleaned.replace(/^proceso de contratacion incluyente(?: individual)?/i, "").replace(/^[\s-:]+|[\s-:]+$/g, "");
    cleaned = cleaned.replace(/^revision de las condiciones de la vacante/i, "").replace(/^[\s-:]+|[\s-:]+$/g, "");
    cleaned = cleaned.replace(/^revision condicion de vacante/i, "").replace(/^[\s-:]+|[\s-:]+$/g, "");
    if (cleaned && cleaned !== processName) return cleaned;
  }
  return "";
}

function extractFollowUpNumber(analysis: Record<string, unknown>): string {
  for (const key of ["numero_seguimiento", "seguimiento_numero", "seguimiento_servicio"]) {
    const raw = cleanObservationText(String(analysis[key] ?? ""));
    if (raw) {
      const digits = raw.replace(/\D/g, "");
      return digits || raw;
    }
  }
  const combined = `${analysis.process_name_hint ?? ""} ${analysis.file_path ?? ""}`;
  const match = combined.match(/seguimiento\s*(?:no\.?|numero|nro\.?|#)?\s*(\d+)/i);
  if (match) return match[1];
  return "";
}

function buildDocumentObservaciones(analysis: Record<string, unknown>, documentKind: string): string {
  if (["vacancy_review", "inclusive_selection", "inclusive_hiring"].includes(documentKind)) {
    const cargo = extractCargoObjetivo(analysis);
    const vacantes = extractVacancyCount(analysis);
    if (cargo && vacantes > 0) return `${cargo} (${vacantes})`;
    if (cargo) return cargo;
  }
  return "";
}

function buildDocumentSeguimiento(analysis: Record<string, unknown>, documentKind: string): string {
  if (documentKind === "follow_up") return extractFollowUpNumber(analysis);
  return "";
}

function selectionBucketToken(bucket: string): string {
  if (bucket === "individual") return "individual";
  if (bucket === "2-4") return "2 a 4";
  if (bucket === "5-7") return "5 a 7";
  return "8 oferentes";
}

function analysisSignalText(analysis: Record<string, unknown>, message: { subject?: string }): string {
  return normalizeText(
    [
      message.subject ?? "",
      analysis.file_path ?? "",
      analysis.process_hint ?? "",
      analysis.document_label ?? "",
      analysis.interpreter_total_time_raw ?? "",
      analysis.sumatoria_horas_interpretes_raw ?? "",
    ].join(" ")
  );
}

function interpreterTarifaFromHours(tarifas: TarifaRow[], hoursValue: unknown): [TarifaRow | null, string] {
  let hours: number;
  try {
    hours = Number(hoursValue);
    if (!isFinite(hours)) throw new Error("invalid");
  } catch {
    return [null, ""];
  }

  if (hours <= 0) return [null, ""];
  if (hours >= 1) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("hora")
    );
    return [row, `Se detecto servicio de interprete por ${hours} hora(s).`];
  }
  if (Math.abs(hours - 0.75) <= 0.02) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("45")
    );
    return [row, "Se detecto duracion de 45 minutos para el servicio de interprete."];
  }
  if (Math.abs(hours - 0.5) <= 0.02) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("30")
    );
    return [row, "Se detecto duracion de 30 minutos para el servicio de interprete."];
  }
  if (Math.abs(hours - 0.25) <= 0.02) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("15")
    );
    return [row, "Se detecto duracion de 15 minutos para el servicio de interprete."];
  }
  return [null, ""];
}

function interpreterTarifaFromText(tarifas: TarifaRow[], signalText: string): [TarifaRow | null, string] {
  if (signalText.includes("visita fallida")) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("visita fallida")
    );
    return [row, "Se detecto visita fallida en el servicio de interprete."];
  }
  if (["15 min", "15 mn", "15 minuto"].some((t) => signalText.includes(t))) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("15")
    );
    return [row, "Se detecto duracion de 15 minutos para el servicio de interprete."];
  }
  if (["30 min", "30 minuto"].some((t) => signalText.includes(t))) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("30")
    );
    return [row, "Se detecto duracion de 30 minutos para el servicio de interprete."];
  }
  if (["45 min", "45 minuto"].some((t) => signalText.includes(t))) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("45")
    );
    return [row, "Se detecto duracion de 45 minutos para el servicio de interprete."];
  }
  if (["1 hora", "60 min", "60 minuto", "por hora"].some((t) => signalText.includes(t))) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("interprete") &&
      normalizeText(item.descripcion_servicio ?? "").includes("hora")
    );
    return [row, "Se detecto una hora de servicio para interprete."];
  }
  return [null, ""];
}

export function suggestServiceFromAnalysis(input: RulesEngineInput): DecisionSuggestion {
  const { analysis, message, tarifas } = input;
  const rationale: string[] = [];

  const nit = String(analysis.nit_empresa ?? "").trim();
  const company = nit ? input.companyByNit(nit) : null;
  if (company) {
    rationale.push(`Empresa encontrada en BD: ${company.nombre_empresa ?? "Sin nombre"}.`);
    rationale.push(`Caja de compensacion: ${company.caja_compensacion ?? "Sin dato"}.`);
  } else {
    rationale.push("Empresa no encontrada en BD por NIT; algunas reglas pueden quedar incompletas.");
  }

  const modalidad = inferModalidad({ analysis, message, company });
  if (modalidad.reason) rationale.push(modalidad.reason);

  const documentKind = String(analysis.document_kind ?? "");
  const processHint = String(analysis.process_hint ?? "");
  const participants = Array.isArray(analysis.participantes) ? analysis.participantes : [];
  const signalText = analysisSignalText(analysis, message);

  function finalize(
    row: TarifaRow,
    { confidence, extraRationale, observaciones, seguimientoServicio }: {
      confidence: "low" | "medium" | "high";
      extraRationale: string[];
      observaciones?: string;
      seguimientoServicio?: string;
    },
  ): DecisionSuggestion {
    const autoObservaciones = buildDocumentObservaciones(analysis, documentKind);
    const autoSeguimiento = buildDocumentSeguimiento(analysis, documentKind);
    return {
      codigo_servicio: String(row.codigo_servicio ?? ""),
      referencia_servicio: String(row.referencia_servicio ?? ""),
      descripcion_servicio: String(row.descripcion_servicio ?? ""),
      modalidad_servicio: String(row.modalidad_servicio ?? "") || modalidad.value || "",
      valor_base: Number(row.valor_base ?? 0),
      observaciones: observaciones || autoObservaciones,
      observacion_agencia: "",
      seguimiento_servicio: seguimientoServicio || autoSeguimiento,
      confidence,
      rationale: [...rationale, ...extraRationale],
    };
  }

  if (documentKind === "attendance_support") {
    return { confidence: "low", rationale: [...rationale, "El documento fue clasificado como control de asistencia."] };
  }

  if (documentKind === "interpreter_service") {
    if (analysis.is_fallido || signalText.includes("fallido")) {
      const row = selectTarifa(tarifas, (item) =>
        normalizeText(item.descripcion_servicio ?? "").includes("visita fallida")
      );
      if (row) {
        return finalize(row, {
          confidence: "medium",
          extraRationale: [
            "Se detecto documento de interprete LSC.",
            "Se detecto visita fallida en el asunto o en el acta.",
          ],
        });
      }
    }

    const hoursValue = analysis.sumatoria_horas_interpretes ?? analysis.total_horas_interprete;
    const [rowFromHours, reasonFromHours] = interpreterTarifaFromHours(tarifas, hoursValue);
    if (rowFromHours) {
      return finalize(rowFromHours, {
        confidence: "medium",
        extraRationale: ["Se detecto documento de interprete LSC.", reasonFromHours],
      });
    }

    const [rowFromText, reasonFromText] = interpreterTarifaFromText(tarifas, signalText);
    if (rowFromText) {
      return finalize(rowFromText, {
        confidence: "medium",
        extraRationale: ["Se detecto documento de interprete LSC.", reasonFromText],
      });
    }

    return { confidence: "low", rationale: [...rationale, "Se detecto documento de interprete LSC."] };
  }

  if (documentKind === "vacancy_review" && modalidad.value) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("vacante") &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: modalidad.value === "Virtual" ? "high" : "medium",
        extraRationale: ["Se asigno familia de codigo de revision de vacante."],
      });
    }
  }

  if (documentKind === "sensibilizacion" && modalidad.value) {
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("sensibilizacion") &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: modalidad.value === "Virtual" ? "high" : "medium",
        extraRationale: ["Se asigno familia de codigo de sensibilizacion."],
      });
    }
  }

  if (["organizational_induction", "operational_induction"].includes(documentKind) && modalidad.value) {
    const keyword = documentKind === "organizational_induction" ? "organizacional" : "operativa";
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes(keyword) &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: modalidad.value === "Virtual" ? "high" : "medium",
        extraRationale: [`Se asigno familia de codigo de induccion ${keyword}.`],
      });
    }
  }

  if (documentKind === "inclusive_selection" && modalidad.value) {
    const [bucket, bucketReason] = selectionSizeBucket(participants);
    const token = selectionBucketToken(bucket);
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("seleccion incluyente") &&
      normalizeText(item.descripcion_servicio ?? "").includes(token) &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: participants.length > 0 ? "medium" : "low",
        extraRationale: [bucketReason, "Se asigno familia de codigo de seleccion incluyente."],
      });
    }
  }

  if (documentKind === "inclusive_hiring" && modalidad.value) {
    const [bucket, bucketReason] = selectionSizeBucket(participants);
    const token = selectionBucketToken(bucket);
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("contratacion incluyente") &&
      normalizeText(item.descripcion_servicio ?? "").includes(token) &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: participants.length > 0 ? "medium" : "low",
        extraRationale: [bucketReason, "Se asigno familia de codigo de contratacion incluyente."],
      });
    }
  }

  if (documentKind === "program_reactivation" && modalidad.value) {
    const [family, familyReason, familyIsDefault] = managementFamily(analysis);
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("reactivacion") &&
      normalizeText(item.descripcion_servicio ?? "").includes(family) &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: familyIsDefault ? "low" : "medium",
        extraRationale: [familyReason, "Se asigno familia de codigo de mantenimiento/reactivacion."],
      });
    }
  }

  if (documentKind === "program_presentation" && modalidad.value) {
    const [family, familyReason, familyIsDefault] = managementFamily(analysis);
    const [companyCount, countReason, countIsDefault] = promotionCompanyCount(analysis);
    const [bucketToken, bucketReason] = promotionBucketToken(companyCount);
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes("promocion") &&
      normalizeText(item.descripcion_servicio ?? "").includes(bucketToken) &&
      normalizeText(item.descripcion_servicio ?? "").includes(family) &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: familyIsDefault || countIsDefault ? "low" : "medium",
        extraRationale: [familyReason, countReason, bucketReason, "Se asigno familia de codigo de promocion del programa."],
      });
    }
  }

  if (documentKind === "follow_up" && modalidad.value) {
    const isSpecialFollowUp = ["visita adicional", "casos especiales", "apoyo"].some((t) => signalText.includes(t));
    const descriptionToken = isSpecialFollowUp ? "visita adicional" : "seguimiento y acompanamiento";
    const row = selectTarifa(tarifas, (item) =>
      normalizeText(item.descripcion_servicio ?? "").includes(descriptionToken) &&
      normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
    );
    if (row) {
      return finalize(row, {
        confidence: "medium",
        extraRationale: [
          isSpecialFollowUp
            ? "Se asigno familia de visita adicional de seguimiento/apoyo."
            : "Se asigno familia de codigo de seguimiento.",
        ],
      });
    }
  }

  if (documentKind === "accessibility_assessment") {
    const [sizeBucket, sizeReason, sizeIsDefault] = companySizeBucket(analysis);
    if (modalidad.value) {
      const row = selectTarifa(tarifas, (item) =>
        normalizeText(item.descripcion_servicio ?? "").includes("accesibilidad") &&
        (sizeBucket === "hasta_50"
          ? normalizeText(item.descripcion_servicio ?? "").includes("hasta 50")
          : normalizeText(item.descripcion_servicio ?? "").includes("desde 51")) &&
        normalizeText(item.modalidad_servicio ?? "") === normalizeText(modalidad.value)
      );
      if (row) {
        return finalize(row, {
          confidence: sizeIsDefault ? "low" : "medium",
          extraRationale: [sizeReason, "Se asigno familia de codigo de evaluacion de accesibilidad."],
        });
      }
    }

    rationale.push("La familia de codigo es evaluacion de accesibilidad.", sizeReason);
    return { modalidad_servicio: modalidad.value, confidence: "low", rationale: [...rationale] };
  }

  if (processHint) {
    rationale.push(`Proceso sugerido por nombre de archivo: ${processHint}.`);
  }

  return { modalidad_servicio: modalidad.value, confidence: "low", rationale: [...rationale] };
}

function inferModalidad({ analysis, message, company }: {
  analysis: Record<string, unknown>;
  message: { subject?: string };
  company: CompanyRow | null;
}): { value: string; reason: string } {
  const parsedModalidad = normalizedModalidad(String(analysis.modalidad_servicio ?? ""));
  if (parsedModalidad) return { value: parsedModalidad, reason: "Modalidad detectada directamente en el PDF." };

  const subject = normalizeText(message.subject ?? "");
  if (subject.includes("virtual")) return { value: "Virtual", reason: "Modalidad inferida desde el asunto del correo." };

  const documentKind = String(analysis.document_kind ?? "");
  const odsKinds = new Set([
    "accessibility_assessment", "vacancy_review", "program_presentation",
    "program_reactivation", "sensibilizacion", "inclusive_selection",
    "inclusive_hiring", "organizational_induction", "operational_induction", "follow_up",
  ]);
  if (odsKinds.has(documentKind)) {
    const city = normalizeText(company?.ciudad_empresa ?? "");
    if (city) {
      if (city.includes("bogota")) return { value: "Bogota", reason: "Modalidad inferida desde la ciudad registrada de la empresa." };
      return { value: "Fuera de Bogota", reason: "Modalidad inferida desde la ciudad registrada de la empresa." };
    }
  }

  return { value: "", reason: "No fue posible inferir modalidad con suficiente confianza." };
}
