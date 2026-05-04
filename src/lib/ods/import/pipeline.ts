import type { TarifaRow, CompanyRow, DecisionSuggestion } from "@/lib/ods/rules-engine/rulesEngine";
import { suggestServiceFromAnalysis } from "@/lib/ods/rules-engine/rulesEngine";
import { parseActaSource, type ActaParseResult } from "@/lib/ods/import/parsers";
import { extractPdfActaId } from "@/lib/ods/import/parsers/pdfActaId";
import { extractActaIdFromInput } from "@/lib/ods/import/parsers/actaIdParser";
import { callExtractActaEdgeFunction, type EdgeFunctionResponse } from "@/lib/ods/import/edgeFunctionClient";
import { buildDetailedExtractionInstructions, getProcessProfile } from "@/lib/ods/import/processProfiles";
import { classifyDocument } from "@/lib/ods/import/documentClassifier";
import { rankSuggestions, type RankedSuggestion } from "@/lib/ods/import/rankedSuggestions";
import { buildConfidenceBreakdown, type ConfidenceBreakdown } from "@/lib/ods/import/confidenceBreakdown";
import { deriveNombreProfesionalFromActaSources, normalizeText } from "@/lib/ods/import/parsers/common";
import type { ImportResolution } from "@/lib/ods/schemas";

export type PipelineInput = {
  fileBuffer?: ArrayBuffer;
  filePath: string;
  fileType?: "pdf" | "excel";
  actaIdOrUrl?: string;
  preResolvedFinalizedRecord?: PreResolvedFinalizedRecord;
  // Texto del PDF ya extraído (por el route en su preliminary parse).
  // Si viene poblado, los Niveles 2-4 lo reusan en lugar de re-llamar
  // a `readPdfText` (que cuesta 2x decodificar el PDF en serverless).
  precomputedFullText?: string;
};

export type PreResolvedFinalizedRecord = {
  acta_ref: string;
  registro_id: string;
  payload_normalized: unknown;
};

export type PipelineCompanyMatch = {
  nit_empresa: string;
  nombre_empresa: string;
  caja_compensacion?: string;
  asesor_empresa?: string;
  sede_empresa?: string;
  matchType: "nit_exact" | "nit_fuzzy" | "name_fuzzy";
  confidence: number;
};

export type PipelineProfessionalMatch = {
  nombre: string;
  source: "profesionales" | "interpretes";
  matchType: "exact" | "fuzzy";
  confidence: number;
};

export type PipelineParticipant = {
  cedula_usuario: string;
  nombre_usuario: string;
  discapacidad_usuario: string;
  genero_usuario: string;
  exists: boolean;
};

export type DecisionLogEntry = {
  level: number;
  levelName: string;
  success: boolean;
  durationMs: number;
  details?: string;
  error?: string;
};

export type PipelineResult = {
  success: boolean;
  level: number;
  parseResult?: ActaParseResult;
  edgeFunctionResponse?: EdgeFunctionResponse;
  analysis: Record<string, unknown>;
  companyMatch?: PipelineCompanyMatch;
  professionalMatch?: PipelineProfessionalMatch;
  participants: PipelineParticipant[];
  suggestions: RankedSuggestion[];
  confidenceBreakdown?: ConfidenceBreakdown;
  decisionLog: DecisionLogEntry[];
  warnings: string[];
  error?: string;
  formato_finalizado_id?: string;
  import_resolution?: ImportResolution;
};

const NIVEL2_NOMBRE_PROFESIONAL_WARNING = "No se detecto profesional/asistente en el payload_normalized.";

export type CatalogDependencies = {
  tarifas: TarifaRow[];
  allKnownNits: string[];
  companyByNit: (nit: string) => CompanyRow | null;
  companyByNameFuzzy: (name: string) => PipelineCompanyMatch | null;
  professionalByNameFuzzy: (name: string) => PipelineProfessionalMatch | null;
  participantByCedula: (cedula: string) => { exists: boolean; nombre?: string; discapacidad?: string; genero?: string } | null;
  finalizedRecordByActaRef: (actaRef: string) => Promise<PreResolvedFinalizedRecord | null>;
};

