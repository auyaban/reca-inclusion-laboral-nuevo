"use client";

import { useCallback, useMemo, useRef } from "react";
import type { FieldErrors } from "react-hook-form";
import type { LongFormSectionNavItem } from "@/components/forms/shared/LongFormSectionNav";
import type { LongFormSectionStatus } from "@/components/forms/shared/LongFormSectionCard";
import { useLongFormSections } from "@/hooks/useLongFormSections";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import {
  getInterpreteLscCompatStepForSection,
  INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS,
  INTERPRETE_LSC_SECTION_LABELS,
  isInterpreteLscAttendeesSectionComplete,
  isInterpreteLscCompanySectionComplete,
  isInterpreteLscInterpretersSectionComplete,
  isInterpreteLscParticipantsSectionComplete,
  type InterpreteLscSectionId,
} from "@/lib/interpreteLscSections";
import { getInterpreteLscValidationTarget } from "@/lib/interpreteLscValidationNavigation";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";

export function useInterpreteLscNavigationRuntime(options: {
  hasEmpresa: boolean;
  currentNormalizedValues: InterpreteLscValues;
  errors: FieldErrors<InterpreteLscValues>;
}) {
  const { hasEmpresa, currentNormalizedValues, errors } = options;
  const companyRef = useRef<HTMLElement | null>(null);
  const participantsRef = useRef<HTMLElement | null>(null);
  const interpretersRef = useRef<HTMLElement | null>(null);
  const attendeesRef = useRef<HTMLElement | null>(null);

  const sectionRefs = useMemo(
    () => ({
      company: companyRef,
      participants: participantsRef,
      interpreters: interpretersRef,
      attendees: attendeesRef,
    }),
    []
  );

  const {
    activeSectionId,
    setActiveSectionId,
    collapsedSections,
    setCollapsedSections,
    scrollToSection,
    toggleSection,
    selectSection,
  } = useLongFormSections<InterpreteLscSectionId>({
    initialActiveSectionId: "company",
    initialCollapsedSections: INITIAL_INTERPRETE_LSC_COLLAPSED_SECTIONS,
    sectionRefs,
  });

  const sectionStatuses = useMemo(() => {
    const errorSectionId =
      getInterpreteLscValidationTarget(errors)?.sectionId ?? null;

    function getStatus(
      id: InterpreteLscSectionId,
      state?: { completed?: boolean; disabled?: boolean }
    ): LongFormSectionStatus {
      if (activeSectionId === id) return "active";
      if (state?.disabled) return "disabled";
      if (errorSectionId === id) return "error";
      if (state?.completed) return "completed";
      return "idle";
    }

    return {
      company: getStatus("company", {
        completed:
          hasEmpresa &&
          isInterpreteLscCompanySectionComplete(currentNormalizedValues),
      }),
      participants: getStatus("participants", {
        completed:
          hasEmpresa &&
          isInterpreteLscParticipantsSectionComplete(currentNormalizedValues),
        disabled: !hasEmpresa,
      }),
      interpreters: getStatus("interpreters", {
        completed:
          hasEmpresa &&
          isInterpreteLscInterpretersSectionComplete(currentNormalizedValues),
        disabled: !hasEmpresa,
      }),
      attendees: getStatus("attendees", {
        completed:
          hasEmpresa &&
          isInterpreteLscAttendeesSectionComplete(currentNormalizedValues),
        disabled: !hasEmpresa,
      }),
    };
  }, [activeSectionId, currentNormalizedValues, errors, hasEmpresa]);

  const navItems = useMemo<LongFormSectionNavItem[]>(
    () => [
      {
        id: "company",
        label: INTERPRETE_LSC_SECTION_LABELS.company,
        shortLabel: "Empresa",
        status: sectionStatuses.company,
      },
      {
        id: "participants",
        label: INTERPRETE_LSC_SECTION_LABELS.participants,
        shortLabel: "Oferentes",
        status: sectionStatuses.participants,
      },
      {
        id: "interpreters",
        label: INTERPRETE_LSC_SECTION_LABELS.interpreters,
        shortLabel: "Interpretes",
        status: sectionStatuses.interpreters,
      },
      {
        id: "attendees",
        label: INTERPRETE_LSC_SECTION_LABELS.attendees,
        shortLabel: "Asistentes",
        status: sectionStatuses.attendees,
      },
    ],
    [sectionStatuses]
  );

  const navigateToValidationTarget = useCallback(
    (
      nextErrors: FieldErrors<InterpreteLscValues>,
      onErrorMessage: (message: string) => void
    ) => {
      const validationTarget = getInterpreteLscValidationTarget(nextErrors);
      if (!validationTarget) {
        onErrorMessage("Revisa los campos resaltados antes de finalizar.");
        return null;
      }

      setCollapsedSections((current) => ({
        ...current,
        [validationTarget.sectionId]: false,
      }));
      onErrorMessage("Revisa los campos resaltados antes de finalizar.");
      scrollToSection(validationTarget.sectionId);
      focusFieldByNameAfterPaint(validationTarget.fieldName);
      return validationTarget;
    },
    [scrollToSection, setCollapsedSections]
  );

  const syncStepForSection = useCallback(
    (step: number, setStep: (nextStep: number) => void) => {
      if (activeSectionId === "company") return;
      const nextStep = getInterpreteLscCompatStepForSection(activeSectionId);
      if (nextStep !== step) {
        setStep(nextStep);
      }
    },
    [activeSectionId]
  );

  return {
    companyRef,
    participantsRef,
    interpretersRef,
    attendeesRef,
    activeSectionId,
    setActiveSectionId,
    collapsedSections,
    setCollapsedSections,
    scrollToSection,
    toggleSection,
    selectSection,
    sectionStatuses,
    navItems,
    navigateToValidationTarget,
    syncStepForSection,
  };
}
