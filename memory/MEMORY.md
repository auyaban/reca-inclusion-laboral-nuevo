## Memory Index - RECA Inclusion Laboral (Web)

Leer `MEMORY.md` y solo un archivo adicional segun la tarea.

## Canonico minimo

| Archivo | Cuando leerlo |
|---|---|
| [user_profile.md](user_profile.md) | Primera sesion o si hay dudas sobre el usuario |
| [architecture.md](architecture.md) | Cambios de arquitectura, drafts o finalizacion shared |
| [roadmap.md](roadmap.md) | Frentes activos, bloqueos y siguiente orden |
| [forms_catalog.md](forms_catalog.md) | Estado real de cualquier formulario |
| [form_production_standard.md](form_production_standard.md) | Migrar o endurecer formularios al estandar productivo |
| [supabase_integration.md](supabase_integration.md) | Auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Google Sheets, Drive o PDF |
| [migration_reference.md](migration_reference.md) | Contraste puntual con el repo Tkinter |
| [notion_workflow.md](notion_workflow.md) | Lectura o escritura en Notion |
| [sentry_integration.md](sentry_integration.md) | Observabilidad o Sentry |

## Estado actual breve

- La migracion web ya cubre los formularios activos; el estado vivo por formulario esta en `forms_catalog.md`.
- La infraestructura shared de drafts, finalizacion y prewarm ya esta endurecida; no abrir documentos historicos de fases cerradas.
- `Interprete LSC` y `Seguimientos` ya no tienen docs especiales; su estado local vive en `forms_catalog.md`.
- El backlog vivo, QA abierta y decisiones activas viven en `roadmap.md` y en las paginas canonicas de Notion.

## Siguiente foco recomendado

- Ejecutar QA manual del frente shared de autosave/integridad y cerrar si deja de ser riesgo operativo.
- Decidir si `evaluacion` sale de preview o mantiene QA manual pendiente.
- Solo si se retoma, decidir rollout de prewarm de `interprete-lsc` via `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.

## Reglas duras

- `MEMORY.md` no guarda historial, previews viejos ni changelog de PRs.
- `roadmap.md` solo guarda frentes abiertos, decisiones activas y siguiente orden.
- `forms_catalog.md` es la unica verdad local del estado por formulario.
- No crear `.md` por PR, preview, checklist de QA cerrada o fase cerrada.
- Si un formulario ya esta migrado, su historia sale del repo; solo queda su estado vivo en `forms_catalog.md` y, si aplica, el frente activo en `roadmap.md`.

## Referencias rapidas

- App original (solo lectura): `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- Produccion: <https://reca-inclusion-laboral-nuevo.vercel.app>
- Notion canonico: `10 - Estado actual`, `20 - Pendientes priorizados`, `30 - QA y validacion`, `40 - Iniciativas y decisiones`, `50 - Formularios y migracion`