export type FuzzyNitMatch = {
  nit: string;
  confidence: number;
};

export function fuzzyNitMatch(inputNit: string, knownNits: string[]): FuzzyNitMatch | null {
  const normalizedInput = normalizeText(inputNit).replace(/[^0-9]/g, "");
  if (!normalizedInput) return null;

  let bestMatch: FuzzyNitMatch | null = null;

  for (const knownNit of knownNits) {
    const normalizedKnown = normalizeText(knownNit).replace(/[^0-9]/g, "");
    if (!normalizedKnown) continue;

    if (normalizedInput === normalizedKnown) {
      return { nit: knownNit, confidence: 1.0 };
    }

    const len = Math.max(normalizedInput.length, normalizedKnown.length);
    if (len === 0) continue;

    let matches = 0;
    const minLen = Math.min(normalizedInput.length, normalizedKnown.length);
    for (let i = 0; i < minLen; i++) {
      if (normalizedInput[i] === normalizedKnown[i]) matches++;
    }

    const confidence = matches / len;
    if (confidence >= 0.8 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { nit: knownNit, confidence };
    }
  }

  return bestMatch;
}

async function resolveCompany(
  parseResult: ActaParseResult,
  deps: CatalogDependencies,
): Promise<PipelineCompanyMatch | null> {
  if (parseResult.nit_empresa) {
    const company = deps.companyByNit(parseResult.nit_empresa);
    if (company) {
      return {
        nit_empresa: company.nit_empresa || parseResult.nit_empresa,
        nombre_empresa: company.nombre_empresa || parseResult.nombre_empresa || "",
        caja_compensacion: company.caja_compensacion || undefined,
        asesor_empresa: company.asesor || undefined,
        sede_empresa: company.sede_empresa || undefined,
        matchType: "nit_exact",
        confidence: 1.0,
      };
    }

    const fuzzy = fuzzyNitMatch(parseResult.nit_empresa, deps.allKnownNits);
    if (fuzzy) {
      const company = deps.companyByNit(fuzzy.nit);
      if (company) {
        return {
          nit_empresa: company.nit_empresa || fuzzy.nit,
          nombre_empresa: company.nombre_empresa || parseResult.nombre_empresa || "",
          caja_compensacion: company.caja_compensacion || undefined,
          asesor_empresa: company.asesor || undefined,
          sede_empresa: company.sede_empresa || undefined,
          matchType: "nit_fuzzy",
          confidence: fuzzy.confidence,
        };
      }
    }
  }

  if (parseResult.nombre_empresa) {
    const match = deps.companyByNameFuzzy(parseResult.nombre_empresa);
    if (match) return match;
  }

  return null;
}

function resolveParticipants(
  parseResult: ActaParseResult,
  deps: CatalogDependencies,
): PipelineParticipant[] {
  const raw = parseResult.participantes || [];
  return raw
    .map((p) => {
      const cedula = String(p.cedula_usuario || p.cedula || "").trim();
      if (!cedula) return null;
      const lookup = deps.participantByCedula(cedula);
      return {
        cedula_usuario: cedula,
        nombre_usuario: String(p.nombre_usuario || p.nombre || lookup?.nombre || "").trim(),
        discapacidad_usuario: String(p.discapacidad_usuario || p.discapacidad || lookup?.discapacidad || "").trim(),
        genero_usuario: String(p.genero_usuario || p.genero || lookup?.genero || "").trim(),
        exists: lookup?.exists || false,
      };
    })
    .filter((p): p is PipelineParticipant => p !== null);
}

