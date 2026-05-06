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
- **Seguimientos** (PO distinto al de ODS): restructure UX F0-F4 cubierta. Milestone GitHub `Cerrar Seguimientos v1` con F1 #53 + F2 #54 + F3 #55 cerrados (PR #159 mayo 6, 2026); siguiente epic F4 #56 polish (6 childs: #47, #48, #49, #50, #93, #116). No iniciar epic sin brief PO.
- **ODS** (PO Aaron + Claude PO asistente): motor en produccion. Sweep tech-debt completo abril-mayo 2026. **Telemetria activa** (~32 filas analizadas el 6 mayo). **Tanda 3a completa 9/9** (Epic #122, discovery PR #137): Grupo A LSC aliases (PR #142), Grupo B evaluacion alias (PR #143), Grupo C tarifas determinismo (PR #144), Grupo D visita fallida (PR #145), Grupo E refactor preventivo helper modalidad (PR #153), Grupo F buckets import (PR #150). **Bundle telemetria hotfixes** (#146/#147/#148, PR #149) detectado y cerrado tras revision PO de tablas Supabase. **Decision PO Grupo E mayo 2026 (Aaron)**: brief F4 original (4-6h heuristicas nuevas) acotado a refactor preventivo (1-2h) tras revision telemetria real — `inferModalidad` funciona en 29/32 filas (90.6%); las 3 con mismatch son LSC fuera de scope #135 (1 ya cubierta por bundle PR #149; 2 son gaps de pipeline LSC: deteccion `document_kind` upstream + acceso a horas LSC al motor). PR #153 consolida `Set odsKinds` hardcoded en helper `isOdsModalityRequiredKind` con cero cambios funcionales. Hotfixes #138/#140 (catalogo Hipoacusia + Seleccion genero/discapacidad payload_normalized) mergeados PR #141. Issue #139 (parser PDF discapacidad) pausado en Backlog esperando reporte de jannette/jancam. LSC operativo end-to-end excepto modelo 1:N (#109): motor lee discapacidad/genero desde `usuarios_reca` post-#141 sin requerir captura UI nueva en LSC; edge case persona LSC sin Seleccion previa = manual.
- **Expansion v2**: E0 Roles, E1 Shell+sidebar, E2A Empresas backoffice, E2B Profesionales, QA Fases 1-5, E2C Catalogos, E2D Performance/Egress, E3.1, E3.3, E3.4b, E3.5b/c/d en produccion. E3.4a/E3.4a.2 inventario+contrato cerrado.
- **Empresas** (PO distinto al de ODS y Seguimientos, antes solo QA): modulo en produccion via fases E2A/E2B/E2C/E2D/E3.x de Expansion v2. Milestone GitHub `Empresas General Work` (#3) abre frente continuo. **#158 discovery cerrado mayo 6, 2026**: audit canonico en `docs/empresas_performance_audit.md`. **Tanda 1 implementada y mergeada** en branch `codex/empresas-tanda-1` con 4 sub-issues acumulados (PR `Closes #162, #163, #164, #165`). Hallazgos clave: F2 #162 bug global ciclo de vida (`finalizado_at_iso` columna inexistente; introducido por auditoria E3.5b post-fixes anterior) corregido. F1 #163 giro de narrativa: NO era bug funcional, era ruido de telemetria (400 de validacion Zod reportados como `server_error_response`); fix con whitelist explicita en confirmation layer. F3 #164 fallback defensivo a `/api/formularios/finalization-status` con max 3 intentos y `retryAfterSeconds` capeado a 30s; telemetria `confirmation_failed_after_poll` preservada Opcion A. F5 #165 `Sentry.setUser()` activo via `HubSentryUserContext`. Andrea confirmo caso de control (10-15s, sin errores) validando umbral psicologico 25-30s. **Tanda 2 (F4 panel Sandra) baja prioridad**: con F1+F3 cerrados, sintomas Sandra deberian reducir; reabrir solo si persisten. **Tanda 3 deuda separada**: F6 #85 (265 NITs duplicados + 382 sin profesional + 10 NULL), F8 React loop, F9 auth huerfano. **Latentes**: F7 lentitud sistematica finalizacion (mediana 25s), F10 acta tras footer (scope ODS). **7 issues tech-debt abiertos** post-QA: #166 schema validation cross-repo, #167 Date.parse NaN timestamp without TZ, #168 nombre_empresa overquery, #169 fallback timeout por intento, #170 consolidar `readNonEmptyString`, #171 Sentry email fallback a auth.users.email, #172 telemetria network errors initial response. Cross-cutting sin milestone (PO Empresas decide absorber): #156 consolidar `findEmpresasByNit`/`listActiveEmpresasByNit` (cross con Seguimientos), #88 `useFocusTrap`/`useFocusRestore` shared. E3.4c calendario UI sigue pendiente sin issue.
- **Issues radar (no en milestone)**: #109 interpretes cross-modulo (LSC integration con motor + modelo 1:N), #110 ODS sombra automatica al finalizar `payload_normalized`. Atacar despues del motor confiable. **Tech-debt post-Tanda 3a (baja prioridad)**: #151 auditar duplicacion `selectionPdfParser.ts` vs `generalPdfParser.ts`; duplicacion `pipeline.ts:263-265` `isInterpreterServiceDocumentKind` reusar `isInterpreterServiceKind` canonico de `rulesEngine.ts:67-69`; falta linkage TS entre branches manejadas en `suggestServiceFromAnalysis` y `ODS_MODALITY_REQUIRED_KINDS` (riesgo de drift silencioso si se agrega rama nueva al motor sin actualizar el Set).
- **Pendientes follow-up**: **#139 pausado**: parser PDF discapacidad de Seleccion Incluyente, esperando reporte operacional de jannette.

## Siguiente foco recomendado

- **ODS (post-Tanda 3a inmediato)**: revisar tablas `ods_motor_telemetria` ~24-48h despues del merge de Bundle PR #149 + PR #153 (Grupo E), confirmar que match exacto sube de la baseline (antes 0% por falso positivo `alternatives` ya removido del SQL helper). Si sube significativamente, abrir Tanda 3b dirigida por mismatch fields reales. Si sigue dominado por LSC, priorizar fix dirigido al pipeline LSC (deteccion `document_kind` upstream + acceso a horas LSC al motor) — los 2 casos LSC con mismatch en data del 6 mayo son distintos al scope de #135 y necesitan brief separado.
- **ODS (post-Tanda 3a o mas adelante)**: brief PO formal para #109 LSC integration con modelo 1:N. Decision pendiente de owner.
- **ODS (tech-debt latente)**: capturado en `roadmap.md` seccion ODS post-Grupo E. No bloquea, pero cualquier brief futuro que toque pipeline o motor deberia considerarlo para no introducir mas drift.
- Para Seguimientos (PO distinto al de ODS), F1 #53 + F2 #54 + F3 #55 cerrados (PR #159 mayo 6, 2026). Siguiente epic F4 #56 polish con 6 childs: #47 copy-forward excludePaths, #48 FormField label vacio, #49 clearCriticalBannerStates helper, #50 test wiring lastCommittedUpdatedAtRef, #93 in-flight guard double submit, #116 cleanup props/components muertos. No iniciar epic sin brief PO.
- Para Empresas (PO distinto al de ODS y Seguimientos), Tanda 1 cerrada mayo 6, 2026 (PR Closes #162-#165). 7 tech-debt issues #166-#172 quedan en backlog. **Siguiente foco recomendado**: monitorear Sentry `JAVASCRIPT-NEXTJS-P` 7-14 dias post-merge para confirmar reduccion de volumen (whitelist F1 debe llevar volumen cercano a 0). Validar que `Sentry.setUser()` aparece en eventos posteriores con `user.id` populado. Si Sandra sigue reportando sintomas, reabrir Tanda 2 (F4). No empujar E3.4c calendario hasta confirmar estabilizacion post-Tanda 1. Tanda 3 deuda data #85/F6 (265 NITs duplicados, 382 sin profesional) candidato natural cuando se necesite cleanup operativo.
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
