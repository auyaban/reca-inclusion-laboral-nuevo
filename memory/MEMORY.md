## Memory Index - RECA Inclusion Laboral (Web)

RECA es la empresa. Este repo (`reca-inclusion-laboral-nuevo`) es la app web del modulo Inclusion Laboral. RECA tendra mas apps y mas POs; este indice aplica solo a este repo.

**Punto de partida obligatorio:** [`session_contract.md`](session_contract.md). Define roles, expectativas, excepcion hotfix y anclas externas.

## Anclas externas

- Milestone ODS general (frente vivo de ODS): <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/2>
- Board RECA (canvan global del repo): <https://github.com/users/auyaban/projects/2/views/2>
- Produccion: <https://reca-inclusion-laboral-nuevo.vercel.app>
- App original (solo lectura): `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`
- Notion canonico: `10 - Estado actual`, `20 - Pendientes priorizados`, `30 - QA y validacion`, `40 - Iniciativas y decisiones`, `50 - Formularios y migracion`

## Canonico minimo

Leer `MEMORY.md` y solo el archivo adicional segun la tarea o el rol.

| Archivo | Cuando leerlo |
|---|---|
| [`session_contract.md`](session_contract.md) | Inicio de toda sesion. Roles, expectativas, anclas. |
| [`po_dev_protocol.md`](po_dev_protocol.md) | Sesion estructurada PO-Dev. Ciclo, briefs, QA dual, hotfix. |
| [roadmap.md](roadmap.md) | Frentes activos, decisiones vigentes, siguiente orden. |
| [architecture.md](architecture.md) | Cambios de arquitectura, drafts/finalizacion shared. |
| [supabase_integration.md](supabase_integration.md) | Auth, datos o API routes de Supabase. |
| [google_integration.md](google_integration.md) | Google Sheets, Drive, PDF. |
| [notion_workflow.md](notion_workflow.md) | Lectura/escritura en Notion. |
| [user_profile.md](user_profile.md) | Primera sesion o dudas sobre el usuario. |
| [../docs/expansion_v2_plan.md](../docs/expansion_v2_plan.md) | Sidebar, modulo Empresas, ciclo de vida, calendario, roles. |
| [../docs/ods_motor_telemetria.md](../docs/ods_motor_telemetria.md) | Vista admin de telemetria ODS, traducir hallazgos en fixes. |
| [../docs/ods_integration_tests.md](../docs/ods_integration_tests.md) | Cobertura integration gated de RPCs/contratos ODS. |
| [../docs/ods_migration_inventory.md](../docs/ods_migration_inventory.md) | Inventario canonico de drifts ODS y RPCs server-only. |

## Estado vivo (sin historico)

- **Formularios activos**: migrados. `evaluacion` solo Sheet, sin PDF (decision producto). `interprete-lsc` migrado, sin frente especial. `visita fallida` local en long forms estandar, QA manual pendiente.
- **Drafts/finalizacion/prewarm**: Fases 0-7 completas. Fase 8 a planear con datos reales tras una semana de uso.
- **Borradores**: hub elimina optimistamente + soft-delete remoto. UI admin minima en `/hub/admin/borradores` para `aaron_vercel`.
- **Seguimientos** (PO distinto al de ODS): restructure UX F0-F4 cubierta. Milestone GitHub `Cerrar Seguimientos v1` con F1 #53 cerrado; siguiente epic F2 #54, luego F3 #55, F4 #56. No iniciar epic sin brief PO.
- **ODS** (PO Aaron): motor en produccion. Sweep tech-debt completo en mayo 2026. Telemetria silenciosa activa pendiente de owner activar `ODS_TELEMETRY_START_AT` post-#106 merge. jancam validara guardado de ODS post-fix.
- **Expansion v2**: E0 Roles, E1 Shell+sidebar, E2A Empresas backoffice, E2B Profesionales, QA Fases 1-5, E2C Catalogos, E2D Performance/Egress, E3.1, E3.3, E3.4b, E3.5b/c/d en produccion. E3.4a/E3.4a.2 inventario+contrato cerrado.
- **Issues radar (no en milestone)**: #109 interpretes cross-modulo, #110 ODS sombra automatica al finalizar `payload_normalized`. Atacar despues del motor confiable.
- **Pendientes follow-up**: #116 investigacion PO Seguimientos sobre warnings funcionales en `SeguimientosBaseStageEditor`.

## Siguiente foco recomendado

- Para Seguimientos, esperar brief PO y arrancar F2 #54 UX consistency finalizacion. Luego F3 #55 y F4 #56.
- Planear E3.4c: UI calendario profesional con vistas mensual/semanal/diaria sobre la base server-side de proyecciones ya desplegada.
- Esperar una semana de uso post-Fase 7 y correr `npm run finalization:baseline -- --days 30 --limit 100`. Comparar `reused_ready` vs `inline_cold` vs `inline_after_*`.
- Planear Fase 8 solo con formularios donde el beneficio esperado sea claro y medible.
- Tras ~30 dias de telemetria ODS activa, abrir Tanda 3 dirigida por mismatch fields reales del motor.
- Mantener QA de `visita fallida`, borradores y autosave como frentes separados del rollout de prewarm.

## Reglas duras

- `MEMORY.md` no guarda historial, previews viejos ni changelog de PRs.
- `roadmap.md` solo guarda frentes abiertos, decisiones activas y siguiente orden.
- No crear `.md` por PR, preview, checklist de QA cerrada o fase cerrada.
- El changelog de PRs cerrados vive en GitHub (PR list, milestone, board). No duplicar aqui.
- Al iniciar una fase de expansion, detener cualquier proceso local en `localhost:3000`.
- Cambios al contrato (`session_contract.md`, `po_dev_protocol.md`) los aprueba Aaron y solo aplican post-acuerdo.
