"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import type { PresentacionInitialPrewarmSeed } from "@/lib/presentacion";
import type { Empresa } from "@/lib/store/empresaStore";
import { cn } from "@/lib/utils";

const presentacionPrewarmSetupSchema = z.object({
  tipo_visita: z.enum(["Presentación", "Reactivación"]),
  prewarm_asistentes_estimados: z.coerce
    .number()
    .int("Ingresa un número entero")
    .min(0, "El mínimo es 0")
    .max(80, "El máximo es 80"),
});

type PresentacionPrewarmSetupValues = z.infer<
  typeof presentacionPrewarmSetupSchema
>;

type PresentacionPrewarmSetupProps = {
  empresa: Empresa;
  onContinue: (seed: PresentacionInitialPrewarmSeed) => void;
};

export function PresentacionPrewarmSetup({
  empresa,
  onContinue,
}: PresentacionPrewarmSetupProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PresentacionPrewarmSetupValues>({
    resolver: zodResolver(presentacionPrewarmSetupSchema) as Resolver<
      PresentacionPrewarmSetupValues
    >,
    defaultValues: {
      tipo_visita: "Presentación",
      prewarm_asistentes_estimados: 2,
    },
    mode: "onBlur",
  });

  function submit(values: PresentacionPrewarmSetupValues) {
    onContinue(values);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-2 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">
                Presentación / Reactivación del Programa
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-reca-100">
                {empresa.nombre_empresa}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <form
          className="space-y-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit(submit)}
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Datos iniciales de la visita
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Tipo de visita"
              htmlFor="prewarm_tipo_visita"
              required
              error={errors.tipo_visita?.message}
            >
              <select
                id="prewarm_tipo_visita"
                {...register("tipo_visita")}
                className={cn(
                  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  errors.tipo_visita ? "border-red-400" : "border-gray-200"
                )}
              >
                <option value="Presentación">Presentación</option>
                <option value="Reactivación">Reactivación</option>
              </select>
            </FormField>

            <FormField
              label="Asistentes estimados"
              htmlFor="prewarm_asistentes_estimados"
              required
              error={errors.prewarm_asistentes_estimados?.message}
            >
              <input
                id="prewarm_asistentes_estimados"
                type="number"
                min={0}
                max={80}
                step={1}
                inputMode="numeric"
                {...register("prewarm_asistentes_estimados")}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-reca-400",
                  errors.prewarm_asistentes_estimados
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200"
                )}
              />
            </FormField>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              Continuar
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
