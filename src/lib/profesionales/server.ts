import { isAppRole, type AppRole } from "@/lib/auth/appRoles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildProfesionalDeletionEvents,
  buildProfesionalResetPasswordEvent,
  buildProfesionalRoleEvents,
  summarizeProfesionalEvent,
  type ProfesionalEventDraft,
  type ProfesionalMutationActor,
} from "@/lib/profesionales/events";
import { generateTemporaryPassword } from "@/lib/profesionales/passwords";
import {
  assertCanChangeAdminInclusionRole,
  canManageAdminInclusionRole,
} from "@/lib/profesionales/permissions";
import {
  buildUsuarioLoginBase,
  dedupeUsuarioLogin,
} from "@/lib/profesionales/normalization";
import type {
  EnableProfesionalAccessInput,
  ProfesionalFormInput,
  ProfesionalListParams,
  ProfesionalUpdateInput,
} from "@/lib/profesionales/schemas";

const PROFESIONAL_SELECT_FIELDS = [
  "id",
  "nombre_profesional",
  "correo_profesional",
  "programa",
  "antiguedad",
  "usuario_login",
  "auth_user_id",
  "auth_password_temp",
  "deleted_at",
].join(", ");

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export class ProfesionalServerError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export type ProfesionalRow = {
  id: number;
  nombre_profesional: string;
  correo_profesional: string | null;
  programa: string | null;
  antiguedad: number | null;
  usuario_login: string | null;
  auth_user_id: string | null;
  auth_password_temp: boolean;
  deleted_at: string | null;
  roles: AppRole[];
};

type ProfesionalDbRow = Omit<ProfesionalRow, "roles">;

type ProfesionalEventoRow = {
  id: string;
  profesional_id: number;
  tipo: string | null;
  actor_user_id: string;
  actor_profesional_id: number | null;
  actor_nombre: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type EmpresaAssignmentRow = {
  id: string;
  nombre_empresa: string | null;
  profesional_asignado_id: number | null;
  profesional_asignado: string | null;
  correo_profesional: string | null;
};

type ProfesionalActor = ProfesionalMutationActor & {
  usuarioLogin: string | null;
};

type AuthUserSnapshot = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

function readNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeComparable(value: string | null | undefined) {
  return readNonEmptyString(value)?.toLowerCase() ?? null;
}

function escapeSearchTerm(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function listActiveUsuarioLogins(admin: SupabaseAdmin, excludeId?: number) {
  let query = admin
    .from("profesionales")
    .select("usuario_login")
    .is("deleted_at", null);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{ usuario_login: string | null }>)
    .map((row) => readNonEmptyString(row.usuario_login))
    .filter(Boolean) as string[];
}

async function suggestUsuarioLoginWithAdmin(options: {
  admin: SupabaseAdmin;
  nombre: string;
  excludeId?: number;
}) {
  const base = buildUsuarioLoginBase(options.nombre);
  if (!base) {
    throw new ProfesionalServerError(
      400,
      "El nombre debe permitir generar un usuario login."
    );
  }

  return dedupeUsuarioLogin(
    base,
    await listActiveUsuarioLogins(options.admin, options.excludeId)
  );
}

export async function suggestProfesionalUsuarioLogin(options: {
  nombre: string;
  excludeId?: number;
}) {
  const admin = createSupabaseAdminClient();
  return suggestUsuarioLoginWithAdmin({
    admin,
    nombre: options.nombre,
    excludeId: options.excludeId,
  });
}

async function hydrateRoles(
  admin: SupabaseAdmin,
  rows: ProfesionalDbRow[]
): Promise<ProfesionalRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const { data, error } = await admin
    .from("profesional_roles")
    .select("profesional_id, role")
    .in("profesional_id", ids);

  if (error) {
    throw error;
  }

  const rolesById = new Map<number, AppRole[]>();
  for (const row of (data ?? []) as Array<{
    profesional_id: number;
    role: string | null;
  }>) {
    if (!isAppRole(row.role)) {
      continue;
    }
    rolesById.set(row.profesional_id, [
      ...(rolesById.get(row.profesional_id) ?? []),
      row.role,
    ]);
  }

  return rows.map((row) => ({
    ...row,
    roles: rolesById.get(row.id) ?? [],
  }));
}

