import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const hoistedMocks = vi.hoisted(() => ({
  GoogleAuthMock: vi.fn(function (
    this: { options?: unknown },
    options: unknown
  ) {
    this.options = options;
  }),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: hoistedMocks.GoogleAuthMock,
    },
    drive: vi.fn(),
    sheets: vi.fn(),
  },
}));

import { getGoogleAuth } from "@/lib/google/auth";

const ORIGINAL_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const ORIGINAL_SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
const { GoogleAuthMock } = hoistedMocks;

function restoreEnv() {
  if (ORIGINAL_SERVICE_ACCOUNT === undefined) {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  } else {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = ORIGINAL_SERVICE_ACCOUNT;
  }

  if (ORIGINAL_SERVICE_ACCOUNT_FILE === undefined) {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  } else {
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE = ORIGINAL_SERVICE_ACCOUNT_FILE;
  }
}

beforeEach(() => {
  GoogleAuthMock.mockClear();
  restoreEnv();
});

afterAll(() => {
  restoreEnv();
});

describe("getGoogleAuth", () => {
  it("lanza un error claro cuando faltan ambas fuentes de credenciales", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

    expect(() => getGoogleAuth()).toThrow(
      "GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_FILE no esta configurado"
    );
  });

  it("lanza un error descriptivo cuando la credencial no es JSON valido", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

    expect(() => getGoogleAuth()).toThrow(
      "La credencial de Google no contiene un JSON valido."
    );
  });

  it("construye GoogleAuth con las credenciales parseadas desde GOOGLE_SERVICE_ACCOUNT_JSON", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      type: "service_account",
      client_email: "reca@example.com",
    });
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

    getGoogleAuth();

    expect(GoogleAuthMock).toHaveBeenCalledWith({
      credentials: {
        type: "service_account",
        client_email: "reca@example.com",
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });
  });

  it("construye GoogleAuth usando GOOGLE_SERVICE_ACCOUNT_FILE cuando no hay JSON inline", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "google-auth-test-"));
    const credentialsFile = path.join(tempDir, "service-account.json");
    fs.writeFileSync(
      credentialsFile,
      JSON.stringify({
        type: "service_account",
        client_email: "archivo@example.com",
      }),
      "utf8"
    );

    process.env.GOOGLE_SERVICE_ACCOUNT_FILE = credentialsFile;

    try {
      getGoogleAuth();

      expect(GoogleAuthMock).toHaveBeenCalledWith({
        credentials: {
          type: "service_account",
          client_email: "archivo@example.com",
        },
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive",
        ],
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("lanza un error claro cuando GOOGLE_SERVICE_ACCOUNT_FILE apunta a un archivo inexistente", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE = path.join(
      os.tmpdir(),
      "missing-google-auth.json"
    );

    expect(() => getGoogleAuth()).toThrow(
      "GOOGLE_SERVICE_ACCOUNT_FILE apunta a un archivo inexistente:"
    );
  });
});
