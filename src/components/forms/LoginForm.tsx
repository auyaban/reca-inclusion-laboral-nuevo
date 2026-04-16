"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Building2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

function getLoginErrorMessage(status: number) {
  if (status === 429) {
    return "Demasiados intentos. Intenta de nuevo más tarde.";
  }

  if (status === 503) {
    return "Inicio de sesión temporalmente no disponible. Intenta de nuevo más tarde.";
  }

  return "Usuario o contraseña incorrectos.";
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
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
    setRedirecting(false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        setServerError(getLoginErrorMessage(response.status));
        return;
      }

      setRedirecting(true);
      router.push("/hub");
    } catch {
      setServerError(
        "Inicio de sesión temporalmente no disponible. Intenta de nuevo más tarde."
      );
      setRedirecting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-reca px-8 pb-8 pt-10 text-center text-white">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Red Empleo con Apoyo
          </h1>
          <p className="mt-1 text-sm text-reca-100">
            Gestión de formularios de inclusión laboral
          </p>
        </div>

        <div className="px-8 py-8">
          <h2 className="mb-6 text-lg font-semibold text-gray-800">
            Iniciar sesión
          </h2>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="usuario_login"
                className="block text-sm font-medium text-gray-700"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="usuario_login"
                  data-testid="login-username"
                  type="text"
                  autoComplete="username"
                  placeholder="nombreusuario"
                  {...register("usuario_login")}
                  className={cn(
                    "w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm text-gray-900 placeholder-gray-400",
                    "outline-none transition-all duration-150",
                    "focus:border-reca-600 focus:ring-2 focus:ring-reca-600",
                    errors.usuario_login
                      ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400"
                      : "border-gray-300 hover:border-gray-400"
                  )}
                />
              </div>
              {errors.usuario_login ? (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <span>!</span> {errors.usuario_login.message}
                </p>
              ) : null}
            </div>

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
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="********"
                  {...register("password")}
                  className={cn(
                    "w-full rounded-lg border px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400",
                    "outline-none transition-all duration-150",
                    "focus:border-reca-600 focus:ring-2 focus:ring-reca-600",
                    errors.password
                      ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <span>!</span> {errors.password.message}
                </p>
              ) : null}
            </div>

            {serverError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            ) : null}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={isSubmitting || redirecting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
                "bg-reca transition-all duration-150 hover:bg-reca-dark active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-reca-600 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {isSubmitting || redirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {redirecting ? "Entrando..." : "Ingresando..."}
                </>
              ) : (
                "Ingresar"
              )}
            </button>

            {redirecting ? (
              <p className="text-center text-xs font-medium text-gray-500">
                Abriendo el hub...
              </p>
            ) : null}
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-reca-200">
        (c) {new Date().getFullYear()} RECA - Buenas prácticas de empleo inclusivo
      </p>
    </div>
  );
}
