import { describe, expect, it } from "vitest";
import {
  assertCanChangeAdminInclusionRole,
  canManageAdminInclusionRole,
} from "@/lib/profesionales/permissions";

describe("profesional role permissions", () => {
  it("allows only aaron_vercel to manage Admin Inclusión", () => {
    expect(canManageAdminInclusionRole("aaron_vercel")).toBe(true);
    expect(canManageAdminInclusionRole("Aaron_Vercel")).toBe(true);
    expect(canManageAdminInclusionRole("sara")).toBe(false);
    expect(canManageAdminInclusionRole(null)).toBe(false);
  });

  it("blocks non-aaron users from assigning or removing Admin Inclusión", () => {
    expect(() =>
      assertCanChangeAdminInclusionRole({
        actorUsuarioLogin: "sara",
        beforeRoles: ["inclusion_empresas_admin"],
        afterRoles: ["inclusion_empresas_profesional"],
      })
    ).toThrow("Solo aaron_vercel puede asignar o retirar Admin Inclusión.");
  });
});
