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
npm run spellcheck
```

- `npm run spellcheck` forma parte del cierre de cambios de copy, UX o documentación visible antes de deploy/push.

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
| Documentación / Notion | `memory/MEMORY.md` + `memory/notion_workflow.md` |
| Deploy | `memory/roadmap.md` fase "Deploy" |

---

## Política de contexto para LLM

- Leer primero `memory/MEMORY.md` y luego **solo** el archivo de `memory/` o el componente/carpeta relevante para la tarea.
- No leer todas las sesiones de Notion ni todos los MD por defecto.
- Si la tarea no requiere contexto histórico, no abrir `60 — Sesiones de trabajo`.
- Si la tarea no requiere contraste con el sistema Tkinter, no abrir `70 — Legacy y referencias`.
- La prioridad es recuperar contexto útil con el menor número de lecturas posible.

---

## Regla de actualización del roadmap

Al completar cualquier ítem del roadmap, **antes de dar la tarea por terminada**:
1. Marcar el ítem como `- [x]` en `memory/roadmap.md`
2. Actualizar la línea "Fase actual:" en `memory/MEMORY.md` si corresponde

---

## Política de Notion y ahorro de tokens

### Lectura por defecto

Antes de buscar o leer más en Notion:
1. Leer `10 — Estado actual`
2. Leer `20 — Pendientes priorizados`
3. Leer `30 — QA y validación` **solo** si la tarea toca QA, release o validación
4. Leer `50 — Formularios y migración` **solo** si la tarea toca formularios o migración
5. Leer `40 — Iniciativas y decisiones` **solo** si la tarea toca decisiones, fases o dirección de producto

### Límites de lectura

- No hacer búsquedas amplias en Notion para “entender todo el proyecto”.
- No leer más de 4 páginas de Notion por defecto.
- Abrir `60 — Sesiones de trabajo` solo si falta contexto para ejecutar.
- Abrir `70 — Legacy y referencias` solo si hay que contrastar con el repo Tkinter o resolver drift.

### Escritura por defecto

Después de cualquier cambio funcional relevante, bug fix, decisión de arquitectura, despliegue o hallazgo de QA relacionado con formularios, borradores, Supabase o Vercel:
1. Actualizar primero **una página canónica** de Notion
2. Actualizar **una sola** página de soporte adicional si hace falta detalle
3. Registrar solo:
   - qué quedó hecho
   - qué sigue pendiente
   - cuál es el siguiente paso recomendado
   - si está local, en preview o en producción

### Qué página canónica actualizar

- Estado general o cambio de fase: `10 — Estado actual`
- Backlog vivo o siguiente trabajo: `20 — Pendientes priorizados`
- QA, previews, hallazgos, checklist o validación: `30 — QA y validación`
- Decisión cerrada, iniciativa o dirección del proyecto: `40 — Iniciativas y decisiones`
- Estado de formularios, comparativas o migración: `50 — Formularios y migración`

### Lo que no se debe hacer

- No duplicar en Notion contenido que ya vive mejor en código, tests, commits o `memory/roadmap.md`
- No usar las sesiones como fuente primaria de contexto
- No escribir narrativas largas de exploración o intentos fallidos sin valor de reanudación
- No mezclar backlog vivo con historial cerrado

### Regla de mínimo útil

- Si el cambio no deja una decisión, un estado nuevo, un pendiente real o un resultado de QA, no actualizar Notion
- Si el cambio solo existe localmente y aún no tiene commit/push, dejarlo explícitamente anotado como pendiente de despliegue o validación

---

## Regla de QA pre-push

Cuando un cambio, fase o bug fix necesite QA antes de commit/push:
1. Crear un preview deployment de Vercel con el worktree actual, sin commit, siempre que sea viable
2. Entregar al usuario el link directo del preview y, si sirve, también el inspector del deployment
3. Entregar un checklist concreto de QA enfocado solo en el cambio actual
4. Si el QA encuentra hallazgos, documentarlos en Notion antes de hacer commit/push
