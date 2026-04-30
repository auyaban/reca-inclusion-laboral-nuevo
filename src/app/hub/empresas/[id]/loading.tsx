import { BackofficeFormSkeleton } from "@/components/backoffice";

export default function EmpresaOperativaDetailLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <BackofficeFormSkeleton title="Abriendo registro..." />
    </main>
  );
}
