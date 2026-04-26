---
name: Roadmap de implementacion
description: Frentes activos, decisiones abiertas y siguiente orden del repo
type: roadmap
updated: 2026-04-26
---

## Regla operativa

- Este archivo solo guarda frentes abiertos, decisiones activas y siguiente orden.
- El backlog vivo, QA abierta y decisiones amplias viven en Notion (`20`, `30`, `40`).
- Cuando cambie un frente activo, sincronizar `roadmap.md`, `memory/MEMORY.md` y la pagina canonica de Notion correspondiente.
- No registrar aqui changelog de PRs, previews viejos ni QA cerrada.

## Frentes activos

### Visita fallida

- Ya quedaron implementados localmente tres lotes:
  - `evaluacion`, `induccion-operativa` e `induccion-organizacional` con presets reales de `No aplica`, narrativas obligatorias en modo fallido y persistencia inmediata.
  - `seleccion`, `contratacion` y `condiciones-vacante` con CTA visible, persistencia inmediata, optionalidad estructural en modo fallido y presets locales sin crear placeholders.
- Los ajustes directos de QA local ya quedaron aplicados para `evaluacion` (`No` en campos `No/Si/Parcial`), `seleccion` (dropdowns con `No aplica`) y filas repetibles nuevas/activadas en `seleccion` y `contratacion`.
- Por decision de producto, `presentacion` y `sensibilizacion` ya no exponen el CTA visible de `visita fallida`; conservan compatibilidad tecnica para drafts legacy con `failed_visit_applied_at`.
- `condiciones-vacante` queda congelado hasta revision con profesional RECA; no hacer mas ajustes de producto sobre ese formulario sin esa validacion.
- `seguimientos` conserva su logica propia; `interprete-lsc` sigue fuera del rollout shared mientras no se decida su variante.
- El siguiente paso operativo ya no es desarrollo base sino QA manual corta del lote completo y luego decidir si se promueve o si requiere ajustes antes de tocar `interprete-lsc`.

### Borradores

- La eliminacion del hub se mantiene optimista en UI: el borrador desaparece inmediatamente de la lista.
- El DELETE remoto ahora prioriza soft-delete (`deleted_at`) antes del cleanup de Google Drive; si Drive falla o queda pendiente, se conserva metadata de cleanup para trazabilidad.
- No se abre queue por ahora; se reevalua solo si aparecen fallos o latencia recurrente de cleanup.

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
| Presentacion / Reactivacion | `presentacion` | Produccion; referencia canonica del stack; sin CTA visible de `visita fallida` |
| Sensibilizacion | `sensibilizacion` | Produccion; baseline reusable; sin CTA visible de `visita fallida` |
| Condiciones de la Vacante | `condiciones-vacante` | Produccion; lote local de `visita fallida` pendiente de QA |
| Seleccion Incluyente | `seleccion` | Produccion; lote local de `visita fallida` pendiente de QA |
| Contratacion Incluyente | `contratacion` | Produccion; lote local de `visita fallida` pendiente de QA |
| Induccion Organizacional | `induccion-organizacional` | Produccion; lote local de `visita fallida` pendiente de QA |
| Induccion Operativa | `induccion-operativa` | Produccion; lote local de `visita fallida` pendiente de QA |
| Evaluacion de Accesibilidad | `evaluacion` | Preview vigente; `visita fallida` local pendiente de QA |
| Interprete LSC | `interprete-lsc` | Migrado; sin frente de migracion. Prewarm listo por `env`, fuera del piloto default |
| Seguimientos | `seguimientos` | Migrado; runtime multi-etapa ya absorbido al catalogo normal |

## Siguiente orden recomendado

1. Ejecutar QA manual del lote actual de `visita fallida` en `evaluacion`, `induccion-operativa`, `induccion-organizacional`, `seleccion`, `contratacion` y `condiciones-vacante`; en `presentacion` y `sensibilizacion`, validar que el CTA ya no aparece.
2. Validar manualmente eliminacion de borradores: desaparicion inmediata, restauracion si falla DB y no reaparicion si solo falla cleanup de Drive.
3. Corregir hallazgos de ese frente antes de decidir si `interprete-lsc` entra con variante propia o se mantiene fuera del patron.
4. Ejecutar QA manual del frente shared de autosave/integridad y cerrar si deja de ser riesgo activo.
5. Decidir si `evaluacion` se cierra como migracion completa o si mantiene fase de preview/QA.
6. Solo si se retoma, decidir rollout de prewarm de `interprete-lsc` via `env`.

## Completado

- La base shared de long forms, drafts, finalizacion y prewarm ya esta migrada.
- `Interprete LSC` y `Seguimientos` ya cuentan como formularios migrados; no necesitan documentacion propia en `memory/`.
