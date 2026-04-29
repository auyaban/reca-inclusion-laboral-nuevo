import type { TarifaRow, CompanyRow } from "@/lib/ods/rules-engine/rulesEngine";
import { suggestServiceFromAnalysis } from "@/lib/ods/rules-engine/rulesEngine";
import { parseActaSource, type ActaParseResult } from "@/lib/ods/import/parsers";
import { tryReadRecaMetadata } from "@/lib/ods/import/parsers/pdfMetadata";
import { extractPdfActaId } from "@/lib/ods/import/parsers/pdfActaId";
import { callExtractActaEdgeFunction, type EdgeFunctionResponse } from "@/lib/ods/import/edgeFunctionClient";
import { buildDetailedExtractionInstructions, getProcessProfile } from "@/lib/ods/import/processProfiles";
import { classifyDocument } from "@/lib/ods/import/documentClassifier";
import { top3Suggestions, type RankedSuggestion } from "@/lib/ods/import/rankedSuggestions";
import { buildConfidenceBreakdown, type ConfidenceBreakdown } from "@/lib/ods/import/confidenceBreakdown";
import { normalizeText } from "@/lib/ods/import/parsers/common";

export type PipelineInput = {
  fileBuffer?: ArrayBuffer;
  filePath: string;
  fileType?: "pdf" | "excel";
  actaIdOrUrl?: string;
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
};

export type CatalogDependencies = {
  tarifas: TarifaRow[];
  companyByNit: (nit: string) => CompanyRow | null;
  companyByNameFuzzy: (name: string) => PipelineCompanyMatch | null;
  professionalByNameFuzzy: (name: string) => PipelineProfessionalMatch | null;
  participantByCedula: (cedula: string) => { exists: boolean; nombre?: string; discapacidad?: string; genero?: string } | null;
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

    const allKnownNits: string[] = [];
    const fuzzy = fuzzyNitMatch(parseResult.nit_empresa, allKnownNits);
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

  // Nivel 1: Leer metadata /RECA_Data del PDF
  const nivel1Start = Date.now();
  try {
    if (input.fileBuffer && input.fileType === "pdf") {
      const recaMetadata = await tryReadRecaMetadata(input.fileBuffer);
      if (recaMetadata) {
        parseResult = {
          file_path: input.filePath,
          source_type: "local_pdf",
          warnings: [],
          ...recaMetadata,
        } as ActaParseResult;
        const duration = Date.now() - nivel1Start;
        decisionLog.push({ level: 1, levelName: "RECA Metadata", success: true, durationMs: duration, details: "Metadata /RECA_Data encontrada" });
      }
    }
  } catch {
    // Nivel 1 falla silenciosamente
  }
  if (!parseResult) {
    const duration = Date.now() - nivel1Start;
    decisionLog.push({ level: 1, levelName: "RECA Metadata", success: false, durationMs: duration, details: "Sin metadata /RECA_Data" });
  }

  // Nivel 2: Extraer ACTA ID y query formatos_finalizados_il
  if (!parseResult) {
    const nivel2Start = Date.now();
    try {
      if (input.fileBuffer && input.fileType === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        const pdf = await pdfjsLib.getDocument({ data: input.fileBuffer }).promise;
        const pages: string[] = [];
        for (let i = 0; i < (pdf.numPages as number); i++) {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          const strings = (content.items as Array<{ str?: string }>).map((item) => item.str || "");
          const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
          if (pageText) pages.push(pageText);
        }
        const fullText = pages.join("\n");
        const actaRef = extractPdfActaId(fullText);
        if (actaRef) {
          // TODO E4: query formatos_finalizados_il por acta_ref
          // Por ahora, registramos el acta_ref en el parseResult para que el pipeline continue
          parseResult = {
            file_path: input.filePath,
            source_type: "local_pdf",
            acta_ref: actaRef,
            warnings: [],
          } as ActaParseResult;
          const duration = Date.now() - nivel2Start;
          decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: true, durationMs: duration, details: `ACTA ID encontrado: ${actaRef}` });
        }
      }
    } catch {
      // Nivel 2 falla silenciosamente
    }
    if (!parseResult) {
      const duration = Date.now() - nivel2Start;
      decisionLog.push({ level: 2, levelName: "ACTA ID Lookup", success: false, durationMs: duration, details: "Sin ACTA ID o lookup fallido" });
    }
  }

  // Nivel 2 falla -> Nivel 3 (C2: cascada)
  if (!parseResult) {
    const nivel3Start = Date.now();
    try {
      if (input.fileBuffer && input.fileType === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        const pdf = await pdfjsLib.getDocument({ data: input.fileBuffer }).promise;
        const pages: string[] = [];
        for (let i = 0; i < (pdf.numPages as number); i++) {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          const strings = (content.items as Array<{ str?: string }>).map((item) => item.str || "");
          const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
          if (pageText) pages.push(pageText);
        }
        const fullText = pages.join("\n");
        const classification = classifyDocument({ filename: input.filePath, subject: fullText.slice(0, 500) });
        const documentKind = classification.document_kind;
        const profile = getProcessProfile(documentKind);
        const instructions = profile ? buildDetailedExtractionInstructions(documentKind) : "";
        const textForEdge = instructions ? `${instructions}\n\n${fullText}` : fullText;

        edgeFunctionResponse = await callExtractActaEdgeFunction({ text: textForEdge }, { signal });
        if (edgeFunctionResponse?.success && edgeFunctionResponse?.data) {
          analysis = edgeFunctionResponse.data as Record<string, unknown>;
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
    };
  }

  // Construir analysis desde parseResult o edgeFunctionResponse
  if (parseResult) {
    analysis = {
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
      document_kind: parseResult.acta_ref ? "finalized_record" : undefined,
      file_path: parseResult.file_path,
    };
  }

  // Resolver empresa (C3: fuzzy fallback NIT con typo)
  const companyMatch = parseResult ? await resolveCompany(parseResult, deps) : null;
  if (companyMatch) {
    analysis.nit_empresa = companyMatch.nit_empresa;
    analysis.nombre_empresa = companyMatch.nombre_empresa;
  } else if (parseResult?.nit_empresa) {
    warnings.push(`Empresa no encontrada en BD por NIT: ${parseResult.nit_empresa}`);
  }

  // Resolver profesional
  let professionalMatch: PipelineProfessionalMatch | undefined;
  if (parseResult?.nombre_profesional && deps.professionalByNameFuzzy) {
    professionalMatch = deps.professionalByNameFuzzy(parseResult.nombre_profesional) || undefined;
  }

  // Resolver participantes
  const participants = parseResult ? resolveParticipants(parseResult, deps) : [];

  // Motor de codigos
  const suggestion = suggestServiceFromAnalysis({
    analysis,
    message: { subject: input.filePath },
    tarifas: deps.tarifas,
    companyByNit: deps.companyByNit,
  });

  // B1: top-3 ranked suggestions
  const suggestions = top3Suggestions([suggestion]);

  // B4: confidence breakdown
  const confidenceBreakdown = buildConfidenceBreakdown(suggestion);

  // Agregar warnings del parseResult
  if (parseResult?.warnings) {
    warnings.push(...parseResult.warnings);
  }

  // Determinar el nivel exitoso
  const successfulLevel = decisionLog.find((d) => d.success)?.level || 0;

  return {
    success: true,
    level: successfulLevel,
    parseResult,
    edgeFunctionResponse,
    analysis,
    companyMatch: companyMatch || undefined,
    professionalMatch,
    participants,
    suggestions,
    confidenceBreakdown,
    decisionLog,
    warnings: warnings.slice(0, 6),
  };
}
