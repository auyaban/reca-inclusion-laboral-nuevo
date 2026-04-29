"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import {
  changeTemporaryPasswordSchema,
  type ChangeTemporaryPasswordInput,
} from "@/lib/profesionales/schemas";

export default function TemporaryPasswordChangeForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeTemporaryPasswordInput>({
    resolver: zodResolver(
      changeTemporaryPasswordSchema
    ) as Resolver<ChangeTemporaryPasswordInput>,
  });

  async function onSubmit(values: ChangeTemporaryPasswordInput) {
    setServerError(null);
    const response = await fetch("/api/auth/cambiar-contrasena-temporal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setServerError(
        typeof payload.error === "string"
          ? payload.error
          : "No se pudo cambiar la contraseña."
      );
      return;
    }

    router.push("/hub");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}
      <label className="block text-sm font-semibold text-gray-700">
        Nueva contraseña
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
        {errors.password ? (
          <span className="mt-1 block text-xs text-red-600">
            {errors.password.message}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-semibold text-gray-700">
        Confirmar contraseña
        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
        {errors.confirmPassword ? (
          <span className="mt-1 block text-xs text-red-600">
            {errors.confirmPassword.message}
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-reca px-4 py-2.5 text-sm font-semibold text-white hover:bg-reca-700 disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Cambiar contraseña
      </button>
    </form>
  );
}
