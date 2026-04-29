"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function TemporaryPasswordPanel({
  password,
}: {
  password: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-bold text-amber-950">
        Contraseña temporal generada
      </h2>
      <p className="mt-1 text-sm text-amber-900">
        Cópiala ahora. Por seguridad no se podrá volver a consultar.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
          {password}
        </code>
        <button
          type="button"
          onClick={copyPassword}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiada" : "Copiar"}
        </button>
      </div>
    </section>
  );
}
