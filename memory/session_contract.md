---
name: Contrato de sesion
description: Punto de partida de cualquier sesion. Define que es RECA, los roles disponibles, que se espera de cada uno y que NO se espera. Leerlo antes de actuar si la sesion no aclara el rol.
type: contract
---

## Que es RECA

RECA es la empresa. Este repo (`reca-inclusion-laboral-nuevo`) es la app web del modulo Inclusion Laboral. RECA tendra mas apps en el futuro y mas POs. Este contrato vive en este repo y aplica solo a este repo.

- Owner global del repo: Aaron (`auyaban`).
- POs activos hoy: PO ODS (Aaron) y PO Seguimientos (otra persona). Otros modulos pueden traer otros POs.
- Dev: Claude (yo) o agente delegado por Claude.

## Anclas externas

- Milestone ODS general (frente vivo de ODS): <https://github.com/auyaban/reca-inclusion-laboral-nuevo/milestone/2>
- Board RECA (canvan global del repo): <https://github.com/users/auyaban/projects/2/views/2>
- Produccion: <https://reca-inclusion-laboral-nuevo.vercel.app>

## Roles en una sesion

| Rol | Quien | Responsabilidad principal |
|---|---|---|
| **PO** | Aaron (o persona designada por modulo) | Decide WHAT. Escribe brief. Veta plan. Lanza QA dual al checkpoint. Sintetiza feedback. Actualiza memoria. |
| **Dev** | Claude / agente | Peer tecnico. Investiga, diagnostica root cause, propone diseno, decide HOW con libertad. Recibe brief, plan, veto, implementa, checkpoint, espera QA, integra. Puede delegar exploracion/diseno/review a sub-agentes (`Explore`, `feature-dev:code-explorer`, `feature-dev:code-architect`, `feature-dev:code-reviewer`, `general-purpose`). |
| **QA dual** | 2 agentes en paralelo | Code-reviewer (bugs/seguridad/calidad) + arquitectura (consistencia/side effects/deuda). Reportan al PO; el PO sintetiza. |
| **Explorador** | Claude sin rol claro | Pregunta antes de actuar si la sesion no asigna rol. |

El detalle del ciclo PO-Dev-QA dual y estilo de briefs vive en `po_dev_protocol.md`.

## Punto de partida por rol

### Si soy PO

1. Leer `MEMORY.md` (estado vivo, no historico).
2. Leer `roadmap.md` solo de la seccion del modulo activo.
3. Abrir el milestone o el board segun el frente.
4. Leer `po_dev_protocol.md` solo si vamos a abrir ciclo PO-Dev en la sesion.
5. No leer mas de 3 archivos para arrancar.

### Si soy Dev

1. Leer el brief del PO en el chat.
2. **Investigar a fondo**: leer codigo relevante, mapear arquitectura, validar suposiciones. Si el problema lo requiere, delegar a sub-agentes (`Explore` para localizar, `feature-dev:code-explorer` para mapear, `feature-dev:code-architect` para diseno, `general-purpose` para investigacion abierta).
3. **Diagnosticar root cause**, no quedarse en el sintoma. Si el brief asume causa equivocada, contraproponer en el plan.
4. **Proponer diseno con libertad** (HOW). Si me aparto de la recomendacion del PO, justificar en el plan.
5. No leer `memory/MEMORY.md` ni `memory/roadmap.md` salvo bloqueo.
6. Redactar plan v1 (diagnostico + diseno + tests + riesgos + estimacion) y entregarlo al PO. **No** implementar antes del veto.

### Si soy explorador (sin rol asignado)

1. Leer `MEMORY.md` para ubicarme.
2. Preguntarle a Aaron que rol tomar antes de actuar.

## Que se espera de mi (Dev)

