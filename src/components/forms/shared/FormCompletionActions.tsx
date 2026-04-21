"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  openCompletionAction,
  type CompletionActionResult,
} from "./formCompletionActions.runtime";

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
  const [actionResult, setActionResult] = useState<CompletionActionResult | null>(
    null
  );

  if (!links?.sheetLink && !links?.pdfLink) {
    return null;
  }

  function commitActionResult(result: CompletionActionResult) {
    setActionResult(result.message ? result : null);
  }

  function handleOpenSheetResult() {
    const result = openCompletionAction("sheet", links, window);
    commitActionResult(result);
  }

  function handleOpenPdfResult() {
    const result = openCompletionAction("pdf", links, window);
    commitActionResult(result);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
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
      {actionResult?.message ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900"
        >
          {actionResult.message}
        </div>
      ) : null}
    </div>
  );
}
