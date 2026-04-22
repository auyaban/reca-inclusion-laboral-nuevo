import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSeguimientosOverrideGrant,
  inspectSeguimientosOverrideGrant,
  inspectSeguimientosOverrideGrantDetailed,
} from "@/lib/seguimientosOverrideGrant";

const CASE_ID = "sheet-1";
const USER_ID = "user-1";
const STAGE_ID = "base_process";

describe("seguimientosOverrideGrant", () => {
  beforeEach(() => {
    vi.stubEnv("SEGUIMIENTOS_OVERRIDE_SECRET", "secret-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("verifies grants whose ISO expiry includes milliseconds", () => {
    const now = new Date("2026-04-22T17:12:50.140Z");
    const grant = createSeguimientosOverrideGrant({
      caseId: CASE_ID,
      stageId: STAGE_ID,
      userId: USER_ID,
      now,
    });

    expect(grant.expiresAt).toContain(".140Z");
    expect(
      inspectSeguimientosOverrideGrant({
        caseId: CASE_ID,
        stageId: STAGE_ID,
        userId: USER_ID,
        token: grant.token,
        now: new Date("2026-04-22T17:20:00.000Z"),
      })
    ).toBe("valid");
  });

  it("reports an expired grant with milliseconds in the expiry", () => {
    const now = new Date("2026-04-22T17:12:50.140Z");
    const grant = createSeguimientosOverrideGrant({
      caseId: CASE_ID,
      stageId: STAGE_ID,
      userId: USER_ID,
      now,
    });

    expect(
      inspectSeguimientosOverrideGrantDetailed({
        caseId: CASE_ID,
        stageId: STAGE_ID,
        userId: USER_ID,
        token: grant.token,
        now: new Date("2026-04-22T17:40:00.000Z"),
      })
    ).toEqual({
      result: "expired",
      expiresAt: grant.expiresAt,
    });
  });

  it("marks tokens without a valid delimiter as parse failures", () => {
    expect(
      inspectSeguimientosOverrideGrantDetailed({
        caseId: CASE_ID,
        stageId: STAGE_ID,
        userId: USER_ID,
        token: "2026-04-22T17:12:50Z",
        now: new Date("2026-04-22T17:20:00.000Z"),
      })
    ).toEqual({
      result: "invalid",
      reason: "parse_failed",
    });
  });

  it("marks truncated signatures as signature_invalid", () => {
    const now = new Date("2026-04-22T17:12:50.140Z");
    const grant = createSeguimientosOverrideGrant({
      caseId: CASE_ID,
      stageId: STAGE_ID,
      userId: USER_ID,
      now,
    });

    expect(
      inspectSeguimientosOverrideGrantDetailed({
        caseId: CASE_ID,
        stageId: STAGE_ID,
        userId: USER_ID,
        token: grant.token.slice(0, -8),
        now: new Date("2026-04-22T17:20:00.000Z"),
      })
    ).toEqual({
      result: "invalid",
      reason: "signature_invalid",
    });
  });
});