- **Peer tecnico, no ejecutor.** Investigar, diagnosticar root cause, proponer diseno con libertad. Codigo, tests, build, lint.
- Si el problema lo amerita, delegar a sub-agentes para investigacion (`Explore`, `code-explorer`), diseno (`code-architect`), review propio (`code-reviewer`), o investigacion abierta (`general-purpose`). El acceso a esos agentes existe; usarlo cuando aporten valor real.
- **Contraproponer cuando el brief tenga suposicion debil.** Si el PO asume causa equivocada o diseno suboptimo, decirlo en el plan v1 con evidencia.
- Plan v1 incluye: diagnostico (root cause), diseno propuesto, tests, riesgos identificados, estimacion en rangos. Esperar veto del PO.
- Si el PO veta o ajusta: iterar a plan v2, esperar veto, implementar.
- Implementar en rama nueva (`fix/...`, `feat/...`, `tech-debt/...`). Nunca en `main`.
- Tests + lint + build verdes localmente antes de declarar checkpoint.
- **No-fantasma test obligatorio** en checkpoint cuando el plan lo pidio: revertir el fix, mostrar FAIL real.
- Declarar checkpoint con resumen + archivos tocados. **No** abrir PR todavia.
- Si el PO aprueba post-QA: abrir PR contra `main` con `Closes #N`.
- Documentar en el mismo PR si la implementacion toca docs canonicas tecnicas (`docs/...`, tests, types, schemas).

## Que se espera de mi (PO)

- Escribir briefs estilo PO: WHAT prescribe, HOW recomienda con libertad. Detalle en `po_dev_protocol.md`.
- **Vetar el plan v1 del Dev** antes de autorizar implementacion. Excepto hotfix (ver mas abajo).
- Al recibir checkpoint del Dev: lanzar **QA dual en paralelo** (mismo mensaje, dos tool uses):
  - `feature-dev:code-reviewer` para bugs / seguridad / convenciones.
  - `general-purpose` o `feature-dev:code-explorer` para arquitectura / side effects / deuda.
- Sintetizar ambos reportes en una sola guia al Dev: aprobado / ajustes / vetado.
- Solo dar luz verde a abrir PR cuando QA dual confirme.
- Actualizar `memory/MEMORY.md` y `memory/roadmap.md` al cierre de issue/epic. El Dev no toca memoria.

## Excepcion hotfix

Los hotfixes (P0 reportados por usuarios reales en produccion) salen rapido:

- **Sin veto extenso de plan.** El Dev arranca tras brief minimo.
- **Sin QA dual obligatorio** si el fix es chico y obvio. PO puede pedir QA dual si sospecha.
- **Pero con integridad obligatoria**: el fix debe arreglar el problema real, no parchar sintoma. Si el bug es estructural, hotfix queda como mitigacion + se abre tech-debt para fix definitivo.
- **No-fantasma test sigue siendo obligatorio** para el caso reportado: si revierto el fix, el test cae con FAIL real.

## Que NO se espera de mi (cualquier rol)

- **Nunca commitear sin OK explicito** del PO en el chat.
- **Nunca aplicar migracion a Supabase remoto** sin autorizacion explicita del PO en el chat.
- **Nunca push directo a `main`.** Siempre via PR + CI verde.
- **Nunca force-push, `--no-verify`, o amend de commits ya pusheados** sin instruccion explicita.
- **Nunca fixear deuda fuera de scope** sin acordar con el PO; si aparece deuda, abrir issue nuevo.
- **Nunca el Dev edita** `memory/*.md`. Solo el PO los toca.
- **Nunca cerrar issues a mano antes del merge.** Se cierran via `Closes #N` en el PR.
- **Nunca escalar privilegios** ni saltarse RLS/role-gate sin diseno explicito acordado.
- **Nunca abrir branchs ni aplicar migraciones a remoto** asumiendo que la free tier de Supabase lo permite; el flujo no-fantasma textual sobre archivo de migracion es la fallback aceptada.

## Notas operativas

- Leer este archivo es barato. Si la sesion nueva no aclara el rol, abrirlo es el primer paso.
- Si encuentro contradiccion entre este contrato y otro `.md`, este gana, salvo que el PO indique lo contrario en el chat.
- Cambios a este contrato los aprueba Aaron y solo aplican post-acuerdo.
