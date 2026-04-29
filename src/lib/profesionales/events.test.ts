import { describe, expect, it } from "vitest";
import {
  buildProfesionalDeletionEvents,
  buildProfesionalResetPasswordEvent,
  buildProfesionalRoleEvents,
  summarizeProfesionalEvent,
} from "@/lib/profesionales/events";

const actor = {
  userId: "auth-admin-1",
  profesionalId: 7,
  nombre: "Aaron Vercel",
};

describe("profesional events", () => {
  it("stores user-facing labels for assigned and removed roles", () => {
    const events = buildProfesionalRoleEvents({
      actor,
      beforeRoles: ["inclusion_empresas_admin"],
      afterRoles: ["inclusion_empresas_profesional"],
    });

    expect(events).toEqual([
      expect.objectContaining({
        tipo: "rol_retirado",
        payload: { rol: "Admin Inclusión" },
      }),
      expect.objectContaining({
        tipo: "rol_asignado",
        payload: { rol: "Profesional Inclusión" },
      }),
    ]);
  });

  it("never stores the temporary password in reset events", () => {
    const event = buildProfesionalResetPasswordEvent({
      actor,
      authUserId: "auth-prof-1",
      temporaryPassword: "NoDebePersistir123!",
    });

    expect(JSON.stringify(event)).not.toContain("NoDebePersistir123!");
    expect(event.payload).toMatchObject({
      auth_user_id: "auth-prof-1",
      contrasena_temporal_generada: true,
    });
  });

  it("requires deletion events to carry the admin comment", () => {
    const [event] = buildProfesionalDeletionEvents({
      actor,
      comentario: "Retiro del equipo",
      releasedEmpresas: 2,
      disabledAuth: true,
    });

    expect(event).toMatchObject({
      tipo: "eliminacion",
      payload: {
        comentario: "Retiro del equipo",
        empresas_liberadas: 2,
        acceso_auth_desactivado: true,
      },
    });
  });

  it("summarizes role events with natural Spanish labels", () => {
    expect(
      summarizeProfesionalEvent({
        tipo: "rol_asignado",
        payload: { rol: "Profesional Inclusión" },
      })
    ).toBe("Rol asignado: Profesional Inclusión.");
  });
});
