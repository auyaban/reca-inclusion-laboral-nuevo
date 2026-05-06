// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HubSentryUserContext from "@/components/layout/HubSentryUserContext";

const mocks = vi.hoisted(() => ({
  setAuthenticatedSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/observability/sentryUser", () => ({
  setAuthenticatedSentryUser: mocks.setAuthenticatedSentryUser,
  clearSentryUser: mocks.clearSentryUser,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}));

describe("HubSentryUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("sets Sentry user context from the authenticated hub user", () => {
    render(
      <HubSentryUserContext
        user={{
          authUserId: "auth-user-1",
          email: "sara@recacolombia.org",
          usuarioLogin: "sarazambrano",
        }}
      />
    );

    expect(mocks.setAuthenticatedSentryUser).toHaveBeenCalledWith({
      authUserId: "auth-user-1",
      email: "sara@recacolombia.org",
      usuarioLogin: "sarazambrano",
    });
  });

  it("clears Sentry user context while the hub user identity is incomplete", () => {
    render(
      <HubSentryUserContext
        user={{
          authUserId: null,
          email: "sara@recacolombia.org",
          usuarioLogin: "sarazambrano",
        }}
      />
    );

    expect(mocks.clearSentryUser).toHaveBeenCalled();
    expect(mocks.setAuthenticatedSentryUser).not.toHaveBeenCalled();
  });

  it("clears Sentry user context when Supabase reports no active session", () => {
    let listener: ((event: string, session: unknown) => void) | null = null;
    mocks.onAuthStateChange.mockImplementation((callback) => {
      listener = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    render(
      <HubSentryUserContext
        user={{
          authUserId: "auth-user-1",
          email: "sara@recacolombia.org",
          usuarioLogin: "sarazambrano",
        }}
      />
    );

    listener?.("SIGNED_OUT", null);

    expect(mocks.clearSentryUser).toHaveBeenCalled();
  });

  it("clears Sentry user context when Supabase reports a different auth user", () => {
    let listener: ((event: string, session: unknown) => void) | null = null;
    mocks.onAuthStateChange.mockImplementation((callback) => {
      listener = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    render(
      <HubSentryUserContext
        user={{
          authUserId: "auth-user-1",
          email: "sara@recacolombia.org",
          usuarioLogin: "sarazambrano",
        }}
      />
    );

    listener?.("SIGNED_IN", {
      user: {
        id: "auth-user-2",
      },
    });

    expect(mocks.clearSentryUser).toHaveBeenCalled();
  });

  it("unsubscribes and clears Sentry user context on unmount", () => {
    const unsubscribe = vi.fn();
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe,
        },
      },
    });

    const { unmount } = render(
      <HubSentryUserContext
        user={{
          authUserId: "auth-user-1",
          email: "sara@recacolombia.org",
          usuarioLogin: "sarazambrano",
        }}
      />
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
    expect(mocks.clearSentryUser).toHaveBeenCalled();
  });
});
