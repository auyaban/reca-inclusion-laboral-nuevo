## Memory Index - RECA Inclusion Laboral (Web)

Leer solo el archivo relevante para la tarea actual.

| Archivo | Cuándo leerlo |
|---|---|
| [user_profile.md](user_profile.md) | Primera sesión o si hay dudas sobre el contexto del usuario |
| [architecture.md](architecture.md) | Antes de agregar componentes, rutas o decisiones técnicas |
| [roadmap.md](roadmap.md) | Al inicio de cada sesión para saber el siguiente frente |
| [forms_catalog.md](forms_catalog.md) | Al trabajar en un formulario específico |
| [form_production_standard.md](form_production_standard.md) | Antes de migrar o endurecer formularios al estándar productivo |
| [supabase_integration.md](supabase_integration.md) | Al tocar auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Al tocar Google Sheets o Drive |
| [migration_reference.md](migration_reference.md) | Al contrastar con el repo Tkinter original |
| [notion_workflow.md](notion_workflow.md) | Al documentar en Notion o cerrar fases/QA |
| [transicion_drafts_invisibles_plan.md](transicion_drafts_invisibles_plan.md) | Solo si hace falta recordar invariantes del rollout invisible |

## Estado local breve

- `Finalizacion / hardening F1` y `limpieza estructural F2` ya quedaron aplicados localmente y validados con suites focales, `npm run build` y `npm run spellcheck`.
- `Drafts invisibles` ya quedaron armonizados de forma shared para todos los long forms del piloto. La URL nominal ya no debe exponer `?session=draft:<uuid>`.
- `Drafts durante finalizacion` ya quedaron endurecidos de forma shared para bloquear checkpoints automáticos y evitar huérfanos remotos.
- `Observabilidad / Sentry` ya quedó limpiada: el ruido de finalización pasó a breadcrumbs-only y el backlog reciente del proyecto quedó triageado.
- `Evaluacion` ya corre como formulario largo en preview, con tarjeta habilitada en `/hub`, publicación solo a Google Sheets y sin PDF.

## Siguiente foco recomendado

1. QA manual del preview vigente para `Presentacion`, `Evaluacion` y una inducción.
2. Confirmar que el flujo de drafts invisibles sigue estable desde `/hub`.
3. Después del QA, decidir promoción o siguiente frente funcional.

## Referencias rápidas

- App original (solo lectura): `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- Producción: <https://reca-inclusion-laboral-nuevo.vercel.app>
- Notion canónico: `10 — Estado actual`, `20 — Pendientes priorizados`, `30 — QA y validación`, `40 — Iniciativas y decisiones`, `50 — Formularios y migración`
