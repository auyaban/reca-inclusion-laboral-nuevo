"use client";

type LongFormDisabledSectionStateProps = {
  message?: string;
};

const DEFAULT_MESSAGE =
  "Selecciona una empresa para habilitar esta sección del documento.";

export function LongFormDisabledSectionState({
  message = DEFAULT_MESSAGE,
}: LongFormDisabledSectionStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
      {message}
    </div>
  );
}
