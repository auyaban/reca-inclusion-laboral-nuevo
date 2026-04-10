# AGENTS.md — RECA Inclusión Laboral (Next.js)

**Antes de empezar:** lee solo el archivo de `memory/` relevante para la tarea (ver tabla al final).

---

## ¿Qué es este proyecto?

Reescritura web de la app Tkinter de RECA. Gestiona formularios de inclusión laboral: diligenciar, guardar y publicar actas de visita a empresas.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui · React Hook Form · Zod · Supabase · Google Sheets/Drive · lucide-react

**Restricciones:** $0 infra (todo free tier) · Solo developer + Codex · No tocar repo Tkinter original

**Estado y fase actual:** ver `memory/MEMORY.md` (siempre actualizado)

---

## Convenciones de código

- `"use client"` solo si el componente usa estado, hooks o eventos del browser
- Validación siempre con **Zod** — definir schema antes del componente
- Formularios siempre con **React Hook Form** + `zodResolver`
- Clases Tailwind siempre con helper `cn()` de `@/lib/utils`
- API routes en `app/api/` — siempre retornan `NextResponse.json()`
- Nunca fetch directo a Supabase desde componentes — usar hooks o server actions
- Nombres: `PascalCase` para componentes, `camelCase` para utils/hooks

---

## Paleta de colores RECA

| Variable CSS | Hex | Uso |
|---|---|---|
| `--color-reca-600` | `#81398A` | Color primario (botones, headers) |
| `--color-reca-700` | `#672E6E` | Hover / estados activos |
| `--color-reca-50` | `#f9f0fa` | Fondos sutiles |
| `--color-reca-950` | `#220e22` | Gradientes oscuros |

**Clases utilitarias:** `bg-reca`, `bg-reca-dark`, `text-reca`, `border-reca`
**Tipografía:** Lato (Google Fonts), weights 300/400/700/900

---

## Servicios externos

| Servicio | Variable en `.env.local` |
|---|---|
| Supabase URL + publishable key | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato `sb_publishable_...`) |
| Supabase service role | `SUPABASE_SERVICE_ROLE_KEY` (solo server-side) |
| Google Service Account | `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON stringificado) |
| Google Sheets ID master | `GOOGLE_SHEETS_MASTER_ID` |

**Nunca commitear `.env.local` — está en `.gitignore`**

---

## Proyecto de referencia (Tkinter original — NO modificar)

Ruta: `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`

- `formularios/<nombre>/<nombre>.py` — campos, validaciones, mapeos a Sheets
- `completion_payloads.py` — payloads de finalización
- `google_sheets_client.py` — patrón de escritura a Sheets

**Patrón de migración:** leer `.py` → extraer campos → schema Zod → componente React

---

## Comandos

```bash
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

---

## Contexto mínimo por tarea

| Tarea | Leer |
|---|---|
| Nuevo formulario | `memory/forms_catalog.md` + `memory/roadmap.md` |
| Supabase auth | `memory/supabase_integration.md` + `src/lib/supabase/` |
| Bug en formulario | Solo `src/components/forms/[Form]Form.tsx` |
| Agregar campo | `src/lib/validations/<form>.ts` + componente |
| Google Sheets | `src/app/api/sheets/route.ts` + `memory/forms_catalog.md` |
| Estilos / UI | `src/app/globals.css` + componente específico |
| Deploy | `memory/roadmap.md` fase "Deploy" |

---

## Regla de actualización del roadmap

Al completar cualquier ítem del roadmap, **antes de dar la tarea por terminada**:
1. Marcar el ítem como `- [x]` en `memory/roadmap.md`
2. Actualizar la línea "Fase actual:" en `memory/MEMORY.md` si corresponde
---

## Regla de documentacion en Notion

Despues de cualquier cambio funcional relevante, bug fix, decision de arquitectura, despliegue o hallazgo de QA relacionado con formularios, borradores, Supabase o Vercel:
1. Actualizar las paginas de Notion de seguimiento ya usadas en este repo
2. Registrar que se implemento, que sigue pendiente y cual es el siguiente paso recomendado
3. Si el cambio solo existe localmente y aun no tiene commit/push, dejarlo explicitamente anotado como pendiente de despliegue o validacion

---

## Regla de QA pre-push

Cuando un cambio, fase o bug fix necesite QA antes de commit/push:
1. Crear un preview deployment de Vercel con el worktree actual, sin commit, siempre que sea viable
2. Entregar al usuario el link directo del preview y, si sirve, tambien el inspector del deployment
3. Entregar un checklist concreto de QA enfocado solo en el cambio actual
4. Si el QA encuentra hallazgos, documentarlos en Notion antes de hacer commit/push
