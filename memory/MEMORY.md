## Memory Index - RECA Inclusion Laboral (Web)

Leer `MEMORY.md` y solo un archivo adicional segun la tarea.

## Canonico minimo

| Archivo | Cuando leerlo |
|---|---|
| [roadmap.md](roadmap.md) | Frentes activos, bloqueos y siguiente orden |
| [forms_catalog.md](forms_catalog.md) | Estado real de cualquier formulario |
| [architecture.md](architecture.md) | Cambios de arquitectura, drafts o finalizacion shared |
| [form_production_standard.md](form_production_standard.md) | Migrar o endurecer formularios |
| [supabase_integration.md](supabase_integration.md) | Auth, datos o API routes de Supabase |
| [google_integration.md](google_integration.md) | Google Sheets, Drive o PDF |
| [notion_workflow.md](notion_workflow.md) | Lectura o escritura en Notion |
| [user_profile.md](user_profile.md) | Primera sesion o dudas sobre el usuario |

## Estado actual breve

- La migracion web cubre los formularios activos; el estado vivo por formulario esta en `forms_catalog.md`.
- Drafts, finalizacion compartida, prewarm, cleanup seguro y recuperacion de finalizacion ya estan endurecidos.
- El proyecto de prewarm/finalizacion segura completo Fases 0-7: claim por identidad, delete seguro, contrato canonico, piloto temprano de `presentacion`, reuse confiable, text review directo/paralelo, cold path optimizado y cache de text review.
- Se dejara correr una semana antes de decidir Fase 8 con datos reales; el foco sera evaluar si `seleccion` y `contratacion` ameritan setup/prewarm temprano propio o si basta el contrato canonico + cold path optimizado.
- `Visita fallida` existe localmente en long forms estandar, con QA manual pendiente antes de considerarlo listo para produccion. `presentacion` y `sensibilizacion` no muestran CTA por decision de producto.
- La UI admin de borradores para `aaron_vercel` permite revisar/reintentar cleanup `pending`/`failed` y purgar manualmente resueltos.
- `Evaluacion` sigue en preview y no genera PDF por decision de producto.

## Siguiente foco recomendado

- Esperar una semana de uso y luego correr `npm run finalization:baseline -- --days 30 --limit 100`, separando `reused_ready`, `inline_cold` e `inline_after_*`.
- Crear plan de Fase 8 solo con formularios donde el beneficio esperado sea claro y medible.
- Mantener separado el QA pendiente de `visita fallida`, borradores y autosave; no mezclar esos hallazgos con rollout de prewarm.

## Reglas duras

- `MEMORY.md` no guarda historial, previews viejos ni changelog de PRs.
- `roadmap.md` solo guarda frentes abiertos, decisiones activas y siguiente orden.
- `forms_catalog.md` es la unica verdad local del estado por formulario.
- No crear `.md` por PR, preview, checklist de QA cerrada o fase cerrada.

## Referencias rapidas

- App original (solo lectura): `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- Produccion: <https://reca-inclusion-laboral-nuevo.vercel.app>
- Notion canonico: `10 - Estado actual`, `20 - Pendientes priorizados`, `30 - QA y validacion`, `40 - Iniciativas y decisiones`, `50 - Formularios y migracion`
