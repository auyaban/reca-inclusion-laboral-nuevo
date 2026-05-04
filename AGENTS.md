# AGENTS.md - RECA Inclusion Laboral (Next.js)

**Antes de empezar:** leer `memory/MEMORY.md` y solo un archivo adicional relevante.

## Proyecto

Reescritura web de la app Tkinter de RECA para diligenciar, guardar y publicar actas de inclusion laboral.

- Stack: Next.js 16, Tailwind v4, shadcn/ui, React Hook Form, Zod, Supabase, Google Sheets/Drive
- Restricciones: $0 infra, solo developer + Codex, no tocar el repo Tkinter original
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

## Workflow Supabase

- Usar `npm run supabase:*` o `npm exec supabase`; no asumir binario global
- Diagnostico base: `npm run supabase:doctor`
- SQL remoto: `npm run supabase:query -- --linked "select ..."`
- Consultas con service role: `npm run supabase:table -- --table public.empresas --select "nombre_empresa,nit_empresa" --limit 5`
- `SUPABASE_SERVICE_ROLE_KEY` no autentica `supabase login` ni el MCP hospedado

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run spellcheck
npm run supabase:doctor
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

## Tracking Seguimientos v1

- Todo pendiente de Seguimientos se gestiona en el milestone GitHub `Cerrar Seguimientos v1`: <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/1>
- Trabajar epics en orden estricto: F1 #53 bugs latentes criticos, F2 #54 UX consistency finalizacion, F3 #55 Empresas cleanup, F4 #56 Seguimientos polish.
- Antes de arrancar cada epic, esperar brief del PO con scope detallado.
- Dentro de cada epic, seguir el orden sugerido de childs escrito en el parent issue.
- Por cada child issue, usar ciclo: PO -> plan -> veto/aprobacion -> implementacion -> QA dual -> aprobacion.
- En commits/PRs, incluir `Closes #X` para el child correspondiente; cerrar el epic manualmente cuando todos sus childs esten closed.
- No mezclar childs de epics distintos en un mismo PR salvo autorizacion explicita del PO.

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

## QA pre-push

Cuando un cambio necesite QA antes de commit/push:

1. crear preview de Vercel con el worktree actual si es viable
2. entregar link directo e inspector si ayudan
3. entregar checklist concreto de QA enfocado en el cambio
4. si QA encuentra hallazgos, documentarlos en Notion antes de push
