# Arquitectura objetivo — Seguimientos web

Fecha: 2026-04-21
Base:
- [seguimientos_legacy_inventory.md](./seguimientos_legacy_inventory.md)
- [seguimientos_migration_matrix.md](./seguimientos_migration_matrix.md)

## Contexto de negocio consolidado

`Seguimientos` no vive aislado. Forma parte de una cadena operativa más amplia para cada vinculado:

1. levantamiento de perfil / condiciones de vacante
2. selección
3. contratación
4. inducción organizacional
5. inducción operativa
6. seguimientos

En términos de negocio, `Seguimientos` empieza después de `Inducción Operativa`.

## Reglas de negocio explícitas

### 1. El caso de seguimiento es por persona

La unidad principal es el vinculado.

Identidad operativa:

- `cedula`
- nombre del vinculado
- empresa actual
- tipo de empresa: `Compensar` o `No Compensar`

### 2. El bundle físico del caso se crea por persona

Para cada caso existe:

- una carpeta en Drive nombrada por persona
- un Google Sheet de seguimiento dentro de esa carpeta

La carpeta debe reutilizarse si ya existe.
El Sheet debe reutilizarse si ya existe.

### 3. La estructura del caso depende del tipo de empresa

- `Compensar`:
  - ficha inicial
  - seguimientos `1..6`
  - ponderado final
- `No Compensar`:
  - ficha inicial
  - seguimientos `1..3`
  - ponderado final

Esta decisión debe quedar persistida en metadata del caso.

### 4. La ficha inicial se llena el día del primer seguimiento

Regla operativa real:

- la ficha inicial se diligencia en la primera visita de seguimiento
- normalmente, en esa misma visita también se diligencia `Seguimiento 1`

Pero no siempre.

Por tanto:

- `Ficha inicial` y `Seguimiento 1` están fuertemente relacionados
- pero deben poder existir en estados distintos

### 5. `Seguimiento 1` no es obligatorio el mismo día

Debe soportarse este caso:

- se diligencia la ficha inicial
- todavía no se diligencia `Seguimiento 1`
- se necesita generar PDF solo con la ficha inicial

Esto no es edge case raro; es regla funcional soportada.

### 6. Cada seguimiento actualiza la ficha inicial

Al guardar un seguimiento:

- se guarda la hoja del seguimiento correspondiente
- se actualiza en la ficha inicial la fecha de ese seguimiento

Ejemplo:

- al guardar `Seguimiento 2`, se actualiza también la fecha de `Seguimiento 2` en la ficha inicial

Implicación:

- una operación de guardado de seguimiento toca al menos dos superficies:
  - hoja de seguimiento
  - ficha inicial

### 7. El PDF siempre incluye la ficha inicial

Opciones válidas de exportación:

- `Ficha inicial` sola
- `Ficha inicial + Seguimiento N`

Opciones no requeridas en V1:

- solo `Seguimiento N`
- `Ficha inicial + varios seguimientos`

### 8. Las correcciones deben estar protegidas, no prohibidas

No conviene bloquear de forma rígida como en Legacy.

La política recomendada es:

- por defecto, los seguimientos previos se muestran protegidos
- para editarlos, el usuario debe activar `Override`
- el override debe mostrar advertencia y confirmación
- después de confirmar, la hoja/etapa queda editable

Objetivo:

- evitar cambios accidentales
- permitir correcciones cuando realmente se necesitan

### 9. `Resultado final` es de consulta

`Ponderado final` no debe editarse manualmente desde UI.

Sí debe:

- recalcularse o verificarse
- mostrarse siempre consistente con el resto del caso

## Decisiones de producto para web

### 1. `Seguimientos` será un módulo de caso

No será:

- un long form único
- un wizard lineal
- un “formulario finalizable” como los demás

Sí será:

- un módulo de caso multi-etapa
- con shell visual homogéneo al resto del sistema
- con persistencia y feedback shared

### 2. Mantener homogeneidad donde sí agrega valor

Se debe reutilizar:

- `RHF + Zod`
- shell visual shared
- draft local inmediato
- draft remoto
- locks / takeover
- feedback visual de persistencia
- API routes y adapters server-side

### 3. No escribir Google Sheets por keystroke

Regla técnica recomendada:

- `keystroke -> draft local`
- `checkpoint remoto -> draft del caso`
- `Guardar etapa -> escritura a Google Sheets`

Esto mantiene:

- percepción de seguridad
- velocidad
- confiabilidad

Sin meter latencia de red en cada tecla.

## Decisión actualizada sobre prewarm

## Conclusión

Con este contexto, `Seguimientos` sí debería tener un prewarm/prepare de V1, porque en este módulo el problema es más sencillo que en los long forms actuales.

