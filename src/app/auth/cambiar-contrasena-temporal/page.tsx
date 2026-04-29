import { redirect } from "next/navigation";
import TemporaryPasswordChangeForm from "@/components/profesionales/TemporaryPasswordChangeForm";
import { getCurrentUserContext } from "@/lib/auth/roles";

export default async function TemporaryPasswordPage() {
  const context = await getCurrentUserContext();

  if (!context.ok) {
    redirect("/");
  }

  if (!context.profile.authPasswordTemp) {
    redirect("/hub");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-reca-950 via-reca-800 to-reca-600 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-900">
          Cambiar contraseña temporal
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Antes de continuar debes crear una contraseña definitiva para tu
          cuenta.
        </p>
        <div className="mt-6">
          <TemporaryPasswordChangeForm />
        </div>
      </section>
    </main>
  );
}
