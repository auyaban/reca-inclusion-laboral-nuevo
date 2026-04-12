"use client";

import { useState } from "react";
import { CheckCircle2, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { openCompletionAction } from "./formCompletionActions.runtime";

export type FormCompletionLinks = {
  sheetLink?: string;
  pdfLink?: string;
};

type FormCompletionActionsProps = {
  links: FormCompletionLinks | null;
  className?: string;
};

export function FormCompletionActions({
  links,
  className,
}: FormCompletionActionsProps) {
  const [actionError, setActionError] = useState<string | null>(null);

  if (!links?.sheetLink && !links?.pdfLink) {
    return null;
  }

  function handleOpenBothResults() {
    const result = openCompletionAction("both", links, window);
    setActionError(result.error);
  }

  function handleOpenSheetResult() {
    const result = openCompletionAction("sheet", links, window);
    setActionError(result.error);
  }

  function handleOpenPdfResult() {
    const result = openCompletionAction("pdf", links, window);
    setActionError(result.error);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {links.sheetLink && links.pdfLink && (
        <button
          type="button"
          onClick={handleOpenBothResults}
          className="flex w-full items-center gap-2 rounded-xl border border-reca-200 bg-reca-50 px-4 py-2.5 text-sm font-semibold text-reca transition-colors hover:bg-reca-100"
        >
          <CheckCircle2 className="h-4 w-4" />
          Abrir acta y PDF
        </button>
      )}
      {links.sheetLink && (
        <button
          type="button"
          onClick={handleOpenSheetResult}
          className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Ver acta en Google Sheets
        </button>
      )}
      {links.pdfLink && (
        <button
          type="button"
          onClick={handleOpenPdfResult}
          className="flex w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
        >
          <FileText className="h-4 w-4" />
          Ver PDF en Drive
        </button>
      )}
      {actionError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
          {actionError}
        </div>
      ) : null}
    </div>
  );
}
