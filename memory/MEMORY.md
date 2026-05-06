## Memory Index - RECA Inclusion Laboral (Web)

RECA es la empresa. Este repo (`reca-inclusion-laboral-nuevo`) es la app web del modulo Inclusion Laboral. RECA tendra mas apps y mas POs; este indice aplica solo a este repo.

**Punto de partida obligatorio:** [`session_contract.md`](session_contract.md). Define roles, expectativas, excepcion hotfix y anclas externas.

## Anclas externas

- Milestone ODS general (frente vivo de ODS): <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/2>
- Milestone Empresas General Work (frente vivo de Empresas): <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/3>
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
- **Seguimientos** (PO distinto al de ODS): restructure UX F0-F4 cubierta. Milestone GitHub `Cerrar Seguimientos v1` cerrado mayo 6, 2026 (21/21): F1 #53 + F2 #54 + F3 #55 + F4 #56 (PR #161). Sin frente Seguimientos abierto. Pendientes backlog (sin milestone): #156 consolidar `findEmpresasByNit`/`listActiveEmpresasByNit`, #157 cspell `Justificacion`, #88 `useFocusTrap`/`useFocusRestore` shared cross-modulo, #109 LSC modelo 1:N (cross con ODS, post-Tanda 3a). No reabrir epic Seguimientos sin brief PO nuevo.
- **ODS** (PO Aaron + Claude PO asistente): motor en produccion. Sweep tech-debt completo abril-mayo 2026. **Telemetria activa** (~32 filas analizadas el 6 mayo). **Tanda 3a completa 9/9** (Epic #122, discovery PR #137): Grupo A LSC aliases (PR #142), Grupo B evaluacion alias (PR #143), Grupo C tarifas determinismo (PR #144), Grupo D visita fallida (PR #145), Grupo E refactor preventivo helper modalidad (PR #153), Grupo F buckets import (PR #150). **Bundle telemetria hotfixes** (#146/#147/#148, PR #149) detectado y cerrado tras revision PO de tablas Supabase. **Decision PO Grupo E mayo 2026 (Aaron)**: brief F4 original (4-6h heuristicas nuevas) acotado a refactor preventivo (1-2h) tras revision telemetria real — `inferModalidad` funciona en 29/32 filas (90.6%); las 3 con mismatch son LSC fuera de scope #135 (1 ya cubierta por bundle PR #149; 2 son gaps de pipeline LSC: deteccion `document_kind` upstream + acceso a horas LSC al motor). PR #153 consolida `Set odsKinds` hardcoded en helper `isOdsModalityRequiredKind` con cero cambios funcionales. Hotfixes #138/#140 (catalogo Hipoacusia + Seleccion genero/discapacidad payload_normalized) mergeados PR #141. Issue #139 (parser PDF discapacidad) pausado en Backlog esperando reporte de jannette/jancam. LSC operativo end-to-end excepto modelo 1:N (#109): motor lee discapacidad/genero desde `usuarios_reca` post-#141 sin requerir captura UI nueva en LSC; edge case persona LSC sin Seleccion previa = manual.
- **Expansion v2**: E0 Roles, E1 Shell+sidebar, E2A Empresas backoffice, E2B Profesionales, QA Fases 1-5, E2C Catalogos, E2D Performance/Egress, E3.1, E3.3, E3.4b, E3.5b/c/d en produccion. E3.4a/E3.4a.2 inventario+contrato cerrado.
- **Empresas** (PO distinto al de ODS y Seguimientos, antes solo QA): modulo en produccion via fases E2A/E2B/E2C/E2D/E3.x de Expansion v2. Milestone GitHub `Empresas General Work` (#3) abre frente continuo. **Prioridad inmediata**: #158 P0 discovery — investigar performance del panel Gerencia + Profesional (lentitud entre ventanas + CRUD). Reportado por gerencia mayo 2026. Otros issues en milestone: #85 data cleanup NITs duplicados. Cross-cutting sin milestone (PO Empresas decide absorber): #156 consolidar `findEmpresasByNit`/`listActiveEmpresasByNit` (cross con Seguimientos), #88 `useFocusTrap`/`useFocusRestore` shared. E3.4c calendario UI sigue pendiente sin issue.
- **Issues radar (no en milestone)**: #109 interpretes cross-modulo (LSC integration con motor + modelo 1:N), #110 ODS sombra automatica al finalizar `payload_normalized`. Atacar despues del motor confiable. **Tech-debt post-Tanda 3a (baja prioridad)**: #151 auditar duplicacion `selectionPdfParser.ts` vs `generalPdfParser.ts`; duplicacion `pipeline.ts:263-265` `isInterpreterServiceDocumentKind` reusar `isInterpreterServiceKind` canonico de `rulesEngine.ts:67-69`; falta linkage TS entre branches manejadas en `suggestServiceFromAnalysis` y `ODS_MODALITY_REQUIRED_KINDS` (riesgo de drift silencioso si se agrega rama nueva al motor sin actualizar el Set).
- **Pendientes follow-up**: **#139 pausado**: parser PDF discapacidad de Seleccion Incluyente, esperando reporte operacional de jannette.

## Siguiente foco recomendado

- **ODS (post-Tanda 3a inmediato)**: revisar tablas `ods_motor_telemetria` ~24-48h despues del merge de Bundle PR #149 + PR #153 (Grupo E), confirmar que match exacto sube de la baseline (antes 0% por falso positivo `alternatives` ya removido del SQL helper). Si sube significativamente, abrir Tanda 3b dirigida por mismatch fields reales. Si sigue dominado por LSC, priorizar fix dirigido al pipeline LSC (deteccion `document_kind` upstream + acceso a horas LSC al motor) — los 2 casos LSC con mismatch en data del 6 mayo son distintos al scope de #135 y necesitan brief separado.
- **ODS (post-Tanda 3a o mas adelante)**: brief PO formal para #109 LSC integration con modelo 1:N. Decision pendiente de owner.
- **ODS (tech-debt latente)**: capturado en `roadmap.md` seccion ODS post-Grupo E. No bloquea, pero cualquier brief futuro que toque pipeline o motor deberia considerarlo para no introducir mas drift.
- Para Seguimientos (PO distinto al de ODS), milestone v1 cerrado mayo 6, 2026 (F1+F2+F3+F4 todos cerrados, 21/21). Sin frente abierto. Pendientes backlog sin milestone: #156, #157, #88 (cross-modulo), #109 (cross con ODS). No reabrir sin brief PO nuevo.
- Para Empresas (PO distinto al de ODS y Seguimientos), arrancar discovery #158 (performance panel Gerencia + Profesional). Sub-issues incrementales estilo Tanda 3a tras diagnostico medido. No empujar E3.4c calendario hasta que el panel base este optimo.
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