async function insertProfesionalEvents(options: {
  profesionalId: number;
  events: ProfesionalEventDraft[];
}) {
  if (options.events.length === 0) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profesional_eventos").insert(
    options.events.map((event) => ({
      profesional_id: options.profesionalId,
      ...event,
    }))
  );

  if (error) {
    throw error;
  }
}

async function ensureUniqueActiveFields(
  admin: SupabaseAdmin,
  input: Pick<ProfesionalFormInput, "correo_profesional" | "usuario_login">,
  options: {
    excludeId?: number;
    currentUsuarioLogin?: string | null;
    currentCorreoProfesional?: string | null;
  } = {}
) {
  const checks = [
    {
      field: "usuario_login",
      value: readNonEmptyString(input.usuario_login),
      current: readNonEmptyString(options.currentUsuarioLogin),
      message: "El usuario login ya está en uso.",
    },
    {
      field: "correo_profesional",
      value: readNonEmptyString(input.correo_profesional),
      current: readNonEmptyString(options.currentCorreoProfesional),
      message: "El correo ya está en uso.",
    },
  ] as const;

  for (const check of checks) {
    if (!check.value) {
      continue;
    }
    if (
      check.current &&
      normalizeComparable(check.current) === normalizeComparable(check.value)
    ) {
      continue;
    }

    let query = admin
      .from("profesionales")
      .select("id")
      .ilike(check.field, check.value)
      .is("deleted_at", null)
      .limit(1);

    if (options.excludeId) {
      query = query.neq("id", options.excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if ((data ?? []).length > 0) {
      throw new ProfesionalServerError(409, check.message);
    }
  }
}

async function findAuthUserByEmail(admin: SupabaseAdmin, email: string) {
  const normalized = email.toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === normalized
    );
    if (found) {
      return found as AuthUserSnapshot;
    }

    if (data.users.length < 1000) {
      break;
    }
    page += 1;
  }

  return null;
}

async function findActiveProfessionalIdByAuthUserId(
  admin: SupabaseAdmin,
  authUserId: string
) {
  const { data, error } = await admin
    .from("profesionales")
    .select("id")
    .eq("auth_user_id", authUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return typeof data?.id === "number" ? data.id : null;
}

function buildTempMetadata(user: AuthUserSnapshot | null | undefined) {
  return {
    ...(user?.app_metadata ?? {}),
    reca_password_temp: true,
    reca_disabled: false,
  };
}

function buildUserMetadata(input: {
  nombre_profesional: string;
  usuario_login: string | null;
}) {
  return {
    nombre_profesional: input.nombre_profesional,
    usuario_login: input.usuario_login,
  };
}

async function createOrUpdateAuthUserForAccess(
  admin: SupabaseAdmin,
  input: Pick<
    ProfesionalFormInput,
    "correo_profesional" | "usuario_login" | "nombre_profesional"
  >,
  options: {
    currentProfesionalId?: number;
  } = {}
) {
  const email = readNonEmptyString(input.correo_profesional);
  const usuarioLogin = readNonEmptyString(input.usuario_login);

  if (!email || !usuarioLogin) {
    throw new ProfesionalServerError(
      400,
      "Correo y usuario login son obligatorios para habilitar acceso."
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const existingUser = await findAuthUserByEmail(admin, email);

  if (existingUser) {
    const linkedProfesionalId = await findActiveProfessionalIdByAuthUserId(
      admin,
      existingUser.id
    );
    if (
      linkedProfesionalId !== null &&
      linkedProfesionalId !== options.currentProfesionalId
    ) {
      throw new ProfesionalServerError(
        409,
        "Ese correo ya está vinculado a otro profesional activo."
      );
    }

    const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
      email,
      password: temporaryPassword,
      email_confirm: true,
      ban_duration: "none",
      app_metadata: buildTempMetadata(existingUser),
      user_metadata: buildUserMetadata({
        nombre_profesional: input.nombre_profesional,
        usuario_login: usuarioLogin,
      }),
    });

    if (error || !data.user) {
      throw error ?? new Error("No se pudo actualizar el usuario Auth.");
    }

    return {
      authUserId: data.user.id,
      temporaryPassword,
      createdAuthUser: false,
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: buildTempMetadata(null),
    user_metadata: buildUserMetadata({
      nombre_profesional: input.nombre_profesional,
      usuario_login: usuarioLogin,
    }),
  });

  if (error || !data.user) {
    throw error ?? new Error("No se pudo crear el usuario Auth.");
  }

  return {
    authUserId: data.user.id,
    temporaryPassword,
    createdAuthUser: true,
  };
}

async function updateAuthTempFlag(options: {
  admin: SupabaseAdmin;
  authUserId: string;
  value: boolean;
}) {
  const { data: authData, error: getError } =
    await options.admin.auth.admin.getUserById(options.authUserId);

  if (getError || !authData.user) {
    throw getError ?? new Error("Usuario Auth no encontrado.");
  }

  const { error } = await options.admin.auth.admin.updateUserById(
    options.authUserId,
    {
      app_metadata: {
        ...(authData.user.app_metadata ?? {}),
        reca_password_temp: options.value,
      },
    }
  );

  if (error) {
    throw error;
  }
}

async function disableAuthUser(admin: SupabaseAdmin, authUserId: string) {
  const { data: authData, error: getError } =
    await admin.auth.admin.getUserById(authUserId);

  if (getError || !authData.user) {
    throw getError ?? new Error("Usuario Auth no encontrado.");
  }

  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    ban_duration: "876000h",
    app_metadata: {
      ...(authData.user.app_metadata ?? {}),
      reca_password_temp: false,
      reca_disabled: true,
    },
  });

  if (error) {
    throw error;
  }
}

