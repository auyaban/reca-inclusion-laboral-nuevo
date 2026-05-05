---
name: Protocolo PO-Dev-QA dual
description: Ciclo completo PO -> brief -> Dev plan -> veto -> implementacion -> checkpoint -> QA dual -> integracion. Estilo de briefs, division de responsabilidades, excepcion hotfix. Consolida los antiguos feedback_po_workflow, feedback_dev_workflow y feedback_po_brief_style.
type: protocol
---

Aplica cuando la sesion opera con un PO que escribe briefs y un Dev que los implementa. Para roles, expectativas globales y excepciones, ver `session_contract.md`.

## Ciclo PO-Dev-QA dual

1. **PO escribe brief y prepara GitHub.** Crea/actualiza issues, mueve items en board, asigna labels y milestone. Ver `Estilo del brief PO` mas abajo. El Dev no toca GitHub.
2. **Dev investiga y propone plan v1.** El Dev puede delegar a sub-agentes (`Explore`, `feature-dev:code-explorer`, `feature-dev:code-architect`, `general-purpose`) para diagnosticar root cause y mapear arquitectura. El plan v1 incluye diagnostico, diseno propuesto, tests, riesgos, estimacion en rangos. **No** se publica en GitHub; vive en el chat.
3. **PO veta el plan v1.** Aprueba, ajusta o rechaza. Si el Dev se aparto de la recomendacion del PO, evalua la justificacion en el plan, no la inercia. Si el plan v1 divergio mucho, PO devuelve a plan v2.
4. **Plan aprobado: Dev implementa en worktree nuevo** desde `main` (`worktree/<frente>` o nombre acordado). Crea modulos, notas, archivos dentro del worktree segun necesite. **No branch directa al repo principal.** Tests + lint + build verdes localmente. Excepcion: hotfix/P0 trabajan como branch directa (`hotfix/...`) sin worktree.
5. **Dev declara checkpoint** al PO con resumen + archivos tocados + evidencia de tests (incluyendo no-fantasma cuando aplique). Commits y pushes ocurren dentro del worktree (al remoto del branch del worktree). NO abre PR.
6. **PO lanza QA dual** (mismo mensaje, dos `Agent` tool uses en paralelo):
   - `feature-dev:code-reviewer`: bugs, seguridad, calidad, convenciones del repo.
   - `feature-dev:code-explorer` o `general-purpose`: consistencia con patrones, side effects, integracion con modulos vecinos, deuda introducida.
7. **PO sintetiza** ambos reportes en una sola guia al Dev: aprobado tal cual / ajustes requeridos / vetado.
8. **Si QA pide ajustes:** Dev itera dentro del mismo worktree, vuelve a paso 5.
9. **Frente acumula sub-issues completos en el worktree.** El mismo worktree puede contener multiples sub-issues completados de un epic (ej. F1+F2+F3+F4 de Tanda 3a). Cada sub-issue cumple ciclo paso 2-7 antes de pasar al siguiente, pero todos comparten branch.
10. **Cuando el frente este listo: PO abre PR** contra `main`, vincula con `Closes #N1, Closes #N2, ...` (todos los sub-issues acumulados), CI verde, mergea. **El Dev no abre el PR.**
11. **PR merged:** GitHub auto-cierra issues. PO actualiza `MEMORY.md` y `roadmap.md` si aplica. PO mueve items en board a Done.

## Excepcion hotfix

Hotfix = bug P0 reportado por usuario real en produccion.

- **Sin veto largo de plan.** Brief minimo, Dev arranca rapido.
- **Branch directa desde `main` original (`hotfix/...`), no worktree.** El overhead de worktree no aplica a hotfix; queremos workflow corto-vivo: branch -> commit -> push -> PO abre PR rapido -> merge.
- **QA dual queda a criterio del PO.** Si el fix es chico/obvio, PO puede aprobar sin QA dual; si sospecha estructura, lanza QA dual.
- **Integridad obligatoria**: el fix arregla el problema real. No parche cosmetico. Si el bug es estructural, hotfix queda como mitigacion + se abre tech-debt para fix definitivo.
- **No-fantasma test obligatorio** para el caso reportado: revertir el fix debe producir FAIL real. Aunque el resto del workflow se aceleren, este paso no se salta.
- Tras merge, PO actualiza `MEMORY.md`/`roadmap.md` con el incidente y el fix.

