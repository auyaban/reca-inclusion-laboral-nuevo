import { describe, expect, it, vi } from "vitest";
import {
  buildImportFailureInputSummary,
  classifyImportFailureKind,
  recordOdsImportFailure,
  sanitizeImportFailureMessage,
  validateImportFailureInputSummary,
} from "./importFailures";

describe("ODS import failure helpers", () => {
  it("sanitiza URLs, emails, numeros largos y limita longitud", () => {
    const message = sanitizeImportFailureMessage(
      new Error(
        `Failed https://docs.google.com/spreadsheets/d/secret/edit user@reca.org cedula 1020304050 ${"x".repeat(700)}`
      )
    );

    expect(message).toContain("[url]");
    expect(message).toContain("[email]");
    expect(message).toContain("[number]");
    expect(message).not.toContain("docs.google.com");
    expect(message).not.toContain("user@reca.org");
    expect(message).not.toContain("1020304050");
    expect(message.length).toBeLessThanOrEqual(500);
  });

  it.each([
    [new Error("fetch failed ETIMEDOUT"), "network"],
    [{ code: "42501", message: "permission denied for function" }, "permission"],
    [new Error("PDF parser Unexpected token"), "parser"],
    [new Error("algo no clasificado"), "unknown"],
  ] as const)("clasifica %s como %s", (error, kind) => {
    expect(classifyImportFailureKind(error)).toBe(kind);
  });

  it("construye summary para PDF sin exponer filename ni ACTA ID raw", () => {
    const summary = buildImportFailureInputSummary({
      fileType: "pdf",
      hasFile: true,
      actaRef: "ABC12XYZ",
      actaIdOrUrl: "https://drive.google.com/file/d/secret/view",
      artifactKind: "google_drive",
      hasArtifact: true,
    });

    expect(summary).toEqual({
      origin: "pdf",
      file_type: "pdf",
      has_file: true,
      has_direct_input: true,
      input_length: "https://drive.google.com/file/d/secret/view".length,
      acta_ref_length: 8,
      has_artifact: true,
      artifact_kind: "google_drive",
    });
    expect(JSON.stringify(summary)).not.toContain("ABC12XYZ");
    expect(JSON.stringify(summary)).not.toContain("secret");
  });

  it("construye summary para Excel y direct input", () => {
    expect(buildImportFailureInputSummary({ fileType: "excel", hasFile: true })).toMatchObject({
      origin: "excel",
      file_type: "excel",
      has_file: true,
      has_direct_input: false,
    });

    expect(buildImportFailureInputSummary({ hasFile: false, actaIdOrUrl: "ACTA ID: ABC12XYZ" })).toMatchObject({
      origin: "acta_id_directo",
      has_file: false,
      has_direct_input: true,
      input_length: "ACTA ID: ABC12XYZ".length,
    });
  });

  it("rechaza campos fuera de la lista cerrada", () => {
    expect(() =>
      validateImportFailureInputSummary({
        origin: "pdf",
        filename: "acta.pdf",
      } as never)
    ).toThrow(/campo no permitido/i);
  });

  it("llama el RPC server-only con mensaje sanitizado y no propaga errores", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-05-04T00:00:00Z" },
        error: null,
      }),
    };

    const result = await recordOdsImportFailure({
      admin,
      actorUserId: "22222222-2222-4222-8222-222222222222",
      stage: "preliminary_acta_lookup",
      error: new Error("permission denied for https://secret.example"),
      inputSummary: { origin: "pdf", file_type: "pdf", has_file: true },
    });

    expect(result.status).toBe("recorded");
    expect(admin.rpc).toHaveBeenCalledWith("ods_record_import_failure", {
      p_stage: "preliminary_acta_lookup",
      p_error_message: "permission denied for [url]",
      p_error_kind: "permission",
      p_input_summary: { origin: "pdf", file_type: "pdf", has_file: true },
      p_user_id: "22222222-2222-4222-8222-222222222222",
    });

    admin.rpc.mockRejectedValueOnce(new Error("network down"));
    await expect(
      recordOdsImportFailure({
        admin,
        actorUserId: null,
        stage: "catalog.empresas",
        error: new Error("network down"),
        inputSummary: { origin: "acta_id_directo" },
      })
    ).resolves.toEqual({ status: "skipped", reason: "rpc_failed" });
  });
});
