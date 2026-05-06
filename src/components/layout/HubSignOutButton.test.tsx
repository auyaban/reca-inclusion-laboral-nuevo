// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HubSignOutButton from "@/components/layout/HubSignOutButton";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signOut: vi.fn(),
  clearSentryUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mocks.signOut,
    },
  }),
}));

vi.mock("@/lib/observability/sentryUser", () => ({
  clearSentryUser: mocks.clearSentryUser,
}));

describe("HubSignOutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("clears Sentry user context before signing out", async () => {
    render(<HubSignOutButton />);

    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesi/i }));

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalled();
    });

    expect(mocks.clearSentryUser).toHaveBeenCalledBefore(mocks.signOut);
    expect(mocks.push).toHaveBeenCalledWith("/");
  });
});
