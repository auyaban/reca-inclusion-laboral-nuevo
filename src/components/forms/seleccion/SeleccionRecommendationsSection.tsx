"use client";

import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import {
  appendSeleccionRecommendationTemplate,
  SELECCION_RECOMMENDATION_HELPERS,
} from "@/lib/seleccion";
import type { SeleccionValues } from "@/lib/validations/seleccion";
import { SeleccionNarrativeSection } from "./SeleccionNarrativeSection";

type Props = {
  ajustesValue: string;
  notaValue: string;
  register: UseFormRegister<SeleccionValues>;
  errors: FieldErrors<SeleccionValues>;
  getValues: UseFormGetValues<SeleccionValues>;
  setValue: UseFormSetValue<SeleccionValues>;
};

export function SeleccionRecommendationsSection({
  ajustesValue,
  notaValue,
  register,
  errors,
  getValues,
  setValue,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-reca-100 bg-reca-50 p-4">
        <p className="text-sm font-semibold text-gray-900">
          Helpers de ajustes razonables
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Cada helper agrega su bloque al final sin sobreescribir lo que ya
          escribiste ni duplicar el mismo contenido exacto.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SELECCION_RECOMMENDATION_HELPERS.map((helper) => (
            <button
              key={helper.id}
              type="button"
              onClick={() => {
                const currentValue = getValues("ajustes_recomendaciones");
                const nextValue = appendSeleccionRecommendationTemplate(
                  currentValue,
                  helper.id
                );

                if (nextValue === currentValue) {
                  return;
                }

                setValue("ajustes_recomendaciones", nextValue, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
              className="rounded-full border border-reca-200 bg-white px-3 py-1.5 text-xs font-semibold text-reca transition-colors hover:border-reca-300 hover:bg-reca-50"
            >
              {helper.label}
            </button>
          ))}
        </div>
      </div>

      <SeleccionNarrativeSection
        fieldName="ajustes_recomendaciones"
        label="Ajustes y recomendaciones"
        required
        placeholder="Consolida las recomendaciones, compromisos y ajustes razonables sugeridos para el proceso de seleccion."
        value={ajustesValue}
        register={register}
        errors={errors}
        getValues={getValues}
        setValue={setValue}
      />

      <SeleccionNarrativeSection
        fieldName="nota"
        label="Nota"
        required
        placeholder="Agrega una nota final de cierre para el proceso de seleccion."
        value={notaValue}
        register={register}
        errors={errors}
        getValues={getValues}
        setValue={setValue}
        minHeightClassName="min-h-[8rem]"
      />
    </div>
  );
}
