---
name: Plan por fases de Interprete LSC
description: Orden recomendado de implementacion para migrar Interprete LSC a web con MVP operativo y endurecimiento posterior
type: plan
updated: 2026-04-22
---

# Plan por fases - Interprete LSC

## Recomendacion de arranque

No recomiendo empezar por UX/UI visual.

Para este formulario, el orden correcto es:

1. contrato tecnico y salida final
2. editor funcional minimo
3. endurecimiento de runtime shared
4. pulido UX/UI y QA

La razon es simple: el mayor riesgo no esta en la pantalla, sino en estos tres puntos:

- layout dinamico del maestro LSC
- PDF + `formatos_finalizados_il`
- `payload_normalized` que necesita ODS

Si se diseña primero la UI sin cerrar eso, es facil retrabajar secciones, defaults y comportamiento de repetidores.

## Minimo necesario para un MVP usable

El minimo necesario para decir que `Interprete LSC` ya corre en web es:

- slug registrado y accesible en `/formularios/interprete-lsc`
- editor largo funcional con 4 secciones
- selector de empresa shared
- oferentes hasta `10`
- interpretes hasta `5` con calculo de horas, `Sabana` y sumatoria
- asistentes con `2` filas iniciales y maximo `10`
- finalizacion a Google Sheets con offsets correctos
- export PDF
- insert en `formatos_finalizados_il`
- `payload_normalized` correcto para ODS
- `sheetLink` y `pdfLink` en pantalla final

Lo que no hace falta para declarar ese MVP:

- prewarm activo
- optimizacion fina de watchers
- pulido visual final
- smoke E2E completo

## Fases recomendadas

### Fase 0 - Discovery y decisiones cerradas

Estado: ya cerrada

Objetivo:

- cerrar `legacy vs maestro vivo vs web`
- confirmar slots base y offsets
- confirmar PDF, payload y consumo por ODS

Salida:

- inventario legacy
- matriz de migracion
- decisiones cerradas de alcance

### Fase 1 - Contrato tecnico y payload

Objetivo:

- fijar la forma canonica de los datos antes de renderizar el formulario

Trabajo:

- `src/lib/validations/interpreteLsc.ts`
- `getDefaultInterpreteLscValues()`
- `normalizeInterpreteLscValues()`
- utilidades de tiempo:
  - normalizacion flexible de hora
  - calculo `total_tiempo`
  - calculo `sumatoria_horas`
  - formato de `Sabana`
- `src/lib/interpreteLscSections.ts`
- helper `getInterpreteLscValidationTarget()`
- `src/lib/finalization/interpreteLscPayload.ts`

Tests minimos:

- normalizacion de horas
- calculo de horas y sumatoria
- defaults
- payload builder
- target de validacion

Salida esperada:

- contrato del formulario congelado
- payload `parsed_raw` alineado a Legacy y al estandar web

Esta es la primera fase que recomiendo desarrollar.

### Fase 2 - Sheets y finalizacion backend MVP

Objetivo:

- dejar resuelta la parte mas riesgosa del formulario sin depender aun del editor final

Trabajo:

- `src/lib/finalization/interpreteLscSheet.ts`
- mapping fijo de seccion 1
- writes de oferentes
- writes de interpretes
- writes de `Sabana` y `Sumatoria`
- writes de asistentes
- `rowInsertions` para:
  - oferentes > 7
  - interpretes > 1
  - asistentes > 2
- footer con `actaRef`
- route `src/app/api/formularios/interprete-lsc/route.ts`
- export PDF
- upload raw payload
- insert en `formatos_finalizados_il`

Tests minimos:

- mutation builder con conteos base
- mutation builder con overflow
- payload final contiene `sheetLink` y `pdfLink`
- insert final usa `buildFinalizedRecordInsert`

Salida esperada:

- backend completo del formulario funcionando de punta a punta

Comentario:

Si esta fase queda lista, el riesgo duro del formulario ya queda resuelto.

### Fase 3 - Editor web MVP

Objetivo:

- montar un editor funcional sobre el contrato ya estable