### Qué significa prewarm aquí

No significa crear un spreadsheet provisional por draft.

Aquí significa:

1. verificar si existe carpeta del caso
2. verificar si existe el Google Sheet del caso
3. si no existe, crear el bundle completo
4. si existe, reutilizarlo
5. cargar metadata y workflow del caso antes de abrir el editor

### Recomendación

Implementar en V1 un `case bootstrap prewarm`, no el `draft prewarm` actual del pipeline de finalización.

Esto encaja perfecto con la lógica de negocio que describes.

## Modelo conceptual recomendado

### Entidades

#### `SeguimientoCase`

- `caseId`
- `cedula`
- `nombreVinculado`
- `empresaNit`
- `empresaNombre`
- `companyType`: `compensar | no_compensar`
- `maxFollowups`
- `driveFolderId`
- `spreadsheetId`
- `spreadsheetUrl`
- `createdAt`
- `updatedAt`

#### `SeguimientoWorkflow`

- `baseStageStatus`
- `followupStatuses[]`
- `suggestedStage`
- `completedStages[]`
- `overrideUnlockedStages[]`

#### `BaseStageDraft`

- payload de ficha inicial
- timeline visible
- dirty state
- local checkpoint metadata
- remote draft metadata

#### `FollowupStageDraft`

- `followupIndex`
- payload del seguimiento
- dirty state
- local checkpoint metadata
- remote draft metadata

#### `FinalSummary`

- estado derivado del caso
- campos consolidados
- banderas de verificación o reparación

## Arquitectura de pantallas

### 1. Entrada del módulo

Pantalla inicial:

- abrirse desde el hub como cualquier otro formulario
- abrir en pestaña nueva igual que los demás formularios
- buscar vinculado por cédula
- cargar empresa asociada
- confirmar `Compensar / No Compensar`
- preparar caso
- mostrar resumen de estado
- CTA principal: `Continuar donde voy`

#### UX objetivo de entrada

La experiencia debe sentirse cercana a los demás formularios del sistema:

- el usuario entra desde `/hub`
- hace click en `Seguimientos`
- se abre su editor propio
- en vez de buscar empresa, busca por `cédula`

Después de elegir la cédula:

- se resuelve el caso
- se muestra la información empresarial que alimenta la ficha inicial
- se carga directamente la `Ficha inicial`

Esto evita una pantalla intermedia demasiado distinta al resto del sistema.

### 2. Editor del caso

Un solo shell visual con:

- header del caso
- selector / nav de etapas
- tarjeta de estado del caso
- contenido de una etapa a la vez
- estado visible de draft
- CTA `Guardar etapa`
- CTA `Generar PDF`

#### Selector de etapas

El selector debe permitir cambiar entre:

- `Ficha inicial`
- `Seguimiento 1`
- `Seguimiento 2`
- `Seguimiento 3`
- ...
- `Resultado final`

Pero el sistema debe:

- sugerir siempre una etapa de inicio
- dejar protegidas por defecto las etapas ya diligenciadas
- permitir override explícito para corrección

### 3. Etapas visibles

- `Ficha inicial`
- `Seguimiento actual`
- `Historial`
- `Resultado final`

No hace falta exponer técnicamente “hoja base”, “SEGUIMIENTO PROCESO IL 2”, etc.

## Reglas de edición recomendadas

### Ficha inicial

Si no ha sido diligenciada:

- editable normal

Si ya fue diligenciada:

- protegida por defecto
- desbloqueable con `Override`

Readonly:

- timeline histórica salvo las fechas derivadas del estado del caso

### Seguimiento sugerido

Editable completo.

### Seguimientos previos

Por defecto:

- readonly/protegidos

Si el usuario activa `Override`:

- mostrar alerta
- pedir confirmación
- habilitar edición de esa etapa

#### Comportamiento esperado del override

El override no debe ser una configuración global del caso.

Debe ser:

- por etapa
- explícito
- reversible al salir o recargar
- acompañado de advertencia clara

Texto sugerido de intención:

- “Esta etapa ya tiene información diligenciada. Solo continúa si necesitas corregirla.”

### Resultado final

Siempre readonly.

## Estrategia de PDF

### Reglas funcionales

El diálogo debe ofrecer:

- `Solo ficha inicial`
- `Ficha inicial + Seguimiento 1`
- `Ficha inicial + Seguimiento 2`
- ...

Solo deben aparecer como opción los seguimientos realmente existentes o pertinentes para exportar.

### Reglas de UX

- mostrar claramente qué se va a generar
- no hablar en términos de hojas
- mostrar fecha del seguimiento cuando exista

## Estrategia de persistencia

### Local

Mantener autosave local inmediato:

