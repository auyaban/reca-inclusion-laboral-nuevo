import dynamic from "next/dynamic";
import { LongFormLoadingState } from "@/components/forms/shared/LongFormShell";

const SeguimientosForm = dynamic(
  () => import("@/components/forms/SeguimientosForm"),
  {
    loading: () => (
      <LongFormLoadingState
        title="Abriendo Seguimientos"
        description="Estamos cargando el runtime especial del caso."
      />
    ),
  }
);

export default function SeguimientosPage() {
  return <SeguimientosForm />;
}
