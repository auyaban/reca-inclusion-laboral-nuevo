## Memory Index - RECA Inclusion Laboral (Web)

Leer `MEMORY.md` y solo un archivo adicional segun la tarea.

## Canonico minimo

| Archivo | Cuando leerlo |
|---|---|
| [../docs/expansion_v2_plan.md](../docs/expansion_v2_plan.md) | Trabajo en sidebar, modulo Empresas, ciclo de vida, calendario o roles (plan PO vivo) |
| [../docs/ods_migration_inventory.md](../docs/ods_migration_inventory.md) | Migracion legacy ODS al modulo nuevo: crear entrada + importar acta + motor de codigos (inventario UNIFICADO con decisiones cerradas) |
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
- Expansion v2 E0 Roles completada: `profesional_roles` aplicado en Supabase remoto con 4 `inclusion_empresas_admin` y guard de verificacion.
- Expansion v2 E1 Shell + sidebar implementada localmente: `/hub` y subrutas quedan envueltas por sidebar persistente; formularios quedan fuera del shell.
- Expansion v2 E2A Empresas backoffice completada post-QA: `/hub/empresas` renderiza por rol, admins ven backoffice con Empresas activa, CRUD server-side, soft delete, actividad reciente, policy SELECT explícita y defensas server-side para cambios de estado.
- Expansion v2 E2B Profesionales gerencia cerrada post-QA local: CRUD, acceso Auth automático, roles `Admin Inclusión`/`Profesional Inclusión`, contraseña temporal obligatoria, soft delete/restauración, auditoría y defensas server-side para autoeliminación, vínculos Auth duplicados y APIs con contraseña temporal.
- Expansion v2 QA manual Fases 1/2 completada: botón `Nuevo profesional` cubierto, textos visibles de Empresas corregidos, escrituras nuevas de Empresas normalizadas server-side y migración remota conservadora aplicada para variantes seguras de `estado`/`caja_compensacion`.
- Expansion v2 QA manual Fase 3/3.1 cerrada para avanzar: crear/editar Empresa muestra errores visibles, exige datos operativos completos, normaliza teléfonos, permite eliminar contactos adicionales, desactiva autocomplete intrusivo y mejora el filtro de Profesionales. Hallazgos menores pasan a Fase 4.
- Expansion v2 QA manual Fase 4 implementada localmente: sorting reusable por headers en Empresas/Profesionales, ciudad con ortografía conservadora, actividad reciente más útil, guardado de observaciones corregido y primer contacto alineado.
- Expansion v2 QA manual Fase 5 validada y enviada a producción: `/hub/empresas*` usa capa visual backoffice reusable con contraste alto, acentos RECA/legacy, headers, cards, badges, feedback, tablas coherentes con el hub de formularios y placeholders guía; el polish final corrigió mensajes duplicados, export reusable, detalle de eliminación y hard gate para que sólo `inclusion_empresas_admin` vea el módulo en producción inicial.
- Expansion v2 E2C Catálogos simples implementada con migración remota aplicada y QA de código cerrado: Asesores, Gestores e Intérpretes quedan activos para `inclusion_empresas_admin`, con CRUD admin-only, soft delete, sorting reusable, APIs server-side, `localidad` visible en Asesores, llave estable nueva para Gestores, catálogos públicos filtrando eliminados y mutaciones inexistentes respondiendo 404.
- Expansion v2 E2D Performance y Egress cerrada localmente antes de E3: feedback visual y compatibilidad legacy, listado liviano, catálogos por RPC con migración remota alineada, asesores activos, búsqueda reducida, auditoría de consumidores browser/directos, filtros `deleted_at` en autocomplete/lookups y proyección de egress bajo el gate.
- Expansion v2 E3.1 implementada y aplicada en Supabase remoto: migración de eventos profesionales y RPCs transaccionales server-only para reclamar, soltar, cambiar estado y agregar notas; post-QA agrega bloqueo de fila en notas para alinear las mutaciones de ciclo de vida.
- Expansion v2 E3.3 enviada a produccion: UI profesional de Empresas con home operativo, `Mis empresas`, buscador interno de empresas activas, detalle read-only en nueva pestaña, notas explicitas y acciones de asignacion/liberacion; migracion remota aplicada para resumen liviano y ultimo formato desde `formatos_finalizados_il`; `E3_3_ASSIGNMENT_ALERTS_START_AT` configurado en Vercel Production.
- Expansion v2 E3.5a cerrada en worktree aislado `codex/e3-profesionales-empresas`: inventario read-only de `formatos_finalizados_il.payload_normalized` reviso 403 registros agregados, confirmo base suficiente para motor read-only del arbol y documento llaves por empresa, perfil, persona, Compensar/No Compensar y evidencia sin clasificar.
- Expansion v2 E3.5b/E3.5c enviadas a produccion: motor/API read-only conservador para ciclo de vida y primera UI simple en pagina propia `/hub/empresas/[id]/ciclo-vida`, con contrato tipado sin payload crudo, secciones plegables, ramas de empresa/perfil/persona, evidencia sin clasificar, ramas archivadas y warnings de calidad.
- Expansion v2 E3.5d enviada a produccion y smoke verde: `/hub/empresas/[id]/ciclo-vida` muestra el ciclo de vida read-only como timeline vertical guiado, con ramas simples de perfiles/personas, conectores CSS y plegables con boton/chevron; no cambia motor, API, permisos, formularios ni migraciones.
- Expansion v2 E3.4a cerrada como inventario read-only: tarifas, motor ODS y `payload_normalized` respaldan una matriz operativa de servicios/proyecciones; siguiente foco E3.4b modelo/API server-side.

## Siguiente foco recomendado

- Planear E3.4b con Aaron: modelo/API server-side de proyecciones y catalogo versionado de servicios proyectables.
- Esperar una semana de uso y luego correr `npm run finalization:baseline -- --days 30 --limit 100`, separando `reused_ready`, `inline_cold` e `inline_after_*`.
- Crear plan de Fase 8 solo con formularios donde el beneficio esperado sea claro y medible.
- Mantener separado el QA pendiente de `visita fallida`, borradores y autosave; no mezclar esos hallazgos con rollout de prewarm.

## Reglas duras

- `MEMORY.md` no guarda historial, previews viejos ni changelog de PRs.
- `roadmap.md` solo guarda frentes abiertos, decisiones activas y siguiente orden.
- `forms_catalog.md` es la unica verdad local del estado por formulario.
- No crear `.md` por PR, preview, checklist de QA cerrada o fase cerrada.
- Al iniciar una fase de expansion, detener cualquier proceso local en `localhost:3000`; se asume que el QA/browser anterior ya termino.

## Referencias rapidas

- App original (solo lectura): `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- Produccion: <https://reca-inclusion-laboral-nuevo.vercel.app>
- Notion canonico: `10 - Estado actual`, `20 - Pendientes priorizados`, `30 - QA y validacion`, `40 - Iniciativas y decisiones`, `50 - Formularios y migracion`
