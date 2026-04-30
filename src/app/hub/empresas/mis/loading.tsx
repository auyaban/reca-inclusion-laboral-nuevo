import { BackofficeTableSkeleton } from "@/components/backoffice";

export default function MisEmpresasLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <BackofficeTableSkeleton title="Cargando empresas..." />
    </main>
  );
}