## Division de responsabilidades

### Dev hace

- Investigar (lectura de codigo, agentes de exploracion si lo amerita).
- Diagnosticar root cause.
- Proponer diseno con libertad en HOW; contraproponer si el brief asume mal.
- Implementar en **worktree nuevo** desde `main`. Crear modulos, notas, archivos dentro del worktree segun necesite. Excepcion: hotfix/P0 usa branch directa (`hotfix/...`).
- Tests + lint + build verdes localmente.
- Commits y pushes dentro del worktree (al remoto del branch del worktree). **No abre PR.**
- Actualizar dentro del worktree docs canonicas tecnicas cuando aplique (`docs/...`, tests, types, schemas). Esos cambios viajan en el PR final del frente.
- Si revela deuda fuera de scope: planteala al PO en el chat. **No abre issue, no arregla silenciosamente.** El PO decide si abre issue nuevo.
- Si el scope cambio durante ejecucion (con OK del PO): mencionarlo en el checkpoint para que el PO comente en el issue al cerrar.
- Post-deploy: confirmar env vars que el issue mencione (ej. `ODS_TELEMETRY_START_AT`) y avisar al PO para que actualice GitHub.

### Dev NO hace

- **No toca GitHub directamente**: no crea/edita/cierra issues, no asigna labels o milestones, no mueve items en el board, **no abre PRs**, no mergea. Si necesita que algo cambie en GitHub, lo plantea al PO en el chat.
- No actualiza `memory/MEMORY.md`, `memory/roadmap.md`, `memory/session_contract.md`, `memory/po_dev_protocol.md`. Eso es del PO.
- No cierra issues a mano. Se cierran via `Closes #N` en el PR que abre el PO.
- No fixea deuda fuera del scope acordado salvo OK explicito del PO.
- No actualiza inventario ODS unilateralmente; lo plantea al PO.
- No push directo a `main`. El push del Dev va al branch del worktree; el merge a `main` lo hace el PO via PR.
- No force-push, `--no-verify`, `--no-gpg-sign`, ni amend de commits ya pusheados sin instruccion explicita.
- No aplica migraciones a Supabase remoto sin OK explicito del PO en el chat.

### PO hace

- **Maneja todo GitHub end-to-end**: crea/edita/cierra issues, asigna labels y milestones, mueve items en el board RECA, abre PRs, mergea PRs.
- Brief al Dev (ver `Estilo del brief PO`).
- Veta plan v1 antes de implementacion (excepto hotfix).
- Lanza QA dual al recibir checkpoint del Dev.
- Sintetiza reportes QA en una sola guia.
- **Abre el PR** cuando todo el frente del worktree este listo (puede acumular multiples sub-issues), con `Closes #N1, Closes #N2, ...` que cierre todos.
- Al cierre del issue/epic: actualiza `MEMORY.md` (estado vivo) y `roadmap.md` (frentes/decisiones) si aplica.
- Al cierre de epic: decide si hay material para Notion canonico (`10`, `20`).
- Captura deuda recurrente detectada en QA dual como issue nuevo o nota en roadmap.

### PO NO hace

- No implementa codigo en el worktree del Dev. No sustituye al Dev en HOW.
- No aprueba checkpoint sin QA dual (salvo hotfix con criterio explicito).
- No prescribe HOW excepto en restricciones tecnicas duras (contratos RPC publicos, decisiones cerradas, patrones obligatorios del repo) o cuando plan v1 divergio.

## Estilo del brief PO

Separar dos planos siempre:

- **WHAT (specification de behavior)**: prescribir fuerte. Owner-only call.
- **HOW (implementacion tecnica)**: recomendaciones con libertad. Decision del Dev.

Mezclar los dos planos es el error fuente. Si dejo behavior abierto, el Dev decide producto. Si prescribo HOW, pierdo propuestas mejores.

### WHAT (prescribir)

Aplica a: que ve el operador, que valida el server, que persiste, codigos de error, casos por estado del sistema.

Estructura util:

- **Tabla de casos** cuando hay estados distintos. Ej: "0 rows -> modo X / 1 row -> modo Y / 2+ -> modo Z". No dejar interpretacion.
- **Reglas exactas**: cuando exigir 422, cuando aceptar, criterios de pre-seleccion strict, persistencia exacta ("escribe a tabla X campo Y").
- **Tabla de tests numerada** con setup + assertion explicito por caso.

