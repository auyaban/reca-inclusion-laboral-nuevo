---
name: Workflow del Dev en sesiones PO-Dev
description: Cuando el Dev trabaja en flujo PO-Dev-QA dual, define cuando y donde actualiza issues, docs y memoria.
type: feedback
---

Cuando una sesion opera con un PO que envia briefs y un Dev que los implementa, el Dev sigue este patron de actualizacion. PO actualiza memoria/roadmap; Dev actualiza GitHub y docs canonicas tecnicas.

## Ciclo por issue

1. **Dev recibe brief del PO.** Lee el issue, lee solo los archivos de codigo relevantes (no exploracion amplia), redacta plan corto. NO actualiza nada en GitHub todavia.
2. **Dev entrega plan al PO.** El plan no se publica en GitHub; vive solo en el chat hasta aprobacion. Si el PO veta o pide ajustes, itera.
3. **Plan aprobado: Dev implementa** en una rama nueva (`fix/ods-...`, `feat/ods-...`, etc.). Tests + lint + build verdes localmente antes de declarar checkpoint.
4. **Dev declara checkpoint al PO** con resumen de cambios y archivos tocados. NO cierra el issue, NO abre PR todavia.
5. **PO corre QA dual** (code-reviewer + arquitectura). Devuelve aprobado / ajustes / vetado.
6. **Si QA pide ajustes:** Dev itera, vuelve al paso 4.
7. **PO da luz verde para integrar:** Dev abre PR contra `main`, vincula con `Closes #N` (o `Closes #N1, Closes #N2` si toca varios issues), CI verde.
8. **PR merged:** GitHub auto-cierra los issues vinculados.

## Que actualiza el Dev y donde

### En el PR (paso 7)

- Cuerpo del PR: resumen + lista `Closes #N`.
- Si la implementacion toca **docs canonicas tecnicas**, el Dev las actualiza **en el mismo PR**:
  - `docs/ods_migration_inventory.md` solo si una decision cerrada cambia. Si el Dev cree que debe cambiar, lo plantea al PO en el plan, no en el PR.
  - `docs/ods_motor_telemetria.md` (cuando #66 se implemente) en cualquier cambio que afecte la interpretacion.
  - `memory/forms_catalog.md` si el formulario afectado cambia su estado (preview/produccion/QA pendiente).
  - Tests, types, schemas si la implementacion los requiere (obvio, pero explicito).
- **NO** actualiza `memory/MEMORY.md` ni `memory/roadmap.md`. Esos los lleva el PO.

### En GitHub (post-merge, paso 8)

- Si el issue es **sub-issue de un epic con checklist**, el checklist del epic se marca solo (porque GitHub lo hace al cerrar via `Closes #N` cuando el item del checklist es la URL exacta del issue). Si no se marca, el Dev lo marca manualmente.
- Si la implementacion **revelo deuda fuera de scope**: el Dev abre **issue nuevo** con labels apropiados (`ods` + `tech-debt` o lo que corresponda) y referencia el PR de origen. NO arregla deuda silenciosamente en el PR original.
- Si la implementacion **cambio el scope** del issue durante la ejecucion (con aprobacion del PO): Dev agrega comentario al issue cerrado describiendo la diferencia entre lo planeado y lo entregado.

### Post-deploy a prod

- Si el issue dice "inicio: dia del merge a produccion" (caso telemetria #69 y subs): Dev confirma que la env var correspondiente (`ODS_TELEMETRY_START_AT`) quedo configurada en Vercel Production y agrega comentario al epic con la fecha exacta de inicio.

## Que NO hace el Dev

- No actualiza `memory/MEMORY.md`, `memory/roadmap.md`, ni archivos `feedback_*.md`. Eso es responsabilidad del PO.
- No cierra issues a mano antes del merge.
- No fixea deuda fuera del scope acordado en el plan, salvo que el PO lo apruebe explicitamente.
- No actualiza el inventario ODS unilateralmente; lo plantea al PO.
- No hace push a `main` directamente; siempre via PR.
- No hace force-push, `--no-verify`, ni amend de commits ya pusheados sin instruccion explicita.

## Que hace el PO en respuesta

- **Al cierre de un issue/epic:** actualiza `memory/MEMORY.md` (estado actual breve) y `memory/roadmap.md` (siguiente orden) si aplica.
- **Al cierre de la epica:** decide si hay material para Notion canonico (`10 - Estado actual` o `20 - Pendientes priorizados`).
- **Al detectar deuda recurrente en QA dual:** la captura como issue nuevo o nota en roadmap.

## Why

El Dev se concentra en codigo y GitHub; el PO se concentra en memoria, plan y direccion. Si los dos escriben memoria, generan conflicto. Si el Dev cierra issues a mano, se pierde el binding `Closes #N` que enlaza commits con issues en GitHub.
