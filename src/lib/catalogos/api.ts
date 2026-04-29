import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAppRole } from "@/lib/auth/roles";
import {
  catalogoKindSchema,
  parseCatalogoListParams,
  type CatalogoKind,
} from "@/lib/catalogos/schemas";
import {
  CatalogoServerError,
  createCatalogoRecord,
  deleteCatalogoRecord,
  getCatalogoRecord,
  listCatalogoRecords,
  restoreCatalogoRecord,
  updateCatalogoRecord,
} from "@/lib/catalogos/server";

const ADMIN_ROLE = ["inclusion_empresas_admin"] as const;

export const CATALOGOS_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export type CatalogoRouteContext = {
  params: Promise<{ id: string }>;
};

function parseKind(kind: CatalogoKind) {
  return catalogoKindSchema.parse(kind);
}

export function jsonCatalogoError(error: unknown, logLabel: string) {
  if (error instanceof CatalogoServerError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: CATALOGOS_NO_STORE_HEADERS }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Payload inválido.",
        fieldErrors: error.flatten().fieldErrors,
      },
      { status: 400, headers: CATALOGOS_NO_STORE_HEADERS }
    );
  }

  console.error(logLabel, error);
  return NextResponse.json(
    { error: "Error interno del servidor." },
    { status: 500, headers: CATALOGOS_NO_STORE_HEADERS }
  );
}

async function requireCatalogoAdmin() {
  return requireAppRole(ADMIN_ROLE);
}

export function buildCatalogoCollectionHandlers(kind: CatalogoKind) {
  const parsedKind = parseKind(kind);

  return {
    async GET(request: Request) {
      try {
        const authorization = await requireCatalogoAdmin();
        if (!authorization.ok) {
          return authorization.response;
        }

        const params = parseCatalogoListParams(
          parsedKind,
          new URL(request.url).searchParams
        );
        const result = await listCatalogoRecords({ kind: parsedKind, params });

        return NextResponse.json(result, {
          headers: CATALOGOS_NO_STORE_HEADERS,
        });
      } catch (error) {
        return jsonCatalogoError(
          error,
          `[api/empresas/${parsedKind}.get] failed`
        );
      }
    },

    async POST(request: Request) {
      try {
        const authorization = await requireCatalogoAdmin();
        if (!authorization.ok) {
          return authorization.response;
        }

        const record = await createCatalogoRecord({
          kind: parsedKind,
          input: await request.json(),
        });

        return NextResponse.json(record, {
          status: 201,
          headers: CATALOGOS_NO_STORE_HEADERS,
        });
      } catch (error) {
        return jsonCatalogoError(
          error,
          `[api/empresas/${parsedKind}.post] failed`
        );
      }
    },
  };
}

export function buildCatalogoItemHandlers(kind: CatalogoKind) {
  const parsedKind = parseKind(kind);

  return {
    async GET(_request: Request, context: CatalogoRouteContext) {
      try {
        const authorization = await requireCatalogoAdmin();
        if (!authorization.ok) {
          return authorization.response;
        }

        const { id } = await context.params;
        const record = await getCatalogoRecord({ kind: parsedKind, id });
        if (!record) {
          return NextResponse.json(
            { error: "Registro no encontrado." },
            { status: 404, headers: CATALOGOS_NO_STORE_HEADERS }
          );
        }

        return NextResponse.json(record, {
          headers: CATALOGOS_NO_STORE_HEADERS,
        });
      } catch (error) {
        return jsonCatalogoError(
          error,
          `[api/empresas/${parsedKind}/[id].get] failed`
        );
      }
    },

    async PUT(request: Request, context: CatalogoRouteContext) {
      try {
        const authorization = await requireCatalogoAdmin();
        if (!authorization.ok) {
          return authorization.response;
        }

        const { id } = await context.params;
        const record = await updateCatalogoRecord({
          kind: parsedKind,
          id,
          input: await request.json(),
        });

        return NextResponse.json(record, {
          headers: CATALOGOS_NO_STORE_HEADERS,
        });
      } catch (error) {
        return jsonCatalogoError(
          error,
          `[api/empresas/${parsedKind}/[id].put] failed`
        );
      }
    },

    async DELETE(_request: Request, context: CatalogoRouteContext) {
      try {
        const authorization = await requireCatalogoAdmin();
        if (!authorization.ok) {
          return authorization.response;
        }

        const { id } = await context.params;
        const record = await deleteCatalogoRecord({ kind: parsedKind, id });

        return NextResponse.json(record, {
          headers: CATALOGOS_NO_STORE_HEADERS,
        });
      } catch (error) {
        return jsonCatalogoError(
          error,
          `[api/empresas/${parsedKind}/[id].delete] failed`
        );
      }
    },
  };
}

export function buildCatalogoRestoreHandler(kind: CatalogoKind) {
  const parsedKind = parseKind(kind);

  return async function POST(_request: Request, context: CatalogoRouteContext) {
    try {
      const authorization = await requireCatalogoAdmin();
      if (!authorization.ok) {
        return authorization.response;
      }

      const { id } = await context.params;
      const record = await restoreCatalogoRecord({ kind: parsedKind, id });

      return NextResponse.json(record, {
        headers: CATALOGOS_NO_STORE_HEADERS,
      });
    } catch (error) {
      return jsonCatalogoError(
        error,
        `[api/empresas/${parsedKind}/[id]/restore.post] failed`
      );
    }
  };
}
