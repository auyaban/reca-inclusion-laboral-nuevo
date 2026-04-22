# Plan de implementación — Seguimientos web

Fecha: 2026-04-21
Base:
- [seguimientos_legacy_inventory.md](./seguimientos_legacy_inventory.md)
- [seguimientos_migration_matrix.md](./seguimientos_migration_matrix.md)
- [seguimientos_web_architecture.md](./seguimientos_web_architecture.md)
- [src/lib/seguimientos.ts](../src/lib/seguimientos.ts)
- [src/lib/seguimientosStages.ts](../src/lib/seguimientosStages.ts)

## Objetivo

Implementar `Seguimientos` como un módulo de caso multi-etapa, homogéneo con los formularios actuales en experiencia y confiabilidad, pero sin forzar el pipeline de finalización único de los long forms.

Objetivos operativos:

1. entrada por `cédula`
2. caso por persona
3. shell homogéneo con sidebar, estados de draft y guardado manual
4. ficha inicial + seguimientos + resultado final
5. guardado local inmediato
6. draft remoto por caso
7. guardado explícito a Google Sheets por etapa
8. prewarm/prepare del caso
9. PDF `solo ficha` o `ficha + seguimiento`

## Principios rectores

### 1. Reusar primero, inventar después

Piezas shared que sí debemos reusar:

- `LongFormShell`
- `LongFormSectionNav`
- `DraftPersistenceStatus`
- `DraftLockBanner`
- `useLongFormDraftController` como referencia base
- `useUsuariosRecaSearch`
- `useUsuarioRecaDetail`
- patrón de `useGooglePrewarm`

### 2. No meter `Seguimientos` al pipeline actual de finalización

`Seguimientos` no tiene:

- un solo submit final
- una sola acta nueva al final
- una sola escritura remota

Por tanto, debemos separar:

- `guardar borrador`
- `guardar etapa`
- `refrescar consolidado`
- `generar PDF`

### 3. La homogeneidad aquí es de experiencia, no de semántica

Debemos hacer que se sienta como los demás formularios:

- header
- barra lateral
- estado de guardado local/remoto
- lock/takeover
- avisos y errores consistentes

Pero internamente debe operar como caso multi-etapa.

## Decisiones técnicas clave

### Draft remoto

Recomendación:

- reutilizar `form_drafts`
- `form_slug = "seguimientos"`
- `empresa_nit` y `empresa_snapshot` siguen existiendo
- `step` representa la etapa activa
- `data` guarda el snapshot del caso:
  - `caseMeta`
  - `workflow`
  - `base`
  - `followups`
  - `summary`

Esto mantiene:

- hub de borradores
- locks/takeover
- checkpoint remoto
- timestamps de última sincronización

### Estado del caso

Crear un runtime dedicado de `Seguimientos` encima del contrato ya tipado:

- `useSeguimientosCaseState`
- `useSeguimientosDraftController`

No copiar directamente un `useXFormState.tsx` existente.

### Prewarm

No reutilizar el prewarm actual de finalización tal cual.

Sí reutilizar el patrón:

- trigger temprano desde cliente
- endpoint server-side
- lease/claim si hace falta
- metadata de estado

Pero con semántica nueva:

- verificar o crear carpeta del caso
- verificar o crear spreadsheet del caso
- devolver metadata de caso lista para abrir

## Estructura general por buckets

### Bucket A — Inicialización

Meta:

- entrar por cédula
- resolver el caso
- bootstrap/prewarm
- abrir el shell correcto
- habilitar draft local/remoto y locks

### Bucket B — Desarrollo

Meta:

- construir la experiencia de edición de `Ficha inicial` y `Seguimientos`
- guardar por etapa
- proteger historial con override
- agregar productividad: copiar seguimiento y acciones masivas

### Bucket C — Finalización

Meta:

- entregar acciones de cierre del caso
- resultado final readonly
- PDF
- verificación del consolidado
- QA y hardening

## Fase 0 — Base técnica ya lista

Estado:

- completada localmente en código

Incluye:

- contrato TypeScript del caso
- payload de ficha inicial
- payload de seguimiento
- reglas de etapas
- sugerencia de etapa
- reglas de override
- opciones PDF
- sincronización de fecha del seguimiento hacia la ficha inicial

Salida:

- [src/lib/seguimientos.ts](../src/lib/seguimientos.ts)
- [src/lib/seguimientosStages.ts](../src/lib/seguimientosStages.ts)

## Bucket A — Inicialización

## Fase 1 — Entrada por cédula y bootstrap del caso

### Objetivo

Tener una pantalla de entrada de `Seguimientos` que:

