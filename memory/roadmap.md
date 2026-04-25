---
name: Roadmap de implementacion
description: Frentes activos, decisiones abiertas y siguiente orden del repo
type: roadmap
updated: 2026-04-24
---

## Regla operativa

- Este archivo solo guarda frentes abiertos, decisiones activas y siguiente orden.
- El backlog vivo, QA abierta y decisiones amplias viven en Notion (`20`, `30`, `40`).
- Cuando cambie un frente activo, sincronizar `roadmap.md`, `memory/MEMORY.md` y la pagina canonica de Notion correspondiente.
- No registrar aqui changelog de PRs, previews viejos ni QA cerrada.

## Frentes activos

### Visita fallida

- Ya quedaron implementados localmente dos lotes:
  - `presentacion` y `sensibilizacion` con CTA visible, confirmacion, persistencia inmediata y ajuste condicional de asistentes.
  - `evaluacion`, `induccion-operativa` e `induccion-organizacional` con presets reales de `No aplica`, narrativas obligatorias en modo fallido y persistencia inmediata.
- `seguimientos` conserva su logica propia; `seleccion`, `contratacion`, `condiciones-vacante` e `interprete-lsc` siguen fuera del rollout shared.
- El siguiente paso operativo ya no es desarrollo base sino QA manual corta del lote completo y luego decidir si se promueve o si requiere ajustes antes de expandirse.

### Shared finalization y prewarm

- Sigue abierta la validacion manual del endurecimiento shared de autosave/integridad.
- El frente de prewarm solo sigue activo para QA shared y decisiones de rollout; no para discovery nuevo.
- Si se retoma rollout de `interprete-lsc`, se hace solo via `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.

### Evaluacion

- `evaluacion` sigue en preview y no se considera cerrada mientras mantenga QA manual pendiente.
- El formulario ya corre como long form productivo y publica solo a Google Sheets; la decision pendiente es operativa, no de arquitectura.
- En local ya soporta `visita fallida` con preset real y minimos de asistentes relajados a 1.

### Operacion documental

- `forms_catalog.md` es la unica verdad local del estado por formulario.
- Los historicos de migracion, QA y discovery ya no vuelven a `memory/`.

## Estado por formulario

| Formulario | Slug | Estado real |
|---|---|---|
| Presentacion / Reactivacion | `presentacion` | Produccion; referencia canonica del stack |
| Sensibilizacion | `sensibilizacion` | Produccion; baseline reusable |
| Condiciones de la Vacante | `condiciones-vacante` | Produccion; sin frente propio activo |
| Seleccion Incluyente | `seleccion` | Produccion; sin frente propio activo |
| Contratacion Incluyente | `contratacion` | Produccion; sin frente propio activo |
| Induccion Organizacional | `induccion-organizacional` | Produccion; lote local de `visita fallida` pendiente de QA |
| Induccion Operativa | `induccion-operativa` | Produccion; lote local de `visita fallida` pendiente de QA |
| Evaluacion de Accesibilidad | `evaluacion` | Preview vigente; `visita fallida` local pendiente de QA |
| Interprete LSC | `interprete-lsc` | Migrado; sin frente de migracion. Prewarm listo por `env`, fuera del piloto default |
| Seguimientos | `seguimientos` | Migrado; runtime multi-etapa ya absorbido al catalogo normal |

## Siguiente orden recomendado

1. Ejecutar QA manual del lote actual de `visita fallida` en `presentacion`, `sensibilizacion`, `evaluacion`, `induccion-operativa` e `induccion-organizacional`.
2. Corregir hallazgos de ese frente antes de expandir `visita fallida` a `seleccion`, `contratacion` o `condiciones-vacante`.
3. Ejecutar QA manual del frente shared de autosave/integridad y cerrar si deja de ser riesgo activo.
4. Decidir si `evaluacion` se cierra como migracion completa o si mantiene fase de preview/QA.
5. Solo si se retoma, decidir rollout de prewarm de `interprete-lsc` via `env`.

## Completado

- La base shared de long forms, drafts, finalizacion y prewarm ya esta migrada.
- `Interprete LSC` y `Seguimientos` ya cuentan como formularios migrados; no necesitan documentacion propia en `memory/`.
