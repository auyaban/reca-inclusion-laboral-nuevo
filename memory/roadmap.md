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

### Shared finalization y prewarm

- Sigue abierta la validacion manual del endurecimiento shared de autosave/integridad.
- El frente de prewarm solo sigue activo para QA shared y decisiones de rollout; no para discovery nuevo.
- Si se retoma rollout de `interprete-lsc`, se hace solo via `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.

### Evaluacion

- `evaluacion` sigue en preview y no se considera cerrada mientras mantenga QA manual pendiente.
- El formulario ya corre como long form productivo y publica solo a Google Sheets; la decision pendiente es operativa, no de arquitectura.

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
| Induccion Organizacional | `induccion-organizacional` | Produccion; sin frente propio activo |
| Induccion Operativa | `induccion-operativa` | Produccion; sin frente propio activo |
| Evaluacion de Accesibilidad | `evaluacion` | Preview vigente; QA manual pendiente |
| Interprete LSC | `interprete-lsc` | Migrado; sin frente de migracion. Prewarm listo por `env`, fuera del piloto default |
| Seguimientos | `seguimientos` | Migrado; runtime multi-etapa ya absorbido al catalogo normal |

## Siguiente orden recomendado

1. Ejecutar QA manual del frente shared de autosave/integridad y cerrar si deja de ser riesgo activo.
2. Decidir si `evaluacion` se cierra como migracion completa o si mantiene fase de preview/QA.
3. Solo si se retoma, decidir rollout de prewarm de `interprete-lsc` via `env`.
4. Mantener fuera del repo cualquier historial adicional de QA, preview o fases cerradas.

## Completado

- La base shared de long forms, drafts, finalizacion y prewarm ya esta migrada.
- `Interprete LSC` y `Seguimientos` ya cuentan como formularios migrados; no necesitan documentacion propia en `memory/`.