async function setProfessionalRoles(options: {
  admin: SupabaseAdmin;
  profesionalId: number;
  beforeRoles: AppRole[];
  afterRoles: AppRole[];
  actor: ProfesionalActor;
}) {
  assertCanChangeAdminInclusionRole({
    actorUsuarioLogin: options.actor.usuarioLogin,
    beforeRoles: options.beforeRoles,
    afterRoles: options.afterRoles,
  });

  const rolesToRemove = options.beforeRoles.filter(
    (role) => !options.afterRoles.includes(role)
  );
  const rolesToAdd = options.afterRoles.filter(
    (role) => !options.beforeRoles.includes(role)
  );

  if (rolesToRemove.length > 0) {
    const { error } = await options.admin
      .from("profesional_roles")
      .delete()
      .eq("profesional_id", options.profesionalId)
      .in("role", rolesToRemove);

    if (error) {
      throw error;
    }
  }

  if (rolesToAdd.length > 0) {
    const { error } = await options.admin.from("profesional_roles").upsert(
      rolesToAdd.map((role) => ({
        profesional_id: options.profesionalId,
        role,
        assigned_by: options.actor.userId,
      })),
      { onConflict: "profesional_id,role" }
    );

    if (error) {
      throw error;
    }
  }

  await insertProfesionalEvents({
    profesionalId: options.profesionalId,
    events: buildProfesionalRoleEvents({
      actor: options.actor,
      beforeRoles: options.beforeRoles,
      afterRoles: options.afterRoles,
    }),
  });
}

function buildDbPayload(input: ProfesionalFormInput | ProfesionalUpdateInput) {
  return {
    nombre_profesional: input.nombre_profesional,
    correo_profesional: input.correo_profesional,
    programa: input.programa,
    antiguedad: input.antiguedad,
    usuario_login: input.usuario_login,
  };
}

async function applyUsuarioLoginForCreate(
  admin: SupabaseAdmin,
  input: ProfesionalFormInput
): Promise<ProfesionalFormInput> {
  return {
    ...input,
    usuario_login: await suggestUsuarioLoginWithAdmin({
      admin,
      nombre: input.nombre_profesional,
    }),
  };
}

async function applyUsuarioLoginForUpdate(options: {
  admin: SupabaseAdmin;
  input: ProfesionalUpdateInput;
  before: ProfesionalRow;
}): Promise<ProfesionalUpdateInput> {
  const nameChanged =
    normalizeComparable(options.before.nombre_profesional) !==
    normalizeComparable(options.input.nombre_profesional);

  if (!nameChanged && readNonEmptyString(options.before.usuario_login)) {
    return {
      ...options.input,
      usuario_login: readNonEmptyString(options.before.usuario_login),
    };
  }

  return {
    ...options.input,
    usuario_login: await suggestUsuarioLoginWithAdmin({
      admin: options.admin,
      nombre: options.input.nombre_profesional,
      excludeId: options.before.id,
    }),
  };
}

