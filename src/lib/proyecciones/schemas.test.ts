import { describe, expect, it } from "vitest";
import {
  createProyeccionSchema,
  parseProyeccionesListParams,
  updateProyeccionSchema,
} from "@/lib/proyecciones/schemas";

describe("proyecciones schemas", () => {
  it("accepts a normal service projection without cantidad_empresas", () => {
    const parsed = createProyeccionSchema.parse({
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: "program_presentation",
      inicioAt: "2026-05-04T14:00:00.000Z",
      duracionMinutos: 90,
      modalidad: "presencial",
      notes: "  reunion con empresa  ",
    });

    expect(parsed).toMatchObject({
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: "program_presentation",
      duracionMinutos: 90,
      modalidad: "presencial",
      notes: "reunion con empresa",
      requiresInterpreter: false,
    });
    expect(parsed).not.toHaveProperty("cantidadEmpresas");
  });

  it("requires interpreter count and projected hours when interpreter is requested", () => {
    const parsed = createProyeccionSchema.safeParse({
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: "inclusive_selection",
      inicioAt: "2026-05-04T14:00:00.000Z",
      duracionMinutos: 90,
      modalidad: "virtual",
      requiresInterpreter: true,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.interpreterCount).toBeDefined();
    expect(
      parsed.error?.flatten().fieldErrors.interpreterProjectedHours
    ).toBeDefined();
  });

  it("allows suggested services to request interpreter without exception reason", () => {
    const parsed = createProyeccionSchema.parse({
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: "follow_up",
      inicioAt: "2026-05-04T14:00:00.000Z",
      duracionMinutos: 60,
      modalidad: "presencial",
      numeroSeguimiento: 2,
      requiresInterpreter: true,
      interpreterCount: 1,
      interpreterProjectedHours: 2,
    });

    expect(parsed.interpreterExceptionReason).toBeNull();
  });

  it("requires an exception reason when a non-suggested service asks for interpreter", () => {
    const parsed = createProyeccionSchema.safeParse({
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: "program_presentation",
      inicioAt: "2026-05-04T14:00:00.000Z",
      duracionMinutos: 60,
      modalidad: "presencial",
      requiresInterpreter: true,
      interpreterCount: 1,
      interpreterProjectedHours: 2,
    });

    expect(parsed.success).toBe(false);
    expect(
      parsed.error?.flatten().fieldErrors.interpreterExceptionReason
    ).toBeDefined();
  });

  it("rejects todas_las_modalidades for non-interpreter services", () => {
    const parsed = createProyeccionSchema.safeParse({
      empresaId: "11111111-1111-4111-8111-111111111111",
      serviceKey: "inclusive_hiring",
      inicioAt: "2026-05-04T14:00:00.000Z",
      duracionMinutos: 60,
      modalidad: "todas_las_modalidades",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.modalidad).toBeDefined();
  });

  it("parses list params with date range and includeInterpreter", () => {
    const params = parseProyeccionesListParams(
      new URLSearchParams(
        "from=2026-05-04T00:00:00.000Z&to=2026-05-11T00:00:00.000Z&includeInterpreter=false&estado=programada"
      )
    );

    expect(params).toEqual(
      expect.objectContaining({
        from: "2026-05-04T00:00:00.000Z",
        to: "2026-05-11T00:00:00.000Z",
        includeInterpreter: false,
        estado: "programada",
      })
    );
  });

  it("accepts partial update and keeps interpreter validation", () => {
    const parsed = updateProyeccionSchema.safeParse({
      requiresInterpreter: true,
      interpreterCount: 1,
      interpreterProjectedHours: 2,
      serviceKey: "program_reactivation",
    });

    expect(parsed.success).toBe(false);
    expect(
      parsed.error?.flatten().fieldErrors.interpreterExceptionReason
    ).toBeDefined();
  });
});
