import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLongFormViewState,
  loadLongFormViewState,
  saveLongFormViewState,
} from "@/lib/longFormViewState";

function createSessionStorageMock() {
  const storage = new Map<string, string>();

  return {
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

describe("longFormViewState", () => {
  const slug = "seleccion";
  const routeKey = "session:e2e-long-form-view-state";
  const sessionStorageMock = createSessionStorageMock();

  Object.defineProperty(globalThis, "window", {
    value: {
      sessionStorage: sessionStorageMock,
    },
    configurable: true,
  });

  beforeEach(() => {
    sessionStorageMock.clear();
  });

  it("saves and restores the current section, collapsed state and scroll", () => {
    saveLongFormViewState({
      slug,
      routeKey,
      viewState: {
        activeSectionId: "recommendations",
        collapsedSections: {
          company: true,
          activity: true,
          oferentes: true,
          recommendations: false,
          attendees: true,
        },
        scrollY: 640,
      },
    });

    expect(
      loadLongFormViewState({
        slug,
        routeKey,
      })
    ).toEqual({
      activeSectionId: "recommendations",
      collapsedSections: {
        company: true,
        activity: true,
        oferentes: true,
        recommendations: false,
        attendees: true,
      },
      scrollY: 640,
    });
  });

  it("clears the stored view state", () => {
    saveLongFormViewState({
      slug,
      routeKey,
      viewState: {
        activeSectionId: "activity",
        collapsedSections: {
          company: true,
          activity: false,
          oferentes: true,
          recommendations: true,
          attendees: true,
        },
        scrollY: 220,
      },
    });

    clearLongFormViewState({ slug, routeKey });

    expect(
      loadLongFormViewState({
        slug,
        routeKey,
      })
    ).toBeNull();
  });
});
