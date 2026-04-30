import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  EMPRESA_LIST_FIELDS,
  EMPRESA_SELECT_FIELDS,
} from "@/lib/empresas/constants";
import {
  buildEmpresaCreationEvent,
  buildEmpresaDeletionEvent,
  buildEmpresaMutationEvents,
  describeEmpresaEvent,
  summarizeEmpresaEvent,
  type EmpresaEventDraft,
  type EmpresaMutationActor,
} from "@/lib/empresas/events";
import { applyEmpresaListQuery } from "@/lib/empresas/queries";
import type {
  EmpresaFormInput,
  EmpresaListParams,
  EmpresaUpdateInput,
} from "@/lib/empresas/schemas";

export class EmpresaServerError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export type EmpresaRow = {
  id: string;
  nombre_empresa: string;
  nit_empresa: string | null;
  direccion_empresa: string | null;
  ciudad_empresa: string | null;
  sede_empresa: string | null;
  zona_empresa: string | null;
  correo_1: string | null;
  contacto_empresa: string | null;
  telefono_empresa: string | null;
  cargo: string | null;
  responsable_visita: string | null;
  profesional_asignado_id: number | null;
  profesional_asignado: string | null;
  correo_profesional: string | null;
  asesor: string | null;
  correo_asesor: string | null;
  caja_compensacion: string | null;
  estado: string | null;
  observaciones: string | null;
  comentarios_empresas: string | null;
  gestion: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type EmpresaListRow = Pick<
  EmpresaRow,
  | "id"
  | "nombre_empresa"
  | "nit_empresa"
  | "ciudad_empresa"
  | "sede_empresa"
  | "zona_empresa"
  | "gestion"
  | "profesional_asignado"
  | "asesor"
  | "caja_compensacion"
  | "estado"
  | "updated_at"
>;

type ProfessionalSnapshot = {
  id: number;
  nombre_profesional: string | null;
  correo_profesional: string | null;
};

type AsesorSnapshot = {
  nombre: string | null;
  email: string | null;
};

type EmpresaCatalogoFiltrosRow = {
  zonas: string[] | null;
  estados: string[] | null;
  gestores: string[] | null;
  cajas: string[] | null;
  asesores: string[] | null;
};

type EmpresaEventoRow = {
  id: string;
  empresa_id: string;
  tipo: string | null;
  actor_user_id: string;
  actor_profesional_id: number | null;
  actor_nombre: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type EmpresaDbPayload = Omit<
  EmpresaFormInput,
  "comentario" | "profesional_asignado_id"
> & {
  profesional_asignado_id: number | null;
  profesional_asignado: string | null;
  correo_profesional: string | null;
  updated_at?: string;
};

function readNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function resolveProfessionalSnapshot(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  profesionalId: number | null
) {
  if (!profesionalId) {
    return null;
  }

  const { data, error } = await admin
    .from("profesionales")
    .select("id, nombre_profesional, correo_profesional")
    .eq("id", profesionalId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new EmpresaServerError(400, "El profesional asignado no existe.");
  }

  return data as unknown as ProfessionalSnapshot;
}

async function assertZonaCompensarAllowed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  zonaEmpresa: string | null
) {
  const zona = readNonEmptyString(zonaEmpresa);
  if (!zona) {
    return;
  }

  const filtros = await getEmpresaCatalogoFiltros(admin);
  const zonas = new Set(
    uniqueSorted(filtros.zonas ?? []).map((value) =>
      value.toLocaleLowerCase("es-CO")
    )
  );

  if (!zonas.has(zona.toLocaleLowerCase("es-CO"))) {
    throw new EmpresaServerError(
      400,
      "Selecciona una Zona Compensar válida."
    );
  }
}

async function buildEmpresaDbPayload(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: EmpresaFormInput | EmpresaUpdateInput,
  options: { touchUpdatedAt: boolean }
): Promise<EmpresaDbPayload> {
  await assertZonaCompensarAllowed(admin, input.zona_empresa);

  const professional = await resolveProfessionalSnapshot(
    admin,
    input.profesional_asignado_id
  );

  return {
    nombre_empresa: input.nombre_empresa,
    nit_empresa: input.nit_empresa,
    direccion_empresa: input.direccion_empresa,
    ciudad_empresa: input.ciudad_empresa,
    sede_empresa: input.sede_empresa,
    zona_empresa: input.zona_empresa,
    correo_1: input.correo_1,
    contacto_empresa: input.contacto_empresa,
    telefono_empresa: input.telefono_empresa,
    cargo: input.cargo,
    responsable_visita: input.responsable_visita,
    profesional_asignado_id: professional?.id ?? null,
    profesional_asignado: professional
      ? readNonEmptyString(professional.nombre_profesional)
      : null,
    correo_profesional: professional
      ? readNonEmptyString(professional.correo_profesional)
      : null,
    asesor: input.asesor,
    correo_asesor: input.correo_asesor,
    caja_compensacion: input.caja_compensacion,
    estado: input.estado,
    observaciones: input.observaciones,
    gestion: input.gestion,
    ...(options.touchUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  };
}

async function insertEmpresaEvents(options: {
  empresaId: string;
  events: EmpresaEventDraft[];
}) {
  if (options.events.length === 0) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("empresa_eventos").insert(
    options.events.map((event) => ({
      empresa_id: options.empresaId,
      ...event,
    }))
  );

  if (error) {
    throw error;
  }
}

export async function listEmpresas(options: { params: EmpresaListParams }) {
  const admin = createSupabaseAdminClient();
  const query = admin
    .from("empresas")
    .select(EMPRESA_LIST_FIELDS, { count: "exact" });
  const { data, error, count } = await applyEmpresaListQuery(
    query,
    options.params
  );

  if (error) {
    throw error;
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as unknown as EmpresaListRow[],
    total,
    page: options.params.page,
    pageSize: options.params.pageSize,
    totalPages: Math.ceil(total / options.params.pageSize),
  };
}

export async function getEmpresaDetail(options: { id: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("id", options.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as unknown as EmpresaRow | null) ?? null;
}

export async function createEmpresa(options: {
  input: EmpresaFormInput;
  actor: EmpresaMutationActor;
}) {
  const admin = createSupabaseAdminClient();
  const payload = await buildEmpresaDbPayload(admin, options.input, {
    touchUpdatedAt: false,
  });
  const { data, error } = await admin
    .from("empresas")
    .insert(payload)
    .select(EMPRESA_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new EmpresaServerError(500, "No se pudo crear la empresa.");
  }

  const created = data as unknown as EmpresaRow;
  await insertEmpresaEvents({
    empresaId: created.id,
    events: [
      buildEmpresaCreationEvent({
        actor: options.actor,
        snapshot: created,
      }),
    ],
  });

  return created;
}

export async function updateEmpresa(options: {
  id: string;
  input: EmpresaUpdateInput;
  actor: EmpresaMutationActor;
}) {
  const admin = createSupabaseAdminClient();
  const before = await getEmpresaDetail({ id: options.id });

  if (!before) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }

  if (
    readNonEmptyString(before.estado) !== readNonEmptyString(options.input.estado) &&
    !readNonEmptyString(options.input.comentario)
  ) {
    throw new EmpresaServerError(
      400,
      "El comentario es obligatorio cuando cambia el estado."
    );
  }

  const payload = await buildEmpresaDbPayload(admin, options.input, {
    touchUpdatedAt: true,
  });
  const { data, error } = await admin
    .from("empresas")
    .update(payload)
    .eq("id", options.id)
    .is("deleted_at", null)
    .select(EMPRESA_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }

  const updated = data as unknown as EmpresaRow;
  await insertEmpresaEvents({
    empresaId: updated.id,
    events: buildEmpresaMutationEvents({
      actor: options.actor,
      before,
      after: updated,
      comentario: options.input.comentario,
    }),
  });

  return updated;
}

export async function deleteEmpresa(options: {
  id: string;
  comentario?: string | null;
  actor: EmpresaMutationActor;
}) {
  const admin = createSupabaseAdminClient();
  const before = await getEmpresaDetail({ id: options.id });

  if (!before) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }

  const { data, error } = await admin
    .from("empresas")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }

