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
- `Visita fallida` ya existe localmente en los long forms estandar excepto el CTA visible de `presentacion` y `sensibilizacion`, retirado por decision de producto. Los ajustes directos de QA local tambien quedaron aplicados para `evaluacion`, `seleccion` y `contratacion`. Todo sigue pendiente de QA manual antes de considerarse estado real de produccion.
- La confirmacion shared de finalizacion ya tolera fallos transitorios del polling de estado y puede recuperar exito/PDF cuando la publicacion quedo persistida; el caso de `induccion-organizacional` con `visita fallida` se diagnostico como `external_artifacts.pdfLink` presente pero `response_payload.pdfLink` ausente, y el status ahora lo recupera desde artifacts.
- En `evaluacion`, el nav ya usa la optionalidad de `visita fallida` para marcar secciones completas y el grupo 2 puede iniciar plegado sin afectar otros formularios; por decision de producto, Evaluacion de Accesibilidad no genera PDF nunca y publica solo Sheet.
- La eliminacion de borradores en el hub se mantiene optimista y prioriza soft-delete remoto antes de cleanup de Google Drive; existe una UI interna minima para `aaron_vercel` que consume la API protegida y permite diagnosticar/reintentar cleanup `pending`/`failed` con batch seguro y purgar manualmente filas `trashed`/`skipped`, sin queue ni cron por ahora.
- Queda abierto un proyecto formal de prewarm y finalizacion segura en `memory/roadmap.md`: Fase 0, Fase 1 y Fase 2/3 ya quedaron implementadas y validadas en preview; Fase 4 ya quedo implementada y desplegada en Preview para QA manual. El siguiente desarrollo es Fase 5 para piloto temprano por formulario.
- `Interprete LSC` y `Seguimientos` ya no tienen docs especiales; su estado local vive en `forms_catalog.md`.
- El backlog vivo, QA abierta y decisiones activas viven en `roadmap.md` y en las paginas canonicas de Notion.

## Siguiente foco recomendado

- Ejecutar QA manual de Fase 4 del proyecto de prewarm y finalizacion segura: contrato canonico de prewarm estructural para `presentacion`, delete con spreadsheet asociado, finalizacion con prewarm listo y fallback inline.
- Luego implementar Fase 5: piloto temprano por formulario empezando por `presentacion`.
- Ejecutar QA manual del lote de `visita fallida` en los formularios long-form estandar activos (`evaluacion`, `induccion-operativa`, `induccion-organizacional`, `seleccion`, `contratacion`, `condiciones-vacante`) y confirmar que `presentacion`/`sensibilizacion` ya no muestran CTA.
- Reprobar especificamente `induccion-organizacional` en `visita fallida`: exito, link PDF recuperado desde `finalization-status` y desaparicion del borrador local tras confirmacion recuperada.
- Validar manualmente el flujo de eliminacion de borradores: desaparicion inmediata, restauracion si falla DB, metadata de cleanup si falla Drive, UI admin interna de cleanup y purga manual protegida de soft-deleted resueltos.
- Ejecutar QA manual del frente shared de autosave/integridad y cerrar si deja de ser riesgo operativo.
- Decidir si `evaluacion` sale de preview o mantiene QA manual pendiente despues del lote de `visita fallida`.
- Si `visita fallida` queda estable, decidir si `interprete-lsc` entra con una variante propia o si se mantiene fuera del patron shared.

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
