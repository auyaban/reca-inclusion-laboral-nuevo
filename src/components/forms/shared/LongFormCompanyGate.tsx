"use client";

import { Building2 } from "lucide-react";
import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";
import type { Empresa } from "@/lib/store/empresaStore";

type LongFormCompanyGateProps = {
  title: string;
  description: string;
  onSelectEmpresa: (empresa: Empresa) => void;
};

export function LongFormCompanyGate({
  title,
  description,
  onSelectEmpresa,
}: LongFormCompanyGateProps) {
  return (
    <div data-testid="long-form-company-gate" className="min-h-screen bg-gray-50">
      <div className="bg-reca shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-2 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-reca-100">{description}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <EmpresaSearchPanel onSelect={onSelectEmpresa} autoFocus />
      </main>
    </div>
  );
}
