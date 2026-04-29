import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import {
  deleteProfesional,
  enableProfesionalAccess,
} from "@/lib/profesionales/server";

type ProfessionalFixture = {
  id: number;
  nombre_profesional: string;
  correo_profesional: string | null;
  programa: string | null;
  antiguedad: number | null;
  usuario_login: string | null;
  auth_user_id: string | null;
  auth_password_temp: boolean;
  deleted_at: string | null;
};

function professional(overrides: Partial<ProfessionalFixture> = {}) {
  return {
    id: 20,
    nombre_profesional: "Sara Zambrano",
    correo_profesional: "sara@reca.test",
    programa: "Inclusión",
    antiguedad: 2,
    usuario_login: "sara_zambrano",
    auth_user_id: null,
    auth_password_temp: false,
    deleted_at: null,
    ...overrides,
  };
}

function createAdminMock(options: {
  professionals: ProfessionalFixture[];
  rolesByProfessionalId?: Record<number, string[]>;
  authUsers?: Array<{ id: string; email: string }>;
  linkedProfessionalByAuthUserId?: Record<string, number>;
}) {
  const updateUserById = vi.fn();
  const createUser = vi.fn();
  const getUserById = vi.fn();
  const listUsers = vi.fn().mockResolvedValue({
    data: { users: options.authUsers ?? [] },
    error: null,
  });

  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>();

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((field: string, value: unknown) => {
        filters.set(field, value);
        return query;
      }),
      is: vi.fn((field: string, value: unknown) => {
        filters.set(field, value);
        return query;
      }),
      ilike: vi.fn(() => query),
      limit: vi.fn(() => query),
      neq: vi.fn(() => query),
      in: vi.fn((field: string, values: number[]) => {
        if (table !== "profesional_roles" || field !== "profesional_id") {
          return Promise.resolve({ data: [], error: null });
        }

        return Promise.resolve({
          data: values.flatMap((id) =>
            (options.rolesByProfessionalId?.[id] ?? []).map((role) => ({
              profesional_id: id,
              role,
            }))
          ),
          error: null,
        });
      }),
      maybeSingle: vi.fn(() => {
        if (table !== "profesionales") {
          return Promise.resolve({ data: null, error: null });
        }

        const id = filters.get("id");
        if (typeof id === "number") {
          return Promise.resolve({
            data: options.professionals.find((row) => row.id === id) ?? null,
            error: null,
          });
        }

        const authUserId = filters.get("auth_user_id");
        if (typeof authUserId === "string") {
          const linkedId = options.linkedProfessionalByAuthUserId?.[authUserId];
          return Promise.resolve({
            data: typeof linkedId === "number" ? { id: linkedId } : null,
            error: null,
          });
        }

        return Promise.resolve({ data: null, error: null });
      }),
      then: (
        resolve: (value: { data: unknown[]; error: null }) => unknown,
        reject?: (reason: unknown) => unknown
      ) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };

    return query;
  });

  const admin = {
    from,
    auth: {
      admin: {
        listUsers,
        updateUserById,
        createUser,
        getUserById,
      },
    },
  };

  mocks.createSupabaseAdminClient.mockReturnValue(admin);
  return { admin, updateUserById, createUser };
}

const actor = {
  userId: "auth-admin-1",
  profesionalId: 1,
  nombre: "Aaron Vercel",
  usuarioLogin: "aaron_vercel",
};

describe("profesionales server safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects self-deleting the current admin profile", async () => {
    createAdminMock({
      professionals: [professional({ id: 1, usuario_login: "aaron_vercel" })],
      rolesByProfessionalId: { 1: ["inclusion_empresas_admin"] },
    });

    await expect(
      deleteProfesional({
        id: 1,
        comentario: "Retiro solicitado.",
        actor,
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "No puedes eliminar tu propio perfil.",
    });
  });

  it("blocks non-aaron admins from deleting the super-admin profile", async () => {
    createAdminMock({
      professionals: [professional({ id: 1, usuario_login: "aaron_vercel" })],
      rolesByProfessionalId: { 1: ["inclusion_empresas_admin"] },
    });

    await expect(
      deleteProfesional({
        id: 1,
        comentario: "Retiro solicitado.",
        actor: {
          ...actor,
          profesionalId: 2,
          usuarioLogin: "sandra_pachon",
        },
      })
    ).rejects.toMatchObject({
      status: 403,
      message: "Solo aaron_vercel puede eliminar el perfil super-admin.",
    });
  });

  it("does not rotate an existing Auth password when that Auth user belongs elsewhere", async () => {
    const { updateUserById, createUser } = createAdminMock({
      professionals: [professional({ id: 20 })],
      authUsers: [{ id: "auth-linked-1", email: "sara@reca.test" }],
      linkedProfessionalByAuthUserId: { "auth-linked-1": 99 },
    });

    await expect(
      enableProfesionalAccess({
        id: 20,
        input: {
          accessMode: "auth",
          correo_profesional: "sara@reca.test",
          usuario_login: "sara_zambrano",
          roles: ["inclusion_empresas_profesional"],
        },
        actor,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "Ese correo ya está vinculado a otro profesional activo.",
    });

    expect(updateUserById).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });
});
