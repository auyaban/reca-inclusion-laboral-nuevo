"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginValues) {
    setServerError(null);

    // 1. Buscar email asociado al usuario_login
    const lookupRes = await fetch("/api/auth/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_login: data.usuario_login }),
    });

    if (!lookupRes.ok) {
      setServerError(
        lookupRes.status === 429
          ? "Demasiados intentos. Intenta de nuevo más tarde."
          : "Usuario o contraseña incorrectos."
      );
      return;
    }

    const { email } = await lookupRes.json();

    // 2. Autenticar con Supabase usando el email encontrado
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error) {
      setServerError("Usuario o contraseña incorrectos.");
      return;
    }

    router.push("/hub");
  }

  return (
    <div className="w-full max-w-md">
      {/* Tarjeta */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header morado */}
        <div className="bg-reca px-8 pt-10 pb-8 text-white text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Red Empleo con Apoyo
          </h1>
          <p className="mt-1 text-reca-100 text-sm">
            Gestión de formularios de inclusión laboral
          </p>
        </div>

        {/* Formulario */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Usuario */}
            <div className="space-y-1.5">
              <label
                htmlFor="usuario_login"
                className="block text-sm font-medium text-gray-700"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="usuario_login"
                  type="text"
                  autoComplete="username"
                  placeholder="nombreusuario"
                  {...register("usuario_login")}
                  className={cn(
                    "w-full rounded-lg border pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400",
                    "outline-none transition-all duration-150",
                    "focus:ring-2 focus:ring-reca-600 focus:border-reca-600",
                    errors.usuario_login
                      ? "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  )}
                />
              </div>
              {errors.usuario_login && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.usuario_login.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={cn(
                    "w-full rounded-lg border px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400",
                    "outline-none transition-all duration-150",
                    "focus:ring-2 focus:ring-reca-600 focus:border-reca-600",
                    errors.password
                      ? "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Error servidor */}
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                "bg-reca text-white text-sm font-semibold",
                "transition-all duration-150",
                "hover:bg-reca-dark active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-reca-600 focus:ring-offset-2",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando…
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-reca-200 text-xs mt-6">
        © {new Date().getFullYear()} RECA – Buenas prácticas de empleo inclusivo
      </p>
    </div>
  );
}