  await insertEmpresaEvents({
    empresaId: options.id,
    events: [
      buildEmpresaDeletionEvent({
        actor: options.actor,
        snapshot: before,
        comentario: options.comentario,
      }),
    ],
  });

  return { deleted: true };
}

export async function listEmpresaEventos(options: {
  empresaId: string;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("empresa_eventos")
    .select(
      "id, empresa_id, tipo, actor_user_id, actor_profesional_id, actor_nombre, payload, created_at"
    )
    .eq("empresa_id", options.empresaId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as EmpresaEventoRow[]).map((event) => ({
    ...event,
    resumen: summarizeEmpresaEvent(event),
    detalle: describeEmpresaEvent(event),
  }));
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map(readNonEmptyString).filter(Boolean) as string[])].sort(
    (a, b) => a.localeCompare(b, "es")
  );
}

async function getEmpresaCatalogoFiltros(
  admin: ReturnType<typeof createSupabaseAdminClient>
) {
  const { data, error } = await admin
    .rpc("empresa_catalogo_filtros")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const filtros = (data ?? {}) as EmpresaCatalogoFiltrosRow;
  return {
    zonas: uniqueSorted(filtros.zonas ?? []),
    estados: uniqueSorted(filtros.estados ?? []),
    gestores: uniqueSorted(filtros.gestores ?? []),
    cajas: uniqueSorted(filtros.cajas ?? []),
    asesores: uniqueSorted(filtros.asesores ?? []),
  };
}

export async function getEmpresaCatalogos() {
  const admin = createSupabaseAdminClient();
  const [profesionales, asesores, filtros] = await Promise.all([
    admin
      .from("profesionales")
      .select("id, nombre_profesional, correo_profesional")
      .is("deleted_at", null)
      .order("nombre_profesional", { ascending: true }),
    admin
      .from("asesores")
      .select("nombre, email")
      .is("deleted_at", null)
      .order("nombre", { ascending: true }),
    getEmpresaCatalogoFiltros(admin),
  ]);

  if (profesionales.error) {
    throw profesionales.error;
  }
  if (asesores.error) {
    throw asesores.error;
  }
  return {
    profesionales: ((profesionales.data ?? []) as unknown as ProfessionalSnapshot[])
      .filter((row) => readNonEmptyString(row.nombre_profesional))
      .map((row) => ({
        id: row.id,
        nombre: readNonEmptyString(row.nombre_profesional) ?? "Profesional",
        correo: readNonEmptyString(row.correo_profesional),
      })),
    asesores: ((asesores.data ?? []) as unknown as AsesorSnapshot[])
      .filter((row) => readNonEmptyString(row.nombre))
      .map((row) => ({
        nombre: readNonEmptyString(row.nombre) ?? "Asesor",
        email: readNonEmptyString(row.email),
      })),
    zonasCompensar: filtros.zonas,
    filtros: {
      zonas: filtros.zonas,
      estados: filtros.estados,
      gestores: filtros.gestores,
      cajas: filtros.cajas,
      asesores: filtros.asesores,
    },
  };
}
