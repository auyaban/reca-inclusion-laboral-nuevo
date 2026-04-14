"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-reca-light text-foreground">
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-lg rounded-3xl border border-reca/15 bg-white p-8 shadow-sm">
            <div className="mb-6 inline-flex rounded-full bg-reca px-3 py-1 text-sm font-bold text-white">
              RECA
            </div>
            <h1 className="text-2xl font-black text-reca-dark">
              Ocurrió un error inesperado
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              La aplicación registró el incidente para revisarlo. Puedes intentar
              cargar de nuevo esta pantalla.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-reca px-4 py-2 text-sm font-bold text-white transition hover:bg-reca-dark"
            >
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
