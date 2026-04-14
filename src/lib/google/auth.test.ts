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
const { GoogleAuthMock } = hoistedMocks;

beforeEach(() => {
  GoogleAuthMock.mockClear();

  if (ORIGINAL_SERVICE_ACCOUNT === undefined) {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    return;
  }

  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = ORIGINAL_SERVICE_ACCOUNT;
});

afterAll(() => {
  if (ORIGINAL_SERVICE_ACCOUNT === undefined) {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    return;
  }

  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = ORIGINAL_SERVICE_ACCOUNT;
});

describe("getGoogleAuth", () => {
  it("lanza un error claro cuando falta GOOGLE_SERVICE_ACCOUNT_JSON", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    expect(() => getGoogleAuth()).toThrow(
      "GOOGLE_SERVICE_ACCOUNT_JSON no está configurado"
    );
  });

  it("lanza un error descriptivo cuando GOOGLE_SERVICE_ACCOUNT_JSON no es JSON valido", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"';

    expect(() => getGoogleAuth()).toThrow(
      "GOOGLE_SERVICE_ACCOUNT_JSON no contiene un JSON valido."
    );
  });

  it("construye GoogleAuth con las credenciales parseadas", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      type: "service_account",
      client_email: "reca@example.com",
    });

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
});
