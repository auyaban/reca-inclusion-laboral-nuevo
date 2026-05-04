# CLAUDE.md - RECA Inclusion Laboral (Next.js)

**Antes de empezar:** leer `memory/MEMORY.md` y solo un archivo adicional relevante.

## Proyecto

Reescritura web de la app Tkinter de RECA para diligenciar, guardar y publicar actas de inclusion laboral.

- Stack: Next.js 16, Tailwind v4, shadcn/ui, React Hook Form, Zod, Supabase, Google Sheets/Drive
- Restricciones: $0 infra, solo developer + Claude Code, no tocar el repo Tkinter original
- Estado actual: `memory/MEMORY.md`

## Reglas de codigo

- `"use client"` solo si el componente necesita estado, hooks o eventos del browser
- Validacion siempre con Zod; definir el schema antes del componente
- Formularios siempre con React Hook Form + `zodResolver`
- Clases Tailwind con `cn()` de `@/lib/utils`
- API routes en `app/api/` y respondiendo con `NextResponse.json()`
- Nunca fetch directo a Supabase desde componentes
- `PascalCase` para componentes, `camelCase` para utils/hooks

## Servicios y referencias

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Google: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEETS_MASTER_ID`
- `.env.local` nunca se commitea
- Repo legacy solo lectura: `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run spellcheck
```

## Contexto minimo por tarea

| Tarea | Leer |
|---|---|
| Nuevo formulario | `memory/roadmap.md` + codigo del formulario relevante |
| Supabase auth | `memory/supabase_integration.md` + `src/lib/supabase/` |
| Bug en formulario | Solo `src/components/forms/[Form]Form.tsx` |
| Agregar campo | `src/lib/validations/<form>.ts` + componente |
| Google Sheets | `memory/google_integration.md` + `src/app/api/sheets/route.ts` |
| Estilos / UI | `src/app/globals.css` + componente |
| Documentacion / Notion | `memory/MEMORY.md` + `memory/notion_workflow.md` |
| Deploy | `memory/roadmap.md` |

## Politica de contexto

- Leer `memory/MEMORY.md` primero y luego solo el archivo de `memory/` o la carpeta de codigo relevante.
- No abrir sesiones, historicos ni referencias legacy salvo bloqueo real.
- Priorizar recuperar contexto util con el menor numero de lecturas posible.

## Roadmap

Si se completa un item real del roadmap, antes de cerrar la tarea:

1. actualizar `memory/roadmap.md`
2. ajustar `memory/MEMORY.md` si cambia el estado breve o el siguiente foco

## Notion

### Lectura por defecto

1. `10 - Estado actual`
2. `20 - Pendientes priorizados`
3. `30 - QA y validacion` solo si la tarea toca QA, release o validacion
4. `50 - Formularios y migracion` solo si la tarea toca formularios
5. `40 - Iniciativas y decisiones` solo si la tarea toca decisiones o direccion

### Limites

- No hacer busquedas amplias para "entender todo el proyecto"
- No leer mas de 4 paginas por defecto
- Abrir `60` o `70` solo si falta contexto para ejecutar

### Escritura por defecto

- Actualizar primero una pagina canonica (`10`, `20`, `30`, `40` o `50`)
- Actualizar a lo sumo una pagina de soporte
- Registrar solo: que quedo hecho, que sigue pendiente, siguiente paso y estado local/preview/produccion
- No duplicar en Notion contenido que vive mejor en codigo, tests, commits o `memory/roadmap.md`