- se abre como cualquier formulario
- busca por `cédula`
- resuelve el usuario RECA
- resuelve empresa
- determina `Compensar / No Compensar`
- crea o reutiliza el caso

### Reusar

- `useUsuariosRecaSearch`
- `useUsuarioRecaDetail`
- layout general de formularios

### Implementar

- ruta de editor de `Seguimientos`
- pantalla de entrada / búsqueda
- `POST /api/seguimientos/case/bootstrap`
- resolución de metadata del caso
- lookup de carpeta + spreadsheet
- creación del bundle si no existe

### Entregables

- `SeguimientosEntry` o `SeguimientosCaseGate`
- API bootstrap
- tipos de respuesta bootstrap
- loading y error states

### Criterio de salida

Un usuario puede:

- abrir `Seguimientos`
- buscar por cédula
- seleccionar el caso
- entrar al editor con metadata válida del caso

## Fase 2 — Shell homogéneo + draft runtime del caso

### Objetivo

Montar la experiencia shared antes de construir las etapas.

### Reusar

- `LongFormShell`
- `LongFormSectionNav`
- `DraftPersistenceStatus`
- `DraftLockBanner`
- `useLongFormDraftController` como base de diseño

### Implementar

- `useSeguimientosDraftController`
- nav items desde `workflow.stageStates`
- integración de `draftStatus` en sidebar
- botón manual `Guardar etapa` conectado al status
- timestamps:
  - última vez guardado local
  - última vez sincronizado en nube
- takeover / solo lectura si el draft está tomado

### Recomendación concreta

No renderizar todavía la UI completa de ficha/seguimientos aquí.

Primero dejar resuelto:

- identidad del borrador
- autosave local
- checkpoint remoto
- lock/takeover
- navegación entre etapas

### Criterio de salida

El caso abre con:

- sidebar funcional
- estado de borrador visible
- timers de guardado visibles
- guardado local y remoto funcionando
- cambio de etapa persistiendo `activeStage`

## Bucket B — Desarrollo

## Fase 3 — Ficha inicial

### Objetivo

Construir la primera etapa completa y usarla como patrón del módulo.

### UI

Propuesta de secciones:

- `Empresa`
- `Vinculado`
- `Contrato y apoyos`
- `Funciones`
- `Timeline de seguimientos`

### Reglas

- editable normal si está vacía
- protegida por defecto si ya tiene contenido guardado
- `Override` explícito con alerta y confirmación
- timeline readonly, excepto fechas alimentadas por guardado de seguimiento

### Implementar

- schema Zod de ficha inicial
- presenter de ficha inicial
- `save base stage`
- diff/overwrite warning si aplica
- read model desde spreadsheet

### Criterio de salida

La ficha inicial:

- se visualiza bien
- guarda local y remoto
- guarda explícitamente en Sheets
- entra protegida si ya existe
- soporta override

## Fase 4 — Navegación entre etapas y transición base -> seguimiento

### Objetivo

Hacer que pasar de la ficha inicial a los seguimientos se sienta natural.

### Implementar

- selector lateral de etapas con estados:
  - pendiente
  - en curso
  - completa
  - solo lectura
- foco automático en etapa sugerida
- persistencia de etapa activa
- mensaje contextual por etapa
- salto entre ficha inicial y seguimiento N

### Recomendación UX

No hacer tabs pequeñas ni UI de spreadsheet.

Mantener el mismo shell:

- sidebar izquierda
- contenido de etapa a la derecha
- acciones arriba o al final de la etapa

### Criterio de salida

El usuario puede:

- navegar entre etapas sin perder borrador
- entender cuál etapa debe diligenciar
- volver al historial sin confusión

## Fase 5 — Seguimiento 1..N

### Objetivo

Construir el runtime de seguimiento completo con productividad real.

### UI

Propuesta de secciones por seguimiento:

- `Datos del seguimiento`
- `Evaluación del vinculado`
- `Evaluación de la empresa`
- `Situación y estrategias`
- `Asistentes`

### Funcionalidades obligatorias

- guardar seguimiento actual
- al guardar, sincronizar fecha hacia ficha inicial
- override para seguimientos históricos
- copiar último seguimiento
- acciones masivas heredadas de Legacy

### Botones/productividad

- `Copiar seguimiento anterior`
- acciones rápidas masivas para:
  - autoevaluación
  - evaluación empresa

### Implementar

- schema Zod de seguimiento
- presenter único reutilizable para `Seguimiento 1..N`
- `POST /api/seguimientos/case/[caseId]/followups/[index]/save`
- helpers de copy-forward
- helpers de mass actions

### Criterio de salida

Los seguimientos:

- pueden diligenciarse uno a uno
- heredan datos del anterior cuando el usuario lo pide
- tienen botones masivos funcionales
- actualizan la fecha correspondiente en la ficha inicial

## Fase 6 — Historial protegido y corrección segura

### Objetivo

Resolver el riesgo operativo principal: correcciones sin daño accidental.

### Implementar

- estado `protected by default`
- botón `Override`
- modal/alerta de confirmación
- sesión temporal de edición
- reset del override al salir, recargar o cambiar de caso

### Recomendación

El override debe ser:

- por etapa
- temporal
- visible
- auditado si luego agregamos eventos

### Criterio de salida

Un seguimiento previo:

- abre readonly
- solo pasa a editable con confirmación
- no deja al usuario en edición accidental permanente

## Bucket C — Finalización

## Fase 7 — Resultado final, consolidado y PDF

### Objetivo

Completar la superficie de cierre del caso sin usar finalización única.

### Implementar

- etapa `Resultado final` readonly
- `POST /api/seguimientos/case/[caseId]/summary/refresh`
- verificación de integridad del consolidado
- diálogo de PDF
- `POST /api/seguimientos/case/[caseId]/pdf`

### Reglas PDF

Opciones:

- `Solo ficha inicial`
- `Ficha inicial + Seguimiento N`

### Recomendación técnica

V1:

- verificar estructura del consolidado
- exponer issues visibles si está roto

V2:

- recalcular consolidado desde backend

### Criterio de salida

El usuario puede:

- revisar el resultado final
- generar PDF según la combinación permitida
- detectar si el consolidado tiene problemas

## Fase 8 — Hardening, QA y rollout controlado

### Objetivo

Cerrar riesgos antes de considerarlo listo para uso real.

### QA obligatorio

- nuevo caso `No Compensar`
- nuevo caso `Compensar`
- caso ya existente con spreadsheet reutilizado
- ficha inicial sin seguimiento 1
- seguimiento 1 completo
- seguimiento 2 con copy-forward
- override sobre seguimiento previo
- multi-tab / takeover
- pérdida de conexión
- recuperación desde draft local
- recuperación desde draft remoto
- PDF base
- PDF base + seguimiento
- consolidado sano
- consolidado roto

### Recomendación de rollout

1. habilitar solo para pruebas internas
2. validar 3 a 5 casos reales
3. corregir fricción de override/copy-forward
4. abrir piloto controlado

## Orden recomendado de construcción

Orden estricto:

1. Fase 1 — Entrada y bootstrap
2. Fase 2 — Shell + drafts + locks
3. Fase 3 — Ficha inicial
4. Fase 4 — Navegación de etapas
5. Fase 5 — Seguimientos
6. Fase 6 — Override/historial
7. Fase 7 — Resultado final + PDF
8. Fase 8 — QA/hardening

## Qué se puede paralelizar después

Una vez estén listas Fase 1 y Fase 2, sí se puede trabajar en paralelo en:

- UI de ficha inicial
- UI de seguimiento
- endpoints de guardado por etapa
- summary/PDF

Pero no antes, porque todo depende de:

- bootstrap del caso
- shell
- drafts
- stage model

## Sugerencias adicionales

### 1. No abrir con la ficha inicial “nueva” si el caso ya existe

Abrir siempre con:

- la etapa sugerida

Pero mostrar:

- la ficha inicial primero en sidebar
- estado visible del caso

### 2. El botón manual principal no debe decir `Finalizar`

Debe decir:

- `Guardar ficha inicial`
- `Guardar seguimiento`
- `Actualizar resultado final`

Según etapa activa.

### 3. Mantener una sola fuente de verdad de estado de etapa

La UI no debe recalcular reglas ad hoc.

Siempre usar:

- `src/lib/seguimientos.ts`
- `src/lib/seguimientosStages.ts`

### 4. No meter spreadsheet semantics en la interfaz

Nunca hablar de:

- hoja 9
- PONDERADO FINAL
- sheet visibility

Sí hablar de:

- ficha inicial
- seguimiento 1..N
- resultado final

### 5. Copiar el seguimiento anterior debe ser reversible antes del guardado

Recomendación:

- confirmación antes de copiar
- toast o aviso visible
- posibilidad de seguir editando antes de guardar

## Siguiente paso recomendado

Con este plan, el siguiente entregable técnico correcto es:

1. diseñar Fase 1 y Fase 2 en detalle
2. definir contratos de API reales para bootstrap, read-case y save-stage
3. decidir exactamente cómo guardaremos el draft remoto del caso en `form_drafts`

Ese sería el punto a partir del cual ya vale la pena empezar implementación de UI y backend.
