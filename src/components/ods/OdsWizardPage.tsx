"use client";

import { useEffect } from "react";
import { useOdsStore } from "@/hooks/useOdsStore";
import { Seccion1 } from "@/components/ods/sections/Seccion1";
import { Seccion2 } from "@/components/ods/sections/Seccion2";
import { SummaryCard } from "@/components/ods/SummaryCard";

export default function OdsWizardPage() {
  const computeResumen = useOdsStore((s) => s.computeResumen);

  useEffect(() => {
    const timer = setTimeout(() => computeResumen(), 300);
    return () => clearTimeout(timer);
  }, [computeResumen]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Crear nueva entrada ODS</h1>
      <Seccion1 />
      <Seccion2 />
      <SummaryCard />
    </div>
  );
}