function diffProfessionalFields(
  before: ProfesionalRow,
  input: ProfesionalUpdateInput
) {
  const fields = [
    "nombre_profesional",
    "correo_profesional",
    "programa",
    "antiguedad",
    "usuario_login",
  ] as const;
  const changed: Record<string, { antes: unknown; despues: unknown }> = {};

  for (const field of fields) {
    if (before[field] !== input[field]) {
      changed[field] = {
        antes: before[field],
        despues: input[field],
      };
    }
  }

  return changed;
}

async function getProfessionalById(options: {
  id: number;
  includeDeleted?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("profesionales")
    .select(PROFESIONAL_SELECT_FIELDS)
    .eq("id", options.id);

  if (!options.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [row] = await hydrateRoles(admin, [data as unknown as ProfesionalDbRow]);
  return row;
}

export async function listProfesionales(options: {
  params: ProfesionalListParams;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("profesionales")
    .select(PROFESIONAL_SELECT_FIELDS, { count: "exact" });

  if (options.params.estado === "activos") {
    query = query.is("deleted_at", null);
  } else if (options.params.estado === "eliminados") {
    query = query.not("deleted_at", "is", null);
  }

  if (options.params.q) {
    const term = `%${escapeSearchTerm(options.params.q)}%`;
    query = query.or(
      [
        `nombre_profesional.ilike.${term}`,
        `correo_profesional.ilike.${term}`,
        `usuario_login.ilike.${term}`,
        `programa.ilike.${term}`,
      ].join(",")
    );
  }

  const from = (options.params.page - 1) * options.params.pageSize;
  const to = from + options.params.pageSize - 1;
  const { data, error, count } = await query
    .order(options.params.sort, {
      ascending: options.params.direction === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  if (error) {
    throw error;
  }

  const items = await hydrateRoles(
    admin,
    (data ?? []) as unknown as ProfesionalDbRow[]
  );
  const total = count ?? 0;

  return {
    items,
    total,
    page: options.params.page,
    pageSize: options.params.pageSize,
    totalPages: Math.ceil(total / options.params.pageSize),
  };
}

export async function getProfesionalDetail(options: {
  id: number;
  includeDeleted?: boolean;
}) {
  return getProfessionalById(options);
}

export async function createProfesional(options: {
  input: ProfesionalFormInput;
  actor: ProfesionalActor;
}) {
  const admin = createSupabaseAdminClient();
  const input = await applyUsuarioLoginForCreate(admin, options.input);
  await ensureUniqueActiveFields(admin, input);
  assertCanChangeAdminInclusionRole({
    actorUsuarioLogin: options.actor.usuarioLogin,
    beforeRoles: [],
    afterRoles: input.roles,
  });

  const authResult =
    input.accessMode === "auth"
      ? await createOrUpdateAuthUserForAccess(admin, input)
      : null;

  const { data, error } = await admin
    .from("profesionales")
    .insert({
      ...buildDbPayload(input),
      auth_user_id: authResult?.authUserId ?? null,
      auth_password_temp: Boolean(authResult),
      deleted_at: null,
    })
    .select(PROFESIONAL_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ProfesionalServerError(500, "No se pudo crear el profesional.");
  }

  const created = data as unknown as ProfesionalDbRow;
  await insertProfesionalEvents({
    profesionalId: created.id,
    events: [
      {
        tipo: "creacion",
        actor_user_id: options.actor.userId,
        actor_profesional_id: options.actor.profesionalId,
        actor_nombre: options.actor.nombre,
        payload: { modo: input.accessMode },
      },
      ...(authResult
        ? [
            {
              tipo: "habilitar_acceso" as const,
              actor_user_id: options.actor.userId,
              actor_profesional_id: options.actor.profesionalId,
              actor_nombre: options.actor.nombre,
              payload: {
                auth_user_id: authResult.authUserId,
                usuario_login: input.usuario_login,
                auth_creado: authResult.createdAuthUser,
                contrasena_temporal_generada: true,
              },
            },
          ]
        : []),
    ],
  });

  await setProfessionalRoles({
    admin,
    profesionalId: created.id,
    beforeRoles: [],
    afterRoles: input.roles,
    actor: options.actor,
  });

  const [profesional] = await hydrateRoles(admin, [created]);

  return {
    profesional,
    temporaryPassword: authResult?.temporaryPassword,
  };
}

export async function updateProfesional(options: {
  id: number;
  input: ProfesionalUpdateInput;
  actor: ProfesionalActor;
}) {
  const admin = createSupabaseAdminClient();
  const before = await getProfessionalById({ id: options.id });

  if (!before) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  if (before.auth_user_id && options.input.accessMode !== "auth") {
    throw new ProfesionalServerError(
      400,
      "No se puede quitar el acceso desde la edición. Usa eliminar para desactivar."
    );
  }

  if (!before.auth_user_id && options.input.accessMode === "auth") {
    throw new ProfesionalServerError(
      400,
      "Usa Habilitar acceso para crear o enlazar Auth."
    );
  }

  const input = await applyUsuarioLoginForUpdate({
    admin,
    input: options.input,
    before,
  });

  await ensureUniqueActiveFields(admin, input, {
    excludeId: options.id,
    currentUsuarioLogin: before.usuario_login,
    currentCorreoProfesional: before.correo_profesional,
  });
  assertCanChangeAdminInclusionRole({
    actorUsuarioLogin: options.actor.usuarioLogin,
    beforeRoles: before.roles,
    afterRoles: input.roles,
  });

  if (before.auth_user_id && input.correo_profesional) {
    const { data: authData, error: authError } =
      await admin.auth.admin.getUserById(before.auth_user_id);

    if (authError || !authData.user) {
      throw authError ?? new Error("Usuario Auth no encontrado.");
    }

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      before.auth_user_id,
      {
        email: input.correo_profesional,
        email_confirm: true,
        app_metadata: authData.user.app_metadata,
        user_metadata: buildUserMetadata({
          nombre_profesional: input.nombre_profesional,
          usuario_login: input.usuario_login,
        }),
      }
    );

    if (updateAuthError) {
      throw updateAuthError;
    }
  }

  const { data, error } = await admin
    .from("profesionales")
    .update(buildDbPayload(input))
    .eq("id", options.id)
    .is("deleted_at", null)
    .select(PROFESIONAL_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  const changed = diffProfessionalFields(before, input);
  if (Object.keys(changed).length > 0) {
    await insertProfesionalEvents({
      profesionalId: options.id,
      events: [
        {
          tipo: "edicion",
          actor_user_id: options.actor.userId,
          actor_profesional_id: options.actor.profesionalId,
          actor_nombre: options.actor.nombre,
          payload: { campos: changed },
        },
      ],
    });
  }

  await setProfessionalRoles({
    admin,
    profesionalId: options.id,
    beforeRoles: before.roles,
    afterRoles: input.roles,
    actor: options.actor,
  });

  const [updated] = await hydrateRoles(admin, [data as unknown as ProfesionalDbRow]);
  return updated;
}

export async function enableProfesionalAccess(options: {
  id: number;
  input: EnableProfesionalAccessInput;
  actor: ProfesionalActor;
}) {
  const admin = createSupabaseAdminClient();
  const before = await getProfessionalById({ id: options.id });

  if (!before) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  if (before.auth_user_id) {
    throw new ProfesionalServerError(409, "El profesional ya tiene acceso Auth.");
  }

  const usuarioLogin =
    readNonEmptyString(before.usuario_login) ??
    (await suggestUsuarioLoginWithAdmin({
      admin,
      nombre: before.nombre_profesional,
      excludeId: options.id,
    }));
  const input = {
    ...options.input,
    usuario_login: usuarioLogin,
  };

  await ensureUniqueActiveFields(
    admin,
    {
      correo_profesional: input.correo_profesional,
      usuario_login: input.usuario_login,
    },
    { excludeId: options.id }
  );
  assertCanChangeAdminInclusionRole({
    actorUsuarioLogin: options.actor.usuarioLogin,
    beforeRoles: before.roles,
    afterRoles: input.roles,
  });

  const authResult = await createOrUpdateAuthUserForAccess(
    admin,
    {
      nombre_profesional: before.nombre_profesional,
      correo_profesional: input.correo_profesional,
      usuario_login: input.usuario_login,
    },
    {
      currentProfesionalId: options.id,
    }
  );

  const { data, error } = await admin
    .from("profesionales")
    .update({
      correo_profesional: input.correo_profesional,
      usuario_login: input.usuario_login,
      auth_user_id: authResult.authUserId,
      auth_password_temp: true,
      deleted_at: null,
    })
    .eq("id", options.id)
    .is("deleted_at", null)
    .select(PROFESIONAL_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  await insertProfesionalEvents({
    profesionalId: options.id,
    events: [
      {
        tipo: "habilitar_acceso",
        actor_user_id: options.actor.userId,
        actor_profesional_id: options.actor.profesionalId,
        actor_nombre: options.actor.nombre,
        payload: {
          auth_user_id: authResult.authUserId,
          usuario_login: input.usuario_login,
          auth_creado: authResult.createdAuthUser,
          contrasena_temporal_generada: true,
        },
      },
    ],
  });

  await setProfessionalRoles({
    admin,
    profesionalId: options.id,
    beforeRoles: before.roles,
    afterRoles: input.roles,
    actor: options.actor,
  });

  const [profesional] = await hydrateRoles(admin, [
    data as unknown as ProfesionalDbRow,
  ]);

  return {
    profesional,
    temporaryPassword: authResult.temporaryPassword,
  };
}

export async function resetProfesionalPassword(options: {
  id: number;
  actor: ProfesionalActor;
}) {
  const admin = createSupabaseAdminClient();
  const profesional = await getProfessionalById({ id: options.id });

  if (!profesional) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  if (!profesional.auth_user_id) {
    throw new ProfesionalServerError(
      400,
      "El profesional no tiene acceso Auth habilitado."
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: authData, error: getError } = await admin.auth.admin.getUserById(
    profesional.auth_user_id
  );

  if (getError || !authData.user) {
    throw getError ?? new Error("Usuario Auth no encontrado.");
  }

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(
    profesional.auth_user_id,
    {
      password: temporaryPassword,
      ban_duration: "none",
      app_metadata: {
        ...(authData.user.app_metadata ?? {}),
        reca_password_temp: true,
        reca_disabled: false,
      },
    }
  );

  if (updateAuthError) {
    throw updateAuthError;
  }

  const { error } = await admin
    .from("profesionales")
    .update({ auth_password_temp: true })
    .eq("id", options.id)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  await insertProfesionalEvents({
    profesionalId: options.id,
    events: [
      buildProfesionalResetPasswordEvent({
        actor: options.actor,
        authUserId: profesional.auth_user_id,
        temporaryPassword,
      }),
    ],
  });

  return { temporaryPassword };
}

async function releaseAssignedEmpresas(options: {
  admin: SupabaseAdmin;
  profesional: ProfesionalRow;
  actor: ProfesionalActor;
  comentario: string;
}) {
  const { data: empresas, error } = await options.admin
    .from("empresas")
    .select(
      "id, nombre_empresa, profesional_asignado_id, profesional_asignado, correo_profesional"
    )
    .eq("profesional_asignado_id", options.profesional.id)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  const rows = (empresas ?? []) as unknown as EmpresaAssignmentRow[];
  if (rows.length === 0) {
    return 0;
  }

  const { error: updateError } = await options.admin
    .from("empresas")
    .update({
      profesional_asignado_id: null,
      profesional_asignado: null,
      correo_profesional: null,
      updated_at: new Date().toISOString(),
    })
    .eq("profesional_asignado_id", options.profesional.id)
    .is("deleted_at", null);

  if (updateError) {
    throw updateError;
  }

  const { error: eventError } = await options.admin.from("empresa_eventos").insert(
    rows.map((empresa) => ({
      empresa_id: empresa.id,
      tipo: "desasignacion_gerente",
      actor_user_id: options.actor.userId,
      actor_profesional_id: options.actor.profesionalId,
      actor_nombre: options.actor.nombre,
      payload: {
        comentario: options.comentario,
        anterior_profesional_id: options.profesional.id,
        anterior_nombre: options.profesional.nombre_profesional,
        origen: "eliminacion_profesional",
      },
    }))
  );

  if (eventError) {
    throw eventError;
  }

  return rows.length;
}

export async function deleteProfesional(options: {
  id: number;
  comentario: string;
  actor: ProfesionalActor;
}) {
  const admin = createSupabaseAdminClient();
  const before = await getProfessionalById({ id: options.id });

  if (!before) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  if (options.actor.profesionalId === options.id) {
    throw new ProfesionalServerError(400, "No puedes eliminar tu propio perfil.");
  }

  if (
    canManageAdminInclusionRole(before.usuario_login) &&
    !canManageAdminInclusionRole(options.actor.usuarioLogin)
  ) {
    throw new ProfesionalServerError(
      403,
      "Solo aaron_vercel puede eliminar el perfil super-admin."
    );
  }

  const releasedEmpresas = await releaseAssignedEmpresas({
    admin,
    profesional: before,
    actor: options.actor,
    comentario: options.comentario,
  });

  if (before.auth_user_id) {
    await disableAuthUser(admin, before.auth_user_id);
  }

  const { error: rolesError } = await admin
    .from("profesional_roles")
    .delete()
    .eq("profesional_id", options.id);

  if (rolesError) {
    throw rolesError;
  }

  const { data, error } = await admin
    .from("profesionales")
    .update({
      deleted_at: new Date().toISOString(),
      auth_password_temp: false,
    })
    .eq("id", options.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ProfesionalServerError(404, "Profesional no encontrado.");
  }

  await insertProfesionalEvents({
    profesionalId: options.id,
    events: buildProfesionalDeletionEvents({
      actor: options.actor,
      comentario: options.comentario,
      releasedEmpresas,
      disabledAuth: Boolean(before.auth_user_id),
    }),
  });

  return { deleted: true, releasedEmpresas };
}

export async function restoreProfesional(options: {
  id: number;
  actor: ProfesionalActor;
  comentario?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const before = await getProfessionalById({
    id: options.id,
    includeDeleted: true,
  });

  if (!before || !before.deleted_at) {
    throw new ProfesionalServerError(404, "Profesional eliminado no encontrado.");
  }

  await ensureUniqueActiveFields(
    admin,
    {
      correo_profesional: before.correo_profesional,
      usuario_login: null,
    },
    { excludeId: options.id }
  );

  const { data, error } = await admin
    .from("profesionales")
    .update({
      deleted_at: null,
      auth_user_id: null,
      usuario_login: null,
      auth_password_temp: false,
    })
    .eq("id", options.id)
    .not("deleted_at", "is", null)
    .select(PROFESIONAL_SELECT_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ProfesionalServerError(404, "Profesional eliminado no encontrado.");
  }

  const { error: rolesError } = await admin
    .from("profesional_roles")
    .delete()
    .eq("profesional_id", options.id);

  if (rolesError) {
    throw rolesError;
  }

  await insertProfesionalEvents({
    profesionalId: options.id,
    events: [
      {
        tipo: "restauracion",
        actor_user_id: options.actor.userId,
        actor_profesional_id: options.actor.profesionalId,
        actor_nombre: options.actor.nombre,
        payload: {
          comentario: readNonEmptyString(options.comentario),
          modo: "catalogo",
        },
      },
    ],
  });

  const [restored] = await hydrateRoles(admin, [data as unknown as ProfesionalDbRow]);
  return restored;
}

export async function listProfesionalEventos(options: {
  profesionalId: number;
  limit?: number;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profesional_eventos")
    .select(
      "id, profesional_id, tipo, actor_user_id, actor_profesional_id, actor_nombre, payload, created_at"
    )
    .eq("profesional_id", options.profesionalId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ProfesionalEventoRow[]).map((event) => ({
    ...event,
    resumen: summarizeProfesionalEvent(event),
  }));
}

export async function markTemporaryPasswordChanged(options: {
  authUserId: string;
  profesionalId: number;
}) {
  const admin = createSupabaseAdminClient();
  await updateAuthTempFlag({
    admin,
    authUserId: options.authUserId,
    value: false,
  });

  const { error } = await admin
    .from("profesionales")
    .update({ auth_password_temp: false })
    .eq("id", options.profesionalId);

  if (error) {
    throw error;
  }
}
