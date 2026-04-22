import { createHmac, timingSafeEqual } from "node:crypto";
import type { SeguimientosEditableStageId } from "@/lib/seguimientos";

const SEGUIMIENTOS_OVERRIDE_GRANT_TTL_MS = 20 * 60 * 1000;

export type SeguimientosOverrideGrant = {
  stageId: SeguimientosEditableStageId;
  token: string;
};

export type SeguimientosOverrideGrantValidationResult =
  | "valid"
  | "expired"
  | "invalid";

export type SeguimientosOverrideGrantInvalidReason =
  | "parse_failed"
  | "signature_invalid";

export type SeguimientosOverrideGrantInspection =
  | {
      result: "valid";
      expiresAt: string;
    }
  | {
      result: "expired";
      expiresAt: string;
    }
  | {
      result: "invalid";
      reason: SeguimientosOverrideGrantInvalidReason;
    };

function getSeguimientosOverrideSecret() {
  const secret = process.env.SEGUIMIENTOS_OVERRIDE_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Falta la variable de entorno SEGUIMIENTOS_OVERRIDE_SECRET."
    );
  }

  return secret;
}

function buildGrantSignaturePayload(options: {
  caseId: string;
  stageId: SeguimientosEditableStageId;
  userId: string;
  expiresAt: string;
}) {
  return [
    options.caseId.trim(),
    options.stageId,
    options.userId.trim(),
    options.expiresAt.trim(),
  ].join(".");
}

function signSeguimientosOverrideGrant(options: {
  caseId: string;
  stageId: SeguimientosEditableStageId;
  userId: string;
  expiresAt: string;
}) {
  return createHmac("sha256", getSeguimientosOverrideSecret())
    .update(buildGrantSignaturePayload(options))
    .digest("hex");
}

function parseSeguimientosOverrideToken(token: string) {
  const delimiterIndex = token.lastIndexOf(".");
  if (delimiterIndex <= 0 || delimiterIndex >= token.length - 1) {
    return null;
  }

  const expiresAt = token.slice(0, delimiterIndex);
  const signature = token.slice(delimiterIndex + 1);

  return {
    expiresAt,
    signature,
  };
}

export function createSeguimientosOverrideGrant(options: {
  caseId: string;
  stageId: SeguimientosEditableStageId;
  userId: string;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + SEGUIMIENTOS_OVERRIDE_GRANT_TTL_MS
  ).toISOString();
  const signature = signSeguimientosOverrideGrant({
    caseId: options.caseId,
    stageId: options.stageId,
    userId: options.userId,
    expiresAt,
  });

  return {
    stageId: options.stageId,
    token: `${expiresAt}.${signature}`,
    expiresAt,
  };
}

export function verifySeguimientosOverrideGrant(options: {
  caseId: string;
  stageId: SeguimientosEditableStageId;
  userId: string;
  token: string;
  now?: Date;
}) {
  return inspectSeguimientosOverrideGrant(options) === "valid";
}

export function inspectSeguimientosOverrideGrantDetailed(options: {
  caseId: string;
  stageId: SeguimientosEditableStageId;
  userId: string;
  token: string;
  now?: Date;
}): SeguimientosOverrideGrantInspection {
  const parsed = parseSeguimientosOverrideToken(options.token);
  if (!parsed) {
    return {
      result: "invalid",
      reason: "parse_failed",
    };
  }

  const expiresAt = Date.parse(parsed.expiresAt);
  if (!Number.isFinite(expiresAt)) {
    return {
      result: "invalid",
      reason: "parse_failed",
    };
  }

  const now = options.now ?? new Date();
  if (expiresAt <= now.getTime()) {
    return {
      result: "expired",
      expiresAt: parsed.expiresAt,
    };
  }

  const expectedSignature = signSeguimientosOverrideGrant({
    caseId: options.caseId,
    stageId: options.stageId,
    userId: options.userId,
    expiresAt: parsed.expiresAt,
  });

  const actualBuffer = Buffer.from(parsed.signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (actualBuffer.length !== expectedBuffer.length) {
    return {
      result: "invalid",
      reason: "signature_invalid",
    };
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return {
      result: "invalid",
      reason: "signature_invalid",
    };
  }

  return {
    result: "valid",
    expiresAt: parsed.expiresAt,
  };
}

export function inspectSeguimientosOverrideGrant(options: {
  caseId: string;
  stageId: SeguimientosEditableStageId;
  userId: string;
  token: string;
  now?: Date;
}): SeguimientosOverrideGrantValidationResult {
  return inspectSeguimientosOverrideGrantDetailed(options).result;
}
