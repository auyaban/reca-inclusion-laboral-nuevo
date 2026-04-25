---
name: Catalogo de formularios
description: Estado local por formulario y notas activas de operacion
type: reference
updated: 2026-04-24
---

## Regla de uso

- Este archivo es la unica verdad local del estado por formulario.
- Si un formulario ya esta migrado, su historia de discovery, QA y fases no se guarda en archivos aparte.
- Para migrar uno nuevo, combinar este archivo con `form_production_standard.md` y `migration_reference.md`.

## Estado por formulario

| Formulario | Slug | Legacy | Estado real | Cuando releerlo |
|---|---|---|---|---|
| Presentacion / Reactivacion | `presentacion` | `formularios/presentacion_programa/` | Produccion; referencia canonica del stack | Cuando se necesite un baseline de UX o finalizacion |
| Sensibilizacion | `sensibilizacion` | `formularios/sensibilizacion/sensibilizacion.py` | Produccion; baseline reusable sin PDF | Cuando se necesite el baseline mas simple |
| Condiciones de la Vacante | `condiciones-vacante` | `formularios/condiciones_vacante/condiciones_vacante.py` | Produccion; sin frente propio activo | Solo si la tarea toca ese formulario |
| Seleccion Incluyente | `seleccion` | `formularios/seleccion_incluyente/` | Produccion; sin frente propio activo | Solo si la tarea toca ese formulario |
| Contratacion Incluyente | `contratacion` | `formularios/contratacion_incluyente/` | Produccion; sin frente propio activo | Solo si la tarea toca ese formulario |
| Induccion Organizacional | `induccion-organizacional` | `formularios/induccion_organizacional/` | Produccion; sin frente propio activo | Solo si la tarea toca ese formulario |
| Induccion Operativa | `induccion-operativa` | `formularios/induccion_operativa/` | Produccion; sin frente propio activo | Solo si la tarea toca ese formulario |
| Evaluacion de Accesibilidad | `evaluacion` | `formularios/evaluacion_programa/` | Preview vigente; QA manual pendiente | Cuando la tarea toque `evaluacion` o su cierre |
| Interprete LSC | `interprete-lsc` | `formularios/interprete_lsc/interprete_lsc.py` | Migrado; sin frente de migracion | Cuando la tarea toque LSC o su rollout opcional |
| Seguimientos | `seguimientos` | `formularios/seguimientos/` | Migrado; sin frente de migracion | Cuando la tarea toque el runtime de caso multi-etapa |

## Notas activas

### Presentacion / Reactivacion

- Sigue siendo la referencia canonica de documento largo con `Sheet + PDF + Supabase`.
- Usar este formulario para contrastar UX, drafts, finalizacion y naming shared.
- En local ya existe el primer lote de `visita fallida`: CTA visible, confirmacion, persistencia inmediata del draft y minima de asistentes relajada a 1. Sigue pendiente de QA manual y deploy.

### Sensibilizacion

- Es el baseline reusable mas simple del stack.
- Publica a Google Sheets y Supabase, sin PDF.
- En local ya existe el primer lote de `visita fallida`: CTA visible, confirmacion, persistencia inmediata del draft y minima de asistentes relajada a 1. Sigue pendiente de QA manual y deploy.

### Evaluacion

- Ya corre como long form productivo y la tarjeta esta habilitada en `/hub`.
- Publica solo a Google Sheets; no genera PDF en el estado actual.
- Mantiene QA manual pendiente antes de darse por cerrada.

### Interprete LSC

- Ya esta migrado al runtime normal: editor web, `Sheet + PDF`, registro en `formatos_finalizados_il` y catalogo de interpretes.
- `pdfLink` requiere login de Google.
- El prewarm esta listo para activarse por `env`, pero sigue fuera de `DEFAULT_PREWARM_PILOT_SLUGS`.

### Seguimientos

- Ya esta migrado como runtime dedicado por caso, no como submit final unico.
- Mantiene guardado por etapa, diffs contra Google Sheets y export PDF selectivo.
- Su estado vive aqui; no reabrir inventarios, matrices o planes separados.

## Referencia de migracion

1. Leer el formulario legacy puntual.
2. Definir schema Zod, defaults y normalizacion.
3. Montarlo sobre el estandar de documento largo si aplica.
4. Reusar bloques shared antes de crear UI nueva.
5. Implementar el adapter de finalizacion sobre el pipeline comun.

Ver tambien: `memory/form_production_standard.md` y `memory/migration_reference.md`.
