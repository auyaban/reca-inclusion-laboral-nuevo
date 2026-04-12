import { describe, expect, it, vi } from "vitest";
import type { DraftLock } from "@/lib/draftLocks";
import {
  buildDraftLockConflict,
  confirmDraftLease,
  planDraftLockClaim,
  resolveDraftLockAuthority,
} from "./draftLockRuntime";

function createLock(overrides: Partial<DraftLock> = {}): DraftLock {
  return {
    draftId: "draft-1",
    ownerTabId: "tab-a",
    leaseId: "lease-a",
    acquiredAt: "2026-04-12T10:00:00.000Z",
    heartbeatAt: "2026-04-12T10:00:00.000Z",
    formSlug: "presentacion",
    ...overrides,
  };
}

describe("draftLockRuntime", () => {
  it("acquires a lock when none exists", () => {
    const plan = planDraftLockClaim({
      draftId: "draft-1",
      currentLock: null,
      currentLeaseId: null,
      tabId: "tab-a",
      slug: "presentacion",
      createLeaseId: () => "lease-new",
      now: "2026-04-12T11:00:00.000Z",
    });

    expect(plan).toMatchObject({
      shouldWrite: true,
      expectedLeaseId: "lease-new",
      nextLock: {
        ownerTabId: "tab-a",
        leaseId: "lease-new",
        acquiredAt: "2026-04-12T11:00:00.000Z",
        heartbeatAt: "2026-04-12T11:00:00.000Z",
      },
    });

    expect(
      resolveDraftLockAuthority({
        draftId: "draft-1",
        resolvedLock: plan.nextLock,
        tabId: "tab-a",
        currentLeaseId: null,
        expectedLeaseId: plan.expectedLeaseId,
      })
    ).toMatchObject({
      hasAuthority: true,
      leaseId: "lease-new",
    });
  });

  it("reclaims an expired lock", () => {
    const plan = planDraftLockClaim({
      draftId: "draft-1",
      currentLock: createLock({
        ownerTabId: "tab-b",
        leaseId: "lease-b",
        heartbeatAt: "1970-01-01T00:00:00.000Z",
      }),
      currentLeaseId: null,
      tabId: "tab-a",
      slug: "presentacion",
      createLeaseId: () => "lease-reclaimed",
      now: "2026-04-12T11:00:00.000Z",
    });

    expect(plan.shouldWrite).toBe(true);
    expect(plan.nextLock?.leaseId).toBe("lease-reclaimed");
    expect(plan.nextLock?.ownerTabId).toBe("tab-a");
  });

  it("forces a new lease on takeover", () => {
    const plan = planDraftLockClaim({
      draftId: "draft-1",
      currentLock: createLock({
        ownerTabId: "tab-a",
        leaseId: "lease-old",
        acquiredAt: "2026-04-12T10:00:00.000Z",
      }),
      currentLeaseId: "lease-old",
      tabId: "tab-a",
      slug: "presentacion",
      forceTakeOver: true,
      createLeaseId: () => "lease-takeover",
      now: "2026-04-12T11:00:00.000Z",
    });

    expect(plan.nextLock).toMatchObject({
      leaseId: "lease-takeover",
      acquiredAt: "2026-04-12T11:00:00.000Z",
      heartbeatAt: "2026-04-12T11:00:00.000Z",
    });
  });

  it("resolves an active conflict as read only", () => {
    const currentLock = createLock({
      ownerTabId: "tab-b",
      leaseId: "lease-b",
      heartbeatAt: new Date().toISOString(),
    });
    const plan = planDraftLockClaim({
      draftId: "draft-1",
      currentLock,
      currentLeaseId: null,
      tabId: "tab-a",
      slug: "presentacion",
      createLeaseId: vi.fn(() => "lease-unused"),
    });

    const resolution = resolveDraftLockAuthority({
      draftId: "draft-1",
      resolvedLock: currentLock,
      tabId: "tab-a",
      currentLeaseId: null,
      expectedLeaseId: plan.expectedLeaseId,
      now: "2026-04-12T11:00:00.000Z",
    });

    expect(plan.shouldWrite).toBe(false);
    expect(resolution).toMatchObject({
      hasAuthority: false,
      leaseId: null,
      conflict: {
        draftId: "draft-1",
        ownerTabId: "tab-b",
        canTakeOver: true,
      },
    });
  });

  it("detects when the lease changes between write and readback", () => {
    const plan = planDraftLockClaim({
      draftId: "draft-1",
      currentLock: null,
      currentLeaseId: null,
      tabId: "tab-a",
      slug: "presentacion",
      createLeaseId: () => "lease-a",
    });

    const resolution = resolveDraftLockAuthority({
      draftId: "draft-1",
      resolvedLock: createLock({
        ownerTabId: "tab-b",
        leaseId: "lease-b",
      }),
      tabId: "tab-a",
      currentLeaseId: null,
      expectedLeaseId: plan.expectedLeaseId,
      now: "2026-04-12T11:00:00.000Z",
    });

    expect(resolution.hasAuthority).toBe(false);
    expect(resolution.conflict).toEqual(
      buildDraftLockConflict({
        draftId: "draft-1",
        lock: createLock({
          ownerTabId: "tab-b",
          leaseId: "lease-b",
        }),
        now: "2026-04-12T11:00:00.000Z",
      })
    );
  });

  it("fails lease confirmation when owner or lease changes", () => {
    expect(
      confirmDraftLease({
        currentLock: createLock({
          ownerTabId: "tab-b",
          leaseId: "lease-a",
        }),
        tabId: "tab-a",
        leaseId: "lease-a",
      })
    ).toBeNull();

    expect(
      confirmDraftLease({
        currentLock: createLock({
          ownerTabId: "tab-a",
          leaseId: "lease-b",
        }),
        tabId: "tab-a",
        leaseId: "lease-a",
      })
    ).toBeNull();
  });
});