/**
 * `payload_normalized` en `formatos_finalizados_il` viene en forma envoltorio:
 *   { form_id, metadata, attachment, parsed_raw: {...campos del acta...}, schema_version }
 * El pipeline de import espera la forma "flat" con los campos top-level
 * (nit_empresa, modalidad_servicio, participantes, etc.). Cuando detectamos
 * `parsed_raw`, hacemos unwrap y llevamos al top-level los campos derivados:
 *   - acta_ref desde metadata.acta_ref
 *   - document_kind desde attachment.document_kind (más confiable que el classifier heurístico)
 */
export function unwrapPayloadNormalized(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const parsedRaw = (payload as { parsed_raw?: unknown }).parsed_raw;
  if (parsedRaw && typeof parsedRaw === "object" && !Array.isArray(parsedRaw)) {
    const meta = (payload as { metadata?: { acta_ref?: string } }).metadata;
    const attachment = (payload as { attachment?: { document_kind?: string } }).attachment;
    const flat = parsedRaw as Record<string, unknown>;
    return {
      ...flat,
      acta_ref: flat.acta_ref ?? meta?.acta_ref,
      document_kind: flat.document_kind ?? attachment?.document_kind,
    };
  }
  return payload;
}

function buildParseResultFromFinalizedRecord(
  record: PreResolvedFinalizedRecord,
  filePath: string,
  sourceType: ActaParseResult["source_type"],
): ActaParseResult {
  const payload = unwrapPayloadNormalized(record.payload_normalized as Record<string, unknown>);
  return buildParseResultFromFinalizedPayload(payload, filePath, sourceType, record.acta_ref);
}

function buildParseResultFromFinalizedPayload(
  payload: Record<string, unknown>,
  filePath: string,
  sourceType: ActaParseResult["source_type"],
  actaRef: string,
): ActaParseResult {
  const nombreProfesional = deriveNombreProfesionalFromActaSources(payload);
  return {
    ...(payload as Record<string, unknown>),
    file_path: filePath,
    source_type: sourceType,
    acta_ref: actaRef,
    nit_empresa: String(payload.nit_empresa || ""),
    nombre_empresa: String(payload.nombre_empresa || ""),
    fecha_servicio: String(payload.fecha_servicio || ""),
    nombre_profesional: nombreProfesional,
    modalidad_servicio: String(payload.modalidad_servicio || ""),
    participantes: Array.isArray(payload.participantes)
      ? (payload.participantes as Array<Record<string, string>>)
      : [],
    warnings: nombreProfesional ? [] : [NIVEL2_NOMBRE_PROFESIONAL_WARNING],
  } as ActaParseResult;
}

function buildAnalysisFromParseResult(parseResult: ActaParseResult, fullText?: string): Record<string, unknown> {
  // Preferir document_kind que vino en el payload_normalized (vía unwrap) sobre
  // el classifier heurístico — es más confiable porque el formulario web lo
  // marca explícitamente.
  let documentKind: string | undefined = (parseResult as Record<string, unknown>).document_kind as string | undefined;
  if (!documentKind && fullText) {
    const classification = classifyDocument({ filename: parseResult.file_path, subject: fullText.slice(0, 500) });
    documentKind = classification.document_kind;
  }

  return {
    nit_empresa: parseResult.nit_empresa,
    nits_empresas: parseResult.nits_empresas,
    nombre_empresa: parseResult.nombre_empresa,
    fecha_servicio: parseResult.fecha_servicio,
    nombre_profesional: parseResult.nombre_profesional,
    modalidad_servicio: parseResult.modalidad_servicio,
    cargo_objetivo: parseResult.cargo_objetivo,
    total_vacantes: parseResult.total_vacantes,
    numero_seguimiento: parseResult.numero_seguimiento,
    participantes: parseResult.participantes,
    interpretes: parseResult.interpretes,
    interpreter_process_name: parseResult.interpreter_process_name,
    interpreter_total_time_raw: parseResult.interpreter_total_time_raw,
    sumatoria_horas_interpretes_raw: parseResult.sumatoria_horas_interpretes_raw,
    total_horas_interprete: parseResult.total_horas_interprete,
    sumatoria_horas_interpretes: parseResult.sumatoria_horas_interpretes,
    is_fallido: parseResult.is_fallido,
    document_kind: documentKind,
    file_path: parseResult.file_path,
  };
}