### HOW (recomendaciones con libertad)

Aplica a: nombres de helpers, donde colocar codigo, shape de tipos TS, decisiones de refactor, estrategias de idempotency.

Frase template:

> "Mi recomendacion inicial: <X>. Razon: <Y>. Si propones algo distinto, justifica el por que en el plan — lo reviso en el veto."

Lo que NO hago como PO:

- Pre-cocinar tipos TS exactos como instruccion.
- Dejar "Sugerencia inicial:" sin marco de libertad — el Dev la toma como instruccion implicita.
- Convertir todo en pregunta abierta — pierdo el valor del input PO.

En el veto del plan:

- Si Dev tomo la recomendacion: evaluo si tiene sentido en el codigo real, no si la siguio por inercia.
- Si Dev se aparto con justificacion solida: aprobado aunque difiera.
- Si Dev se aparto sin justificar: regreso a justificar antes de aprobar.

Excepciones donde si prescribo HOW:

- Restricciones tecnicas duras: contratos RPC publicos, decisiones cerradas, patrones obligatorios del repo.
- Decisiones del PO ya cerradas en discusion previa.
- Cuando plan v1 divergio y necesito devolverlo a la direccion correcta en plan v2.

### Reglas operativas estandar del brief

**No-fantasma test (anti-cheating).** En todo brief con tests criticos, agregar:

> "Si revertis el cambio que arregla el bug, los tests deben caer con FAIL real. Mostrame el FAIL output como evidencia en el checkpoint."

Combate tests trivialmente verdes. Defensa real, no ceremonia.

**Estimacion en rangos.** Brief no-trivial cierra con:

```
- Investigacion + plan: 30-45 min.
- Implementacion: 1.5-2.5h.
- Tests: 1-1.5h.
- Total: 3-4.5h.
```

Alinea expectativas. Si Dev tarda 8h en algo estimado 3h, alguien revisa el plan. Detector temprano de scope creep.

**Accion inmediata operativa.** Lista concreta para arrancar:

```
- Mover #N a In Progress en el board.
- Crear branch <nombre-exacto> desde main.
- Investigar archivos: A, B, C (o usar Explore/code-explorer si la superficie es amplia).
- Pasame plan estructurado.
```

Reduce friccion de arranque.

**Restricciones enumeradas.** Bloque "Out of scope" con NOs concretos:

```
- NO crear empresas automaticamente desde el lookup.
- NO relajar validacion server-side en assign.
- NO bloquear casos de NIT unico.
- Datos sensibles: tests usan fixtures.
```

Hace explicito el limite. Reduce scope creep.

**Justificacion de tamano** cuando el brief pida algo mas grande que el baseline obvio. Razon vivible para el Dev y futuros lectores.

### Resumen practico de un brief

1. WHAT (tabla de behavior por caso, reglas exactas).
2. WHY (contexto, decisiones cerradas, restricciones de negocio).
3. Contrato duro (no-negociables: contratos RPC, decisiones D1-Dn, patrones del repo).
4. Preguntas + recomendaciones con libertad (HOW tecnico que el Dev decide).
5. Tabla de tests numerada con setup + assertion + no-fantasma test obligatorio.
6. Restricciones enumeradas (NOs concretos).
7. Justificacion de tamano si aplica.
8. Estimacion en rangos.
9. Accion inmediata operativa.
10. Workflow del ciclo PO-Dev-QA dual (referencia a este archivo).

## QA dual: como se lanza

```
[Agent: feature-dev:code-reviewer]   |   [Agent: feature-dev:code-explorer | general-purpose]
        bugs / seguridad             |        consistencia / arquitectura
        convenciones del repo        |        side effects / deuda
                                     |
                  -- ambos reportan al PO --
                                     |
            PO sintetiza una guia al Dev
```

Mismo mensaje, dos tool uses paralelos. No leer reportes secuencialmente; lanzarlos juntos.

## Por que este protocolo

El Dev se concentra en codigo y diagnostico. El PO se concentra en producto, memoria y direccion. QA dual da verificacion independiente que ni Dev ni PO solos pueden dar. Si los dos escriben memoria, hay conflicto. Si Dev cierra issues a mano, se pierde el binding `Closes #N` que enlaza commits con issues.
