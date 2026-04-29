import { getAppRoleLabel, type AppRole } from "@/lib/auth/appRoles";

export type ProfesionalEventType =
  | "creacion"
  | "edicion"
  | "habilitar_acceso"
  | "reset_password"
  | "rol_asignado"
  | "rol_retirado"
  | "eliminacion"
  | "restauracion";

export type ProfesionalMutationActor = {
  userId: string;
  profesionalId: number;
  nombre: string;
};

export type ProfesionalEventDraft = {
  tipo: ProfesionalEventType;
  actor_user_id: string;
  actor_profesional_id: number;
  actor_nombre: string;
  payload: Record<string, unknown>;
};

function createEvent(
  actor: ProfesionalMutationActor,
  tipo: ProfesionalEventType,
  payload: Record<string, unknown> = {}
): ProfesionalEventDraft {
  return {
    tipo,
    actor_user_id: actor.userId,
    actor_profesional_id: actor.profesionalId,
    actor_nombre: actor.nombre,
    payload,
  };
}

export function buildProfesionalRoleEvents(options: {
  actor: ProfesionalMutationActor;
  beforeRoles: readonly AppRole[];
  afterRoles: readonly AppRole[];
}) {
  const events: ProfesionalEventDraft[] = [];

  for (const role of options.beforeRoles) {
    if (!options.afterRoles.includes(role)) {
      events.push(
        createEvent(options.actor, "rol_retirado", {
          rol: getAppRoleLabel(role),
        })
      );
    }
  }

  for (const role of options.afterRoles) {
    if (!options.beforeRoles.includes(role)) {
      events.push(
        createEvent(options.actor, "rol_asignado", {
          rol: getAppRoleLabel(role),
        })
      );
    }
  }

  return events;
}

export function buildProfesionalResetPasswordEvent(options: {
  actor: ProfesionalMutationActor;
  authUserId: string;
  temporaryPassword: string;
}) {
  void options.temporaryPassword;
  return createEvent(options.actor, "reset_password", {
    auth_user_id: options.authUserId,
    contrasena_temporal_generada: true,
  });
}

export function buildProfesionalDeletionEvents(options: {
  actor: ProfesionalMutationActor;
  comentario: string;
  releasedEmpresas: number;
  disabledAuth: boolean;
}) {
  return [
    createEvent(options.actor, "eliminacion", {
      comentario: options.comentario,
      empresas_liberadas: options.releasedEmpresas,
      acceso_auth_desactivado: options.disabledAuth,
    }),
  ];
}

export function summarizeProfesionalEvent(event: {
  tipo: string | null;
  payload: Record<string, unknown> | null;
}) {
  const payload = event.payload ?? {};

  switch (event.tipo) {
    case "creacion":
      return "Profesional creado.";
    case "edicion":
      return "Datos del profesional actualizados.";
    case "habilitar_acceso":
      return "Acceso Auth habilitado.";
    case "reset_password":
      return "Contraseña temporal generada.";
    case "rol_asignado":
      return `Rol asignado: ${String(payload.rol ?? "rol")}.`;
    case "rol_retirado":
      return `Rol retirado: ${String(payload.rol ?? "rol")}.`;
    case "eliminacion":
      return "Profesional eliminado.";
    case "restauracion":
      return "Profesional restaurado como perfil sin acceso.";
    default:
      return "Evento registrado.";
  }
}
