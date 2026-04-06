# Memory Index — RECA Inclusión Laboral (Web)

Leer **solo el archivo relevante** para la tarea actual. No leer todos en cada sesión.

| Archivo | Cuándo leerlo |
|---|---|
| [user_profile.md](user_profile.md) | Primera sesión o si hay dudas sobre el contexto del usuario |
| [architecture.md](architecture.md) | Antes de agregar cualquier componente, ruta o decisión técnica nueva |
| [roadmap.md](roadmap.md) | **Al inicio de cada sesión** — dice qué sigue y en qué fase estamos |
| [forms_catalog.md](forms_catalog.md) | Al trabajar en cualquier formulario específico |
| [supabase_integration.md](supabase_integration.md) | Al trabajar con auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Al trabajar con Google Sheets o Google Drive |
| [migration_reference.md](migration_reference.md) | Al migrar un formulario desde el proyecto Tkinter original |

---

## Contexto rápido (leer siempre)

- **Proyecto:** Reescritura web de app Tkinter de gestión de formularios de inclusión laboral
- **Stack:** Next.js 16 + Tailwind v4 + Supabase + Google Sheets/Drive
- **Restricción crítica:** $0 infra — todo free tier
- **Dev:** Solo developer + Claude Code como equipo
- **Fase actual:** Fase 3 — Componentes UI base (shadcn/ui) (ver roadmap.md)
- **App original (NO tocar):** `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- **Dev server:** `npm run dev` → http://localhost:3000

## Lo que ya está construido
- ✅ Setup completo Next.js + Tailwind + dependencias
- ✅ Paleta de colores RECA (`#81398A`) en globals.css
- ✅ Auth con Supabase — login real, middleware, useAuth, logout
- ✅ Login UI (`/`) — conectado con Supabase Auth
- ✅ Hub / menú con 9 tarjetas (`/hub`) — auth guard activo
- ✅ Middleware (`src/middleware.ts`) — protege `/hub` y `/formularios/*`
- ✅ Fase 2: `Section1Form` con búsqueda debounce en tabla `empresas` (1134 registros)
- ✅ Zustand store (`src/lib/store/empresaStore.ts`) — empresa persiste en sessionStorage
- ✅ Ruta dinámica `/formularios/[slug]` → renderiza Section1Form
- ✅ Documentación completa en `memory/`
