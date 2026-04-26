"use client";

import type {
  FocusEventHandler,
  FormHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  RefObject,
} from "react";
import { ArrowLeft, CheckCircle2, FlaskConical, Loader2 } from "lucide-react";
import { FormCompletionActions, type FormCompletionLinks } from "./FormCompletionActions";
import { LongFormSectionNav, type LongFormSectionNavItem } from "./LongFormSectionNav";
import { BROWSER_AUTOFILL_OFF_PROPS } from "@/lib/browserAutofill";
import { cn } from "@/lib/utils";

type LongFormShellProps = {
  title: string;
  companyName?: string | null;
  onBack: () => void;
  navItems: LongFormSectionNavItem[];
  activeSectionId: string;
  onSectionSelect: (sectionId: string) => void;
  autoExpandActiveNavGroups?: boolean;
  draftStatus?: ReactNode;
  notice?: ReactNode;
  serverError?: string | null;
  finalizationFeedback?: ReactNode;
  finalizationFeedbackRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  submitAction?: ReactNode;
  formProps?: Pick<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "noValidate">;
  onFormBlurCapture?: FocusEventHandler<HTMLElement>;
  loadingOverlay?: ReactNode | boolean;
  loadingOverlayPlacement?: "container" | "viewport";
};

function isEditableFormControl(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function LongFormShell({
  title,
  companyName,
  onBack,
  navItems,
  activeSectionId,
  onSectionSelect,
  autoExpandActiveNavGroups,
  draftStatus,
  notice,
  serverError,
  finalizationFeedback,
  finalizationFeedbackRef,
  children,
  submitAction,
  formProps,
  onFormBlurCapture,
  loadingOverlay,
  loadingOverlayPlacement = "container",
}: LongFormShellProps) {
  const content = (
    <>
      {notice}

      {serverError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}

      {children}

      {finalizationFeedback ? (
        <div
          ref={finalizationFeedbackRef}
          tabIndex={-1}
          data-testid="long-form-finalization-feedback"
          className="outline-none"
        >
          {finalizationFeedback}
        </div>
      ) : null}

      {submitAction ? <div className="flex justify-end">{submitAction}</div> : null}
    </>
  );

  const navigation = (
    <LongFormSectionNav
      items={navItems}
      activeSectionId={activeSectionId}
      onSelect={onSectionSelect}
      draftStatus={draftStatus}
      autoExpandActiveGroups={autoExpandActiveNavGroups}
    />
  );

  const handleFormBlurCapture: FocusEventHandler<HTMLElement> | undefined =
    onFormBlurCapture
      ? (event) => {
          if (!isEditableFormControl(event.target)) {
            return;
          }

          onFormBlurCapture(event);
        }
      : undefined;

  const resolvedLoadingOverlay =
    loadingOverlay === true ? <LongFormLoadingOverlay /> : loadingOverlay;

  const body = formProps ? (
    <form
      onSubmit={formProps.onSubmit}
      noValidate={formProps.noValidate}
      onBlurCapture={handleFormBlurCapture}
      {...BROWSER_AUTOFILL_OFF_PROPS}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      {navigation}
      <div className="space-y-6">{content}</div>
    </form>
  ) : (
    <div
      onBlurCapture={handleFormBlurCapture}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      {navigation}
      <div className="space-y-6">{content}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al menú
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1
                data-testid="long-form-title"
                className="text-lg font-bold leading-tight text-white"
              >
                {title}
              </h1>
              <p className="mt-0.5 text-sm text-reca-200">
                {companyName ?? "Nueva acta"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main
        data-testid="long-form-root"
        aria-busy={resolvedLoadingOverlay ? "true" : "false"}
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="relative">
          {body}
          {resolvedLoadingOverlay ? (
            <div
              data-testid="long-form-loading-overlay"
              className={cn(
                "flex items-center justify-center bg-white/75 backdrop-blur-[1px]",
                loadingOverlayPlacement === "viewport"
                  ? "fixed inset-0 z-40"
                  : "absolute inset-0 z-20 rounded-3xl"
              )}
            >
              {resolvedLoadingOverlay}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

type LongFormLoadingStateProps = {
  title?: string;
  description?: string;
};

export function LongFormLoadingState({
  title = "Recuperando acta",
  description = "Estamos reconstruyendo el documento guardado.",
}: LongFormLoadingStateProps) {
  return (
    <div
      data-testid="long-form-loading-state"
      className="flex min-h-screen items-center justify-center bg-gray-50"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-reca" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function LongFormLoadingOverlay({
  title = "Recuperando acta",
  description = "Estamos reconstruyendo el documento guardado.",
}: LongFormLoadingStateProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
    >
      <Loader2 className="h-5 w-5 animate-spin text-reca" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

type LongFormDraftErrorStateProps = {
  message: string;
  onBackToDrafts: () => void;
  title?: string;
};

export function LongFormDraftErrorState({
  message,
  onBackToDrafts,
  title = "No se pudo abrir el borrador",
}: LongFormDraftErrorStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <button
          type="button"
          onClick={onBackToDrafts}
          className="mt-4 rounded-xl bg-reca px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
        >
          Volver a borradores
        </button>
      </div>
    </div>
  );
}

type LongFormSuccessStateProps = {
  title: string;
  message: ReactNode;
  links: FormCompletionLinks | null;
  onReturnToHub: () => void;
  onStartNewForm: () => void;
  notice?: ReactNode;
  extraActions?: ReactNode;
};

export function LongFormSuccessState({
  title,
  message,
  links,
  onReturnToHub,
  onStartNewForm,
  notice,
  extraActions,
}: LongFormSuccessStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div
        data-testid="long-form-success-state"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm"
      >
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
        <h2 className="mb-2 text-xl font-bold text-gray-900">{title}</h2>
        <div className="mb-6 text-sm text-gray-500">{message}</div>

        {notice ? <div className="mb-4">{notice}</div> : null}

        <FormCompletionActions links={links} className="mb-4" />

        {extraActions ? <div className="mb-4">{extraActions}</div> : null}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onReturnToHub}
            className="w-full rounded-xl bg-reca py-2.5 text-sm font-semibold text-white transition-colors hover:bg-reca-dark"
          >
            Volver al menú
          </button>
          <button
            type="button"
            onClick={onStartNewForm}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Nuevo formulario
          </button>
        </div>
      </div>
    </div>
  );
}

type LongFormFinalizeButtonProps = {
  disabled: boolean;
  isSubmitting: boolean;
  isFinalizing: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit";
};

export function LongFormFinalizeButton({
  disabled,
  isSubmitting,
  isFinalizing,
  onClick,
  type = "submit",
}: LongFormFinalizeButtonProps) {
  return (
    <button
      type={type}
      data-testid="long-form-finalize-button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-reca px-6 py-2.5 text-sm font-semibold text-white transition-colors",
        "hover:bg-reca-dark disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      {isSubmitting || isFinalizing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {isFinalizing ? "Publicando..." : "Validando..."}
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Finalizar
        </>
      )}
    </button>
  );
}

type LongFormTestFillButtonProps = {
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export function LongFormTestFillButton({
  disabled = false,
  onClick,
}: LongFormTestFillButtonProps) {
  return (
    <button
      type="button"
      data-testid="manual-test-fill-button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors",
        "hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <FlaskConical className="h-4 w-4" />
      Test
    </button>
  );
}