function buildAnalysisFromEdgeFunction(data: Record<string, unknown>, filePath: string, fullText?: string): Record<string, unknown> {
  let documentKind = data.document_kind as string | undefined;
  if (!documentKind && fullText) {
    const classification = classifyDocument({ filename: filePath, subject: fullText.slice(0, 500) });
    documentKind = classification.document_kind;
  }

  return {
    nit_empresa: data.nit_empresa,
    nits_empresas: data.nits_empresas,
    nombre_empresa: data.nombre_empresa,
    fecha_servicio: data.fecha_servicio,
    nombre_profesional: data.nombre_profesional,
    modalidad_servicio: data.modalidad_servicio,
    cargo_objetivo: data.cargo_objetivo,
    total_vacantes: data.total_vacantes,
    numero_seguimiento: data.numero_seguimiento,
    participantes: data.participantes,
    interpretes: data.interpretes,
    interpreter_process_name: data.interpreter_process_name,
    interpreter_total_time_raw: data.interpreter_total_time_raw,
    sumatoria_horas_interpretes_raw: data.sumatoria_horas_interpretes_raw,
    total_horas_interprete: data.total_horas_interprete,
    sumatoria_horas_interpretes: data.sumatoria_horas_interpretes,
    is_fallido: data.is_fallido,
    document_kind: documentKind,
    file_path: filePath,
    process_hint: data.process_hint,
    process_name_hint: data.process_name_hint,
  };
}

const MODALIDADES_INTERNAS = ["Virtual", "Bogota", "Fuera de Bogota"] as const;

