"use client";

import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { useInterpretesCatalog } from "@/hooks/useInterpretesCatalog";
import { useProfesionalesCatalog } from "@/hooks/useProfesionalesCatalog";
import {
  countMeaningfulInterpreteLscAsistentes,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
  getDefaultInterpreteLscValues,
  normalizeInterpreteLscValues,
} from "@/lib/interpreteLsc";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  interpreteLscSchema,
  type InterpreteLscValues,
} from "@/lib/validations/interpreteLsc";

export function useInterpreteLscEditorRuntime(options: {
  empresa: Empresa | null;
  isBootstrappingForm: boolean;
}) {
  const { empresa, isBootstrappingForm } = options;
  const appliedAssignedCargoKeyRef = useRef<string | null>(null);
  const { profesionales } = useProfesionalesCatalog();
  const {
    interpretes: interpretesCatalog,
    error: interpretesCatalogError,
    creatingName: creatingInterpreteName,
    createInterprete,
  } = useInterpretesCatalog();

  const interpreteLscResolver = useMemo(
    () => zodResolver(interpreteLscSchema) as Resolver<InterpreteLscValues>,
    []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InterpreteLscValues>({
    resolver: interpreteLscResolver,
    defaultValues: getDefaultInterpreteLscValues(empresa),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [
    fechaVisita = "",
    modalidadInterprete = "",
    modalidadProfesionalReca = "",
    nitEmpresa = "",
    oferentes = [],
    interpretes = [],
    sabana = { activo: false, horas: 1 },
    sumatoriaHoras = "",
    asistentes = [],
  ] = useWatch({
    control,
    name: [
      "fecha_visita",
      "modalidad_interprete",
      "modalidad_profesional_reca",
      "nit_empresa",
      "oferentes",
      "interpretes",
      "sabana",
      "sumatoria_horas",
      "asistentes",
    ],
  }) as [
    InterpreteLscValues["fecha_visita"] | undefined,
    InterpreteLscValues["modalidad_interprete"] | undefined,
    InterpreteLscValues["modalidad_profesional_reca"] | undefined,
    InterpreteLscValues["nit_empresa"] | undefined,
    InterpreteLscValues["oferentes"] | undefined,
    InterpreteLscValues["interpretes"] | undefined,
    InterpreteLscValues["sabana"] | undefined,
    InterpreteLscValues["sumatoria_horas"] | undefined,
    InterpreteLscValues["asistentes"] | undefined,
  ];

  const currentNormalizedValues = useMemo(
    () =>
      normalizeInterpreteLscValues(
        {
          fecha_visita: fechaVisita,
          modalidad_interprete: modalidadInterprete || undefined,
          modalidad_profesional_reca:
            modalidadProfesionalReca || undefined,
          nit_empresa: nitEmpresa,
          oferentes,
          interpretes,
          sabana,
          sumatoria_horas: sumatoriaHoras,
          asistentes,
        },
        empresa
      ),
    [
      asistentes,
      empresa,
      fechaVisita,
      interpretes,
      modalidadInterprete,
      modalidadProfesionalReca,
      nitEmpresa,
      oferentes,
      sabana,
      sumatoriaHoras,
    ]
  );

  const serviceSummary = useMemo(() => {
    if (!empresa) {
      return null;
    }

    const oferentesCount = countMeaningfulInterpreteLscOferentes(oferentes);
    const interpretesCount = countMeaningfulInterpreteLscInterpretes(interpretes);
    const asistentesCount = countMeaningfulInterpreteLscAsistentes(asistentes);
    const sabanaHoras = Number.isInteger(sabana?.horas)
      ? String(sabana?.horas ?? 0)
      : String(sabana?.horas ?? 0).replace(/\.0$/, "");

    return {
      oferentesCount,
      interpretesCount,
      asistentesCount,
      sumatoriaHoras: sumatoriaHoras || "0:00",
      sabanaLabel: sabana?.activo ? `${sabanaHoras} horas adicionales` : "No aplica",
    };
  }, [asistentes, empresa, interpretes, oferentes, sabana, sumatoriaHoras]);

  useEffect(() => {
    const assignedProfessional = empresa?.profesional_asignado ?? "";
    if (!assignedProfessional || isBootstrappingForm) return;
    const empresaIdentity = empresa?.id || empresa?.nit_empresa || "";
    const cargoAutofillKey = `${empresaIdentity}:${assignedProfessional.toLowerCase()}`;
    if (appliedAssignedCargoKeyRef.current === cargoAutofillKey) return;
    if (getValues("asistentes.0.cargo")) {
      appliedAssignedCargoKeyRef.current = cargoAutofillKey;
      return;
    }

    const match = profesionales.find(
      (profesional) =>
        profesional.nombre_profesional.toLowerCase() ===
        assignedProfessional.toLowerCase()
    );

    if (match?.cargo_profesional) {
      setValue("asistentes.0.cargo", match.cargo_profesional, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      appliedAssignedCargoKeyRef.current = cargoAutofillKey;
    }
  }, [
    empresa?.id,
    empresa?.nit_empresa,
    empresa?.profesional_asignado,
    getValues,
    isBootstrappingForm,
    profesionales,
    setValue,
  ]);

  return {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    errors,
    isSubmitting,
    fechaVisita,
    modalidadInterprete,
    modalidadProfesionalReca,
    nitEmpresa,
    oferentes,
    interpretes,
    sabana,
    sumatoriaHoras,
    asistentes,
    currentNormalizedValues,
    serviceSummary,
    profesionales,
    interpretesCatalog,
    interpretesCatalogError,
    creatingInterpreteName,
    createInterprete,
    resetAssignedCargoAutofill() {
      appliedAssignedCargoKeyRef.current = null;
    },
  };
}
