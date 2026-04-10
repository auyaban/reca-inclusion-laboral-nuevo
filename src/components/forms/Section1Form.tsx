"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";
import { buildFormEditorUrl, getFormLabel, getFormTabLabel } from "@/lib/forms";
import { useEmpresaStore, type Empresa } from "@/lib/store/empresaStore";

export default function Section1Form({ slug }: { slug: string }) {
  const router = useRouter();
  const setEmpresa = useEmpresaStore((state) => state.setEmpresa);

  const formName = getFormLabel(slug);
  const formTabLabel = getFormTabLabel(slug);

  useEffect(() => {
    document.title = `${formTabLabel} | Nueva acta`;
  }, [formTabLabel]);

  function handleSelect(empresa: Empresa) {
    setEmpresa(empresa);
    router.push(
      buildFormEditorUrl(slug, {
        sessionId: crypto.randomUUID(),
      })
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/hub")}
            className="mb-3 flex items-center gap-1.5 text-sm text-reca-200 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al menu
          </button>
          <h1 className="text-lg font-bold leading-tight text-white">{formName}</h1>
          <p className="mt-0.5 text-sm text-reca-200">Paso 1 de 2 - Seleccionar empresa</p>
        </div>
      </div>

      <div className="h-1 bg-gray-200">
        <div className="h-1 w-1/2 bg-reca transition-all" />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EmpresaSearchPanel onSelect={handleSelect} autoFocus />
      </main>
    </div>
  );
}
