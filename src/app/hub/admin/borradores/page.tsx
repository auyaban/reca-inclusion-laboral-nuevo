import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftCleanupAdminPanel } from "@/components/admin/DraftCleanupAdminPanel";
import { authorizeDraftCleanupAdmin } from "@/lib/admin/draftCleanupAdmin";

export default async function DraftCleanupAdminPage() {
  const authorization = await authorizeDraftCleanupAdmin();
  if (!authorization.ok) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-reca">
              Operacion interna
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Administrar cleanup de borradores
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Acceso habilitado para {authorization.usuarioLogin}. Esta pantalla
              opera sobre borradores soft-deleted y archivos provisionales de Drive.
            </p>
          </div>

          <Link
            href="/hub"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Volver al hub
          </Link>
        </div>

        <DraftCleanupAdminPanel />
      </div>
    </main>
  );
}

