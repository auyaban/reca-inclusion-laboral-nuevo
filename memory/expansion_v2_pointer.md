---
name: Plan de expansion v2 (sidebar + Empresas)
description: Puntero al plan PO vivo para la expansion multi-modulo. Leer SIEMPRE el plan antes de tocar areas, sidebar, Empresas, ciclo de vida o roles.
type: reference
---

El plan maestro vive en `docs/expansion_v2_plan.md`. Es un documento PO vivo, versionado en el repo.

## Cuando aplicar

Cualquier tarea que toque:
- el shell del hub o el sidebar
- el modulo Empresas (CRUD gerente, mis empresas, reclamar, soltar, cambio de estado, notas, bitacora)
- el ciclo de vida de una empresa
- el calendario de empresa
- los roles (`gerente`, `profesional`)
- la migracion del legacy `empresas_reca` o `RECA_ODS`

## Como usarlo

1. Leer el plan entero antes de proponer arquitectura nueva.
2. No re-discutir decisiones cerradas (seccion 3 del plan) sin permiso explicito de Aaron.
3. Si una decision nueva surge, anotarla en el plan (seccion 8 si es abierta, seccion 11 si se cerro).
4. Actualizar la seccion 10 (Estado de implementacion) cuando una epica avance.

## Epicas en orden

E0 roles -> E1 shell + sidebar -> E2 Empresas gerente -> E3 Empresas profesional + ciclo de vida -> E4 calendario -> E5 ciclo de vida granular -> E6 futuro (KPIs, ODS, Google Calendar, intérpretes).

## Constraint duro

No tocar el codigo de formatos (`src/components/forms/*`, `src/lib/finalization/*`, `src/hooks/use*FormState*`, `src/app/formularios/*`, `src/app/api/formularios/*`). Las nuevas areas se montan al lado.
