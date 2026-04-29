import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "@/lib/profesionales/passwords";

describe("generateTemporaryPassword", () => {
  it("generates strong copyable temporary passwords without spaces", () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(18);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!#$%*-?]/);
    expect(password).not.toMatch(/\s/);
  });
});