- por etapa activa
- debounce corto
- restauración rápida tras refresh o cierre accidental

### Remota

Mantener draft remoto, pero con identidad de caso:

- draft del caso
- etapa activa
- payload base
- followups tocados
- metadata de lock

### Remota a Google Sheets

Escritura solo en acciones explícitas:

- `Guardar ficha inicial`
- `Guardar seguimiento`

Al guardar seguimiento:

- escribir hoja del seguimiento
- escribir fecha correspondiente en la ficha inicial
- refrescar estado del caso

## Estrategia de sugerencia de etapa

### Regla principal

La etapa sugerida no debe calcularse viendo si “la hoja tiene algo”.

Debe calcularse viendo si las **celdas realmente editables y relevantes de esa etapa** ya tienen contenido útil.

Esto es importante porque:

- la hoja puede tener fórmulas
- la hoja puede tener labels o contenido de plantilla
- la hoja puede tener datos heredados que no significan que esa etapa ya fue diligenciada por el profesional

### Recomendación concreta

Para cada etapa debe existir un contrato explícito:

- `trackedWritableFields`
- `minimumRequiredFields`
- `completionHeuristic`

Ejemplo:

#### `Ficha inicial`

- evaluar solo campos que el profesional diligencia realmente
- ignorar fórmulas, labels y datos estructurales del template

#### `Seguimiento N`

- evaluar solo celdas de entrada del seguimiento:
  - fecha
  - modalidad
  - tipo de apoyo
  - autoevaluaciones
  - evaluaciones de empresa
  - textos largos
  - asistentes

No contar:

- datos calculados
- celdas espejo
- fórmulas

### Orden de sugerencia

Regla recomendada:

1. si la ficha inicial no tiene sus campos mínimos, sugerir `Ficha inicial`
2. si la ficha inicial está lista pero `Seguimiento 1` no, sugerir `Seguimiento 1`
3. luego sugerir el primer seguimiento cuya estructura editable aún no esté completa
4. si todos están completos, sugerir `Resultado final`

Esto encaja mejor con lo que describes que una simple lectura de “ocupación” total de la hoja.

## Estrategia de consolidado

### Recomendación

No dejar el consolidado como caja negra de fórmulas.

V1 mínima aceptable:

- verificar existencia y consistencia estructural de la hoja final
- detectar si la estructura está rota
- informar o reparar en backend

V2 ideal:

- derivar el consolidado desde los datos del caso
- escribir explícitamente los campos necesarios

## Propuesta de API interna

### Rutas de dominio

- `POST /api/seguimientos/case/bootstrap`
- `GET /api/seguimientos/case/[caseId]`
- `POST /api/seguimientos/case/[caseId]/base/save`
- `POST /api/seguimientos/case/[caseId]/followups/[index]/save`
- `POST /api/seguimientos/case/[caseId]/override`
- `POST /api/seguimientos/case/[caseId]/pdf`
- `POST /api/seguimientos/case/[caseId]/summary/refresh`

No necesariamente tienen que llamarse así, pero la separación de responsabilidades sí debería existir.

## Fases de implementación sugeridas

### F1. Modelo y bootstrap

- entidad de caso
- lookup de vinculado
- confirmación de empresa
- `Compensar / No Compensar`
- creación/reutilización de carpeta + Sheet
- carga de workflow inicial

### F2. Editor base + drafts

- shell visual
- ficha inicial
- draft local
- draft remoto de caso
- locks/takeover

### F3. Seguimientos

- seguimiento 1..N
- copiar anterior
- actualización de fecha en ficha inicial
- override para historial

### F4. PDF + consolidado

- diálogo de exportación
- `ficha inicial` / `ficha inicial + seguimiento`
- verificación del consolidado

### F5. Hardening

- QA de correcciones históricas
- QA de override
- QA multi-dispositivo
- QA de recuperación de draft

## Decisión final con tu contexto

Tu contexto refuerza estas decisiones:

1. `Seguimientos` debe ser módulo de caso, no formulario largo simple.
2. La ficha inicial y `Seguimiento 1` deben modelarse como etapas separadas, pero estrechamente acopladas.
3. El PDF siempre debe incluir la ficha inicial.
4. El `override` es mejor que el bloqueo rígido del Legacy.
5. El prewarm aquí sí puede entrar desde V1 como bootstrap del caso, porque el problema es simple y aporta mucho valor operativo.

## Siguiente paso recomendado

Con este documento ya podemos pasar a un entregable más técnico:

1. definir el contrato TypeScript del caso y de cada etapa
2. definir las rutas reales de API
3. diseñar el storage del draft remoto
4. decidir cómo se representa el consolidado en backend
5. partir la implementación por fases