Trabajo:

- registrar `interprete-lsc` en `src/lib/forms.ts`
- agregar dynamic import en `src/app/formularios/[slug]/page.tsx`
- crear `src/components/forms/InterpreteLscForm.tsx`
- reusar runtime tipo `Sensibilizacion`
- crear las 4 secciones:
  - empresa y servicio
  - oferentes / vinculados
  - interpretes y horas
  - asistentes
- crear `useInterpretesCatalog()`
- crear `/api/interpretes`

Reglas de esta fase:

- priorizar funcionamiento sobre pulido visual
- reusar componentes shared antes de crear UI nueva
- no abrir frente extra de microcopy o diseño fino

Salida esperada:

- formulario usable de punta a punta en local

### Fase 4 - Integracion con runtime shared

Objetivo:

- dejarlo armonizado con la plataforma real, no solo “funcionando”

Trabajo:

- drafts
- takeover
- `DraftPersistenceStatus`
- `DraftLockBanner`
- pantalla final shared
- polling de finalizacion
- CTA final de abrir acta/PDF
- limpieza del draft al finalizar
- registro del slug en:
  - `src/lib/finalization/formSlugs.ts`
  - `src/lib/finalization/prewarmConfig.ts`
  - `src/lib/finalization/prewarmRegistry.ts`

Decisión recomendada sobre prewarm:

- integrarlo en esta fase, no en el MVP inicial
- primero validar finalizacion normal
- luego sumar prewarm con firma estructural por overflow

Salida esperada:

- LSC alineado al comportamiento shared del repo

### Fase 5 - UX/UI y pulido operativo

Objetivo:

- mejorar lectura, ritmo visual y ergonomia una vez el flujo ya sea estable

Trabajo:

- spacing y jerarquia visual
- copy final de ayudas y errores
- detalles de repetidores
- feedback de sumatoria y horas
- estados vacios
- consistencia con el resto de formularios largos

Salida esperada:

- UI lista para validacion usuaria

Comentario:

Esta fase debe venir despues del backend y del editor funcional. Antes seria prematuro.

### Fase 6 - QA y release readiness

Objetivo:

- validar el formulario como producto y como parte de la plataforma

Trabajo:

- tests unitarios faltantes
- smoke de finalizacion
- QA manual del formulario
- QA de regresion del shell largo
- preview deployment
- checklist de:
  - apertura
  - draft
  - takeover
  - submit invalido
  - Sheet correcto
  - PDF correcto
  - payload correcto en `formatos_finalizados_il`

Salida esperada:

- formulario listo para preview estable y decision de habilitacion

## Orden de desarrollo recomendado

### Orden real

1. Fase 1 - Contrato tecnico y payload
2. Fase 2 - Sheets y finalizacion backend MVP
3. Fase 3 - Editor web MVP
4. Fase 4 - Integracion con runtime shared
5. Fase 5 - UX/UI y pulido operativo
6. Fase 6 - QA y release readiness

### Lo que empezaria primero ya

Empezaria por:

- schema + defaults
- utilidades de tiempo
- payload builder
- sheet builder

No empezaria por:

- layout bonito
- copy fino
- prewarm
- polish visual

## Corte minimo para mostrarte algo rapido

Si quieres un primer corte util y rapido, el mejor objetivo es este:

### Corte A - MVP tecnico validable

- schema completo
- payload builder completo
- sheet builder completo
- route completa con PDF
- pruebas unitarias de contrato

Con ese corte ya podemos validar:

- que el maestro sale bien
- que el PDF sale bien
- que el payload le sirve a ODS

Y solo despues montamos el editor final encima.

## Decision ejecutiva

Para `Interprete LSC`, recomiendo empezar por backend/contrato, no por UX/UI.

El mejor primer desarrollo es:

1. Fase 1
2. Fase 2

Y el mejor primer entregable visible es un MVP tecnico que garantice:

- `payload_normalized`
- `formatos_finalizados_il`
- Sheet
- PDF

Una vez eso este estable, el editor y el pulido visual salen mucho mas rectos.
