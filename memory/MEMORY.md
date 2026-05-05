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
- **ODS** (PO Aaron + Claude PO asistente): motor en produccion. Sweep tech-debt completo abril-mayo 2026. **Telemetria activa** (~25 filas iniciales analizadas el 5 mayo). **Tanda 3a discovery cerrada** (Epic #122, PR #137). **Tanda 3a fixes incrementales: 8 de 9 cerrados** — Grupo A LSC aliases (PR #142), Grupo B evaluacion alias (PR #143), Grupo C tarifas determinismo (PR #144), Grupo D visita fallida (PR #145), Grupo F buckets import (PR #150). **Bundle telemetria hotfixes** (#146/#147/#148, PR #149) detectado y cerrado tras revision PO de tablas Supabase. **Solo falta Grupo E (#135 inferencia modalidad) para cerrar Tanda 3a completa**. Hotfixes #138/#140 (catalogo Hipoacusia + Seleccion genero/discapacidad payload_normalized) mergeados PR #141. Issue #139 (parser PDF discapacidad) pausado en Backlog esperando reporte de jannette/jancam. LSC operativo end-to-end excepto modelo 1:N (#109): motor lee discapacidad/genero desde `usuarios_reca` post-#141 sin requerir captura UI nueva en LSC; edge case persona LSC sin Seleccion previa = manual.
- **Expansion v2**: E0 Roles, E1 Shell+sidebar, E2A Empresas backoffice, E2B Profesionales, QA Fases 1-5, E2C Catalogos, E2D Performance/Egress, E3.1, E3.3, E3.4b, E3.5b/c/d en produccion. E3.4a/E3.4a.2 inventario+contrato cerrado.
- **Issues radar (no en milestone)**: #109 interpretes cross-modulo (LSC integration con motor + modelo 1:N), #110 ODS sombra automatica al finalizar `payload_normalized`. Atacar despues del motor confiable. **Tech-debt #151 nuevo** (auditar duplicacion `selectionPdfParser.ts` vs `generalPdfParser.ts`, baja prioridad post-Tanda 3a).
- **Pendientes follow-up**: #116 investigacion PO Seguimientos sobre warnings funcionales en `SeguimientosBaseStageEditor`. **#139 pausado**: parser PDF discapacidad de Seleccion Incluyente, esperando reporte operacional de jannette.

## Siguiente foco recomendado

- **ODS (proximo paso inmediato Tanda 3a)**: arrancar Grupo E (#135 inferencia modalidad incremental) — el ultimo de los 9 sub-issues. Brief PO pendiente debe incluir: (a) scope cuidadoso por riesgo declarado en F4 (8 ramas afectadas, recategorizar a feature-nueva si requiere heuristicas para mas de 3-4 ramas); (b) deuda anotada en #135 sobre evaluar reemplazar `Set odsKinds` hardcodeado en `inferModalidad` (`rulesEngine.ts:684-688`) con helpers tipo `isAccessibilityAssessmentKind`/`isInterpreterServiceKind` para eliminar deuda futura de sincronizacion manual; (c) cobertura observada en telemetria real (5 mayo): 2/25 filas (8%) con `motor_codigo: null` cuando final tenia codigo `86` — confirma que el gap existe en data real. Decision PO Aaron mayo 2026: arrancar ya en lugar de esperar mas telemetria.
- **ODS (post-Tanda 3a)**: revisar tablas `ods_motor_telemetria` post-merge bundle telemetria #149 para confirmar que match exacto sube significativamente (antes 0% por falso positivo de `alternatives`). Esperar ~24-48h para acumular data nueva.
- **ODS (post-Tanda 3a o mas adelante)**: brief PO formal para #109 LSC integration con modelo 1:N. Decision pendiente de owner.
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
