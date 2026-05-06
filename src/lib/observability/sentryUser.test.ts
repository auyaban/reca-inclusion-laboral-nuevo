import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
  setUser: vi.fn() as unknown,
}));

vi.mock("@sentry/nextjs", () => sentryMock);

import {
  clearSentryUser,
  setAuthenticatedSentryUser,
} from "@/lib/observability/sentryUser";

describe("sentry user context", () => {
  beforeEach(() => {
    sentryMock.setUser = vi.fn();
  });

  it("sets the authenticated professional identity in Sentry", () => {
    setAuthenticatedSentryUser({
      authUserId: "auth-user-1",
      email: "sara@recacolombia.org",
      usuarioLogin: "sarazambrano",
    });

    expect(sentryMock.setUser).toHaveBeenCalledWith({
      id: "auth-user-1",
      email: "sara@recacolombia.org",
      username: "sarazambrano",
    });
  });

  it("clears Sentry user context", () => {
    clearSentryUser();

    expect(sentryMock.setUser).toHaveBeenCalledWith(null);
  });

  it("clears Sentry user context when auth_user_id is missing", () => {
    setAuthenticatedSentryUser({
      authUserId: null,
      email: "sara@recacolombia.org",
      usuarioLogin: "sarazambrano",
    });

    expect(sentryMock.setUser).toHaveBeenCalledWith(null);
  });

  it("does not throw when Sentry setUser is unavailable", () => {
    sentryMock.setUser = undefined;

    expect(() => {
      setAuthenticatedSentryUser({
        authUserId: "auth-user-1",
        email: "sara@recacolombia.org",
        usuarioLogin: "sarazambrano",
      });
    }).not.toThrow();
    expect(() => clearSentryUser()).not.toThrow();
  });

  it("does not throw when Sentry setUser fails internally", () => {
    sentryMock.setUser = vi.fn(() => {
      throw new Error("sentry unavailable");
    });

    expect(() => {
      setAuthenticatedSentryUser({
        authUserId: "auth-user-1",
        email: "sara@recacolombia.org",
        usuarioLogin: "sarazambrano",
      });
    }).not.toThrow();
    expect(() => clearSentryUser()).not.toThrow();
  });
});
