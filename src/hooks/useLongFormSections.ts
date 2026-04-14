"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type LongFormSectionRect<TSectionId extends string> = {
  sectionId: TSectionId;
  top: number;
  bottom: number;
};

type UseLongFormSectionsOptions<TSectionId extends string> = {
  initialActiveSectionId: TSectionId;
  initialCollapsedSections: Record<TSectionId, boolean>;
  sectionRefs: Record<TSectionId, RefObject<HTMLElement | null>>;
  scrollAnchorTop?: number;
  scrollBottomThreshold?: number;
};

export function resolveActiveLongFormSectionId<TSectionId extends string>({
  currentSectionId,
  sectionRects,
  scrollAnchorTop,
  scrollBottomThreshold,
}: {
  currentSectionId: TSectionId;
  sectionRects: readonly LongFormSectionRect<TSectionId>[];
  scrollAnchorTop: number;
  scrollBottomThreshold: number;
}) {
  let nextSectionId = currentSectionId;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const sectionRect of sectionRects) {
    if (sectionRect.bottom <= scrollBottomThreshold) {
      continue;
    }

    const distance = Math.abs(sectionRect.top - scrollAnchorTop);
    if (distance < closestDistance) {
      closestDistance = distance;
      nextSectionId = sectionRect.sectionId;
    }
  }

  return nextSectionId;
}

export function useLongFormSections<TSectionId extends string>({
  initialActiveSectionId,
  initialCollapsedSections,
  sectionRefs,
  scrollAnchorTop = 148,
  scrollBottomThreshold = 120,
}: UseLongFormSectionsOptions<TSectionId>) {
  const [activeSectionId, setActiveSectionId] = useState(initialActiveSectionId);
  const [collapsedSections, setCollapsedSections] = useState(
    initialCollapsedSections
  );
  const activeSectionIdRef = useRef(initialActiveSectionId);

  useEffect(() => {
    activeSectionIdRef.current = activeSectionId;
  }, [activeSectionId]);

  const scrollToSection = useCallback(
    (
      sectionId: TSectionId,
      options?: {
        behavior?: ScrollBehavior;
      }
    ) => {
      const element = sectionRefs[sectionId].current;
      if (!element) {
        return false;
      }

      element.scrollIntoView({
        behavior: options?.behavior ?? "smooth",
        block: "start",
      });
      setActiveSectionId(sectionId);
      return true;
    },
    [sectionRefs]
  );

  const toggleSection = useCallback((sectionId: TSectionId) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const revealSection = useCallback((sectionId: TSectionId) => {
    setCollapsedSections((current) =>
      current[sectionId]
        ? {
            ...current,
            [sectionId]: false,
          }
        : current
    );
  }, []);

  const selectSection = useCallback(
    (sectionId: TSectionId) => {
      revealSection(sectionId);
      scrollToSection(sectionId);
    },
    [revealSection, scrollToSection]
  );

  useEffect(() => {
    const sectionEntries = Object.entries(sectionRefs) as Array<
      [TSectionId, RefObject<HTMLElement | null>]
    >;

    let frame = 0;

    function updateActiveSectionFromScroll() {
      frame = 0;

      const sectionRects = sectionEntries.flatMap(([sectionId, sectionRef]) => {
        const element = sectionRef.current;
        if (!element) {
          return [];
        }

        const rect = element.getBoundingClientRect();
        return [{ sectionId, top: rect.top, bottom: rect.bottom }];
      });
      const nextSectionId = resolveActiveLongFormSectionId({
        currentSectionId: activeSectionIdRef.current,
        sectionRects,
        scrollAnchorTop,
        scrollBottomThreshold,
      });

      setActiveSectionId((current) => {
        if (current === nextSectionId) {
          return current;
        }

        activeSectionIdRef.current = nextSectionId;
        return nextSectionId;
      });
    }

    function handleScrollOrResize() {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateActiveSectionFromScroll);
    }

    handleScrollOrResize();
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [scrollAnchorTop, scrollBottomThreshold, sectionRefs]);

  return {
    activeSectionId,
    setActiveSectionId,
    collapsedSections,
    setCollapsedSections,
    scrollToSection,
    toggleSection,
    revealSection,
    selectSection,
  };
}
