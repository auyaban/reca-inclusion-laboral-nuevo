import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

import {
  ensureDraftCapabilities,
  getCurrentUserId,
  getDraftFields,
  getDraftWritePayload,
} from "./remoteDrafts";
import {
  setCheckpointColumnsMode,
  setCurrentUserIdCache,
  setDraftSchemaMode,
} from "./state";

function createEmpresa() {
  return {
    id: "empresa-1",
    nit_empresa: "9001",
    nombre_empresa: "Empresa Uno",
    direccion_empresa: null,
    ciudad_empresa: null,
    sede_empresa: null,
    zona_empresa: null,
    correo_1: null,
    contacto_empresa: null,
    telefono_empresa: null,
    cargo: null,
    profesional_asignado: null,
    correo_profesional: null,
    asesor: null,
    correo_asesor: null,
    caja_compensacion: null,
  };
}

function createProbeClient(
  responses: Record<string, { data?: unknown; error?: unknown }>
) {
  const limit = vi.fn((count: number) => {
    void count;
    return Promise.resolve({ data: [], error: null });
  });
  const select = vi.fn((fields: string) => {
    const response = responses[fields] ?? { data: [], error: null };
    return {
      limit: vi.fn().mockResolvedValue({
        data: response.data ?? [],
        error: response.error ?? null,
      }),
    };
  });

  return {
    from: vi.fn(() => ({
      select,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn(),
    },
    _select: select,
    _limit: limit,
  };
}

describe("remoteDrafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDraftSchemaMode("unknown");
    setCheckpointColumnsMode("unknown");
    setCurrentUserIdCache(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not duplicate last_checkpoint_hash in return fields", () => {
    setDraftSchemaMode("extended");
    setCheckpointColumnsMode("supported");

    const fields = getDraftFields("return")
      .split(",")
      .map((field) => field.trim());

    expect(fields.filter((field) => field === "last_checkpoint_hash")).toHaveLength(1);
  });

  it("writes schema_version for the extended draft schema", () => {
    setDraftSchemaMode("extended");

    expect(getDraftWritePayload("presentacion", createEmpresa(), 2, { ok: true })).toMatchObject(
      {
        schema_version: 2,
      }
    );
  });

  it("uses auth.getUser and caches the current user id", async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } } });
    const getSession = vi.fn();
    createClientMock.mockReturnValue({
      auth: {
        getUser,
        getSession,
      },
    });

    await expect(getCurrentUserId()).resolves.toBe("user-1");
    await expect(getCurrentUserId()).resolves.toBe("user-1");

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getSession).not.toHaveBeenCalled();
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it("prefers schema_version probing when the column exists", async () => {
    const probeClient = createProbeClient({
      schema_version: { data: [] },
      "last_checkpoint_at, last_checkpoint_hash": { data: [] },
    });
    createClientMock.mockReturnValue(probeClient);

    await ensureDraftCapabilities();

    expect(probeClient._select).toHaveBeenCalledWith("schema_version");
    expect(probeClient._select).toHaveBeenCalledWith(
      "last_checkpoint_at, last_checkpoint_hash"
    );
    expect(getDraftFields("summary")).toContain("schema_version");
  });

  it("falls back to the extended compatibility probe before marking the schema as legacy", async () => {
    const missingColumnError = { code: "42703", message: 'column "schema_version" does not exist' };
    const probeClient = createProbeClient({
      schema_version: { error: missingColumnError },
      "created_at, empresa_snapshot": { data: [] },
      "last_checkpoint_at, last_checkpoint_hash": { data: [] },
    });
    createClientMock.mockReturnValue(probeClient);

    await ensureDraftCapabilities();

    expect(probeClient._select).toHaveBeenCalledWith("schema_version");
    expect(probeClient._select).toHaveBeenCalledWith("created_at, empresa_snapshot");
    expect(getDraftFields("payload")).toContain("empresa_snapshot");
  });
});