function normalizeModalidadInterna(raw: string): string {
  const text = (raw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (text.includes("virtual")) return "Virtual";
  if (text.includes("bogota") && !text.includes("fuera")) return "Bogota";
  if (text.includes("fuera") || text.includes("otro")) return "Fuera de Bogota";
  return "";
}

function generateAlternativeSuggestions(
  primary: DecisionSuggestion,
  analysis: Record<string, unknown>,
  tarifas: TarifaRow[],
  companyByNit: (nit: string) => CompanyRow | null,
): DecisionSuggestion[] {
  const alternatives: DecisionSuggestion[] = [primary];

  // EL-1: comparar normalizado para evitar mismatch entre "Bogota" y "Bogotá"
  const modalidadActualNorm = normalizeModalidadInterna(String(analysis.modalidad_servicio || ""));
  const modalidadesAlternas = MODALIDADES_INTERNAS.filter((m) => m !== modalidadActualNorm);

  // EL-2: intentar TODAS las modalidades alternas (no slice(0, 1))
  for (const altModalidad of modalidadesAlternas) {
    const altAnalysis = { ...analysis, modalidad_servicio: altModalidad };
    const altSuggestion = suggestServiceFromAnalysis({
      analysis: altAnalysis,
      message: { subject: String(analysis.file_path || "") },
      tarifas,
      companyByNit,
    });
    if (altSuggestion.codigo_servicio && altSuggestion.codigo_servicio !== primary.codigo_servicio) {
      alternatives.push({
        ...altSuggestion,
        confidence: "low",
        rationale: [...altSuggestion.rationale, "Modalidad alternativa inferida."],
      });
    }
  }

  const processHint = String(analysis.process_hint || analysis.process_name_hint || "");
  if (processHint) {
    const processTarifa = tarifas.find((t) =>
      normalizeText(t.descripcion_servicio || "").includes(normalizeText(processHint).slice(0, 15)),
    );
    if (processTarifa && processTarifa.codigo_servicio !== primary.codigo_servicio) {
      alternatives.push({
        codigo_servicio: processTarifa.codigo_servicio || "",
        referencia_servicio: processTarifa.referencia_servicio || "",
        descripcion_servicio: processTarifa.descripcion_servicio || "",
        modalidad_servicio: processTarifa.modalidad_servicio || "",
        valor_base: Number(processTarifa.valor_base ?? 0),
        confidence: "low",
        rationale: [`Match por process_hint: "${processHint}".`],
      });
    }
  }

  return alternatives;
}

// BS-1: limites para prevenir timeouts y costos LLM excesivos
const MAX_PDF_PAGES = 25;
const MAX_PDF_CHARS = 30_000;

export async function readPdfText(fileBuffer: ArrayBuffer): Promise<string> {
  const { loadPdfjs } = await import("./pdfjsServer");
  const pdfjsLib = await loadPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  const totalPages = Math.min(pdf.numPages as number, MAX_PDF_PAGES);
  const pages: string[] = [];
  let totalChars = 0;
  for (let i = 0; i < totalPages; i++) {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    const strings = (content.items as Array<{ str?: string }>).map((item) => item.str || "");
    const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
    if (pageText) {
      pages.push(pageText);
      totalChars += pageText.length;
      if (totalChars >= MAX_PDF_CHARS) break;
    }
  }
  const joined = pages.join("\n");
  return joined.length > MAX_PDF_CHARS ? joined.slice(0, MAX_PDF_CHARS) : joined;
}

export async function runImportPipeline(
  input: PipelineInput,
  deps: CatalogDependencies,
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const decisionLog: DecisionLogEntry[] = [];
  const warnings: string[] = [];

  let parseResult: ActaParseResult | undefined;
  let edgeFunctionResponse: EdgeFunctionResponse | undefined;
  let analysis: Record<string, unknown> = {};
  let formatoFinalizadoId: string | undefined;
  let importResolution: ImportResolution | undefined;
  // Reusamos el texto si el caller (route) ya lo extrajo en su preliminary parse.
  let fullText = input.precomputedFullText ?? "";

  // Nivel 2: Extraer ACTA ID y query formatos_finalizados_il
  if (!parseResult) {
    const nivel2Start = Date.now();
    try {
      let actaRef = "";
      let record: PreResolvedFinalizedRecord | null = null;
      let sourceType: ActaParseResult["source_type"] = input.fileBuffer ? "local_pdf" : "acta_ref";
      // Solo marca imports sin archivo; si llega file + actaIdOrUrl, el archivo conserva prioridad.
      const directInputLookup = Boolean(input.actaIdOrUrl && !input.fileBuffer);

      if (input.preResolvedFinalizedRecord) {
        actaRef = input.preResolvedFinalizedRecord.acta_ref;
        record = input.preResolvedFinalizedRecord;
        if (record.payload_normalized) {
          parseResult = buildParseResultFromFinalizedRecord(record, input.filePath, sourceType);
          formatoFinalizadoId = record.registro_id;
          importResolution = {
            strategy: "finalized_record",
            reason: directInputLookup ? "direct_input_lookup" : "acta_ref_lookup",
            acta_ref: actaRef,
          };
          const duration = Date.now() - nivel2Start;
          decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: true, durationMs: duration, details: `ACTA ID ${actaRef} -> payload_normalized encontrado` });
        }
      } else if (input.fileBuffer && input.fileType === "pdf") {
        if (!fullText) fullText = await readPdfText(input.fileBuffer);
        actaRef = extractPdfActaId(fullText);
        if (actaRef) {
          record = await deps.finalizedRecordByActaRef(actaRef);
          if (record?.payload_normalized) {
            const rawPayload = record.payload_normalized as Record<string, unknown>;
            // payload_normalized viene anidado en parsed_raw — unwrap a forma flat
            // que el resto del pipeline (analysis, rules engine) sí entiende.
            const payload = unwrapPayloadNormalized(rawPayload);
            // PD-1: spread completo del payload_normalized; sobreescribir solo campos canonicos
            parseResult = buildParseResultFromFinalizedPayload(payload, input.filePath, "local_pdf", actaRef);
            formatoFinalizadoId = record.registro_id;
            importResolution = {
              strategy: "finalized_record",
              reason: "acta_ref_lookup",
              acta_ref: actaRef,
            };
            const duration = Date.now() - nivel2Start;
            decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: true, durationMs: duration, details: `ACTA ID ${actaRef} -> payload_normalized encontrado` });
          } else {
            importResolution = {
              strategy: "parser",
              reason: record ? "acta_ref_invalid_payload" : "acta_ref_not_found",
              acta_ref: actaRef,
            };
            const duration = Date.now() - nivel2Start;
            decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: false, durationMs: duration, details: `ACTA ID ${actaRef} encontrado pero sin payload_normalized` });
          }
        } else {
          importResolution = { strategy: "parser", reason: "no_acta_ref", acta_ref: "" };
          const duration = Date.now() - nivel2Start;
          decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: false, durationMs: duration, details: "Sin ACTA ID en PDF" });
        }
      } else if (input.actaIdOrUrl) {
        actaRef = extractActaIdFromInput(input.actaIdOrUrl);
        if (actaRef) {
          sourceType = "acta_ref";
          record = await deps.finalizedRecordByActaRef(actaRef);
          if (record?.payload_normalized) {
            parseResult = buildParseResultFromFinalizedRecord(record, input.filePath, sourceType);
            formatoFinalizadoId = record.registro_id;
            importResolution = {
              strategy: "finalized_record",
              reason: "direct_input_lookup",
              acta_ref: actaRef,
            };
            const duration = Date.now() - nivel2Start;
            decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: true, durationMs: duration, details: `ACTA ID ${actaRef} -> payload_normalized encontrado` });
          } else {
            importResolution = {
              strategy: "parser",
              reason: record ? "acta_ref_invalid_payload" : "acta_ref_not_found",
              acta_ref: actaRef,
            };
            const duration = Date.now() - nivel2Start;
            decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: false, durationMs: duration, details: record ? `ACTA ID ${actaRef} encontrado pero sin payload_normalized` : `ACTA ID ${actaRef} sin registro finalizado asociado` });
          }
        }
      }
    } catch (error) {
      const duration = Date.now() - nivel2Start;
      importResolution = {
        strategy: "parser",
        reason: "acta_ref_lookup_failed",
        acta_ref: "",
      };
      decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: false, durationMs: duration, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Nivel 2 falla -> Nivel 3 (C2: cascada)
  if (!parseResult) {
    const nivel3Start = Date.now();
    try {
      if (input.fileBuffer && input.fileType === "pdf") {
        if (!fullText) {
          fullText = await readPdfText(input.fileBuffer);
        }
        const classification = classifyDocument({ filename: input.filePath, subject: fullText.slice(0, 500) });
        const documentKind = classification.document_kind;
        const profile = getProcessProfile(documentKind);
        const instructions = profile ? buildDetailedExtractionInstructions(documentKind) : "";
        const textForEdge = instructions ? `${instructions}\n\n${fullText}` : fullText;

        edgeFunctionResponse = await callExtractActaEdgeFunction({ text: textForEdge }, { signal });
        if (edgeFunctionResponse?.success && edgeFunctionResponse?.data) {
          analysis = buildAnalysisFromEdgeFunction(edgeFunctionResponse.data, input.filePath, fullText);
          const duration = Date.now() - nivel3Start;
          decisionLog.push({ level: 3, levelName: "Edge Function", success: true, durationMs: duration, details: "Edge Function respondio correctamente" });
        }
      }
    } catch (error) {
      const duration = Date.now() - nivel3Start;
      decisionLog.push({
        level: 3,
        levelName: "Edge Function",
        success: false,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Nivel 4: Regex parser (portado de excel_acta_import.py)
  if (!parseResult && !edgeFunctionResponse?.success) {
    const nivel4Start = Date.now();
    try {
      parseResult = await parseActaSource(input.filePath, {
        fileBuffer: input.fileBuffer,
        fileType: input.fileType,
      });
      const duration = Date.now() - nivel4Start;
      if (parseResult) {
        decisionLog.push({ level: 4, levelName: "Regex Parser", success: true, durationMs: duration, details: "Parser regex ejecutado" });
      }
    } catch (error) {
      const duration = Date.now() - nivel4Start;
      decisionLog.push({
        level: 4,
        levelName: "Regex Parser",
        success: false,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Si no hay datos de ningun nivel, fallar
  if (!parseResult && !edgeFunctionResponse?.success) {
    return {
      success: false,
      level: 0,
      analysis: {},
      participants: [],
      suggestions: [],
      decisionLog,
      warnings: [...warnings, "No se pudo extraer informacion del acta con ningun metodo"],
      error: "No se pudo extraer informacion del acta",
      import_resolution: importResolution,
    };
  }

  // Construir analysis desde parseResult o edgeFunctionResponse
  if (parseResult && !edgeFunctionResponse?.success) {
    analysis = buildAnalysisFromParseResult(parseResult, fullText);
  }

  // I3: C4 paralelizacion del resolve dentro del pipeline
  const [companyMatch, professionalMatch, participants] = await Promise.all([
    parseResult ? resolveCompany(parseResult, deps) : Promise.resolve(null),
    parseResult?.nombre_profesional ? Promise.resolve(deps.professionalByNameFuzzy(parseResult.nombre_profesional) || undefined) : Promise.resolve(undefined),
    parseResult ? Promise.resolve(resolveParticipants(parseResult, deps)) : Promise.resolve([]),
  ]);

  if (companyMatch) {
    analysis.nit_empresa = companyMatch.nit_empresa;
    analysis.nombre_empresa = companyMatch.nombre_empresa;
  } else if (parseResult?.nit_empresa) {
    warnings.push(`Empresa no encontrada en BD por NIT: ${parseResult.nit_empresa}`);
  }

  // Motor de codigos
  const primarySuggestion = suggestServiceFromAnalysis({
    analysis,
    message: { subject: input.filePath },
    tarifas: deps.tarifas,
    companyByNit: deps.companyByNit,
  });

  // B3: generar 3 alternativas reales
  const allSuggestions = generateAlternativeSuggestions(primarySuggestion, analysis, deps.tarifas, deps.companyByNit);
  const suggestions = rankSuggestions(allSuggestions).slice(0, 3);

  // B4: confidence breakdown
  const confidenceBreakdown = buildConfidenceBreakdown(primarySuggestion);

  // Agregar warnings del parseResult
  if (parseResult?.warnings) {
    warnings.push(...parseResult.warnings);
  }

  // Determinar el nivel exitoso
  const successfulLevel = decisionLog.find((d) => d.success)?.level || 0;
  const finalImportResolution = importResolution ?? {
    strategy: "parser" as const,
    reason: input.actaIdOrUrl ? "direct_parser" as const : "no_acta_ref" as const,
    acta_ref: parseResult?.acta_ref || "",
  };

  return {
    success: true,
    level: successfulLevel,
    parseResult,
    edgeFunctionResponse,
    analysis,
    companyMatch: companyMatch || undefined,
    professionalMatch: professionalMatch || undefined,
    participants,
    suggestions,
    confidenceBreakdown,
    decisionLog,
    warnings: warnings.slice(0, 6),
    formato_finalizado_id: formatoFinalizadoId,
    import_resolution: finalImportResolution,
  };
}
