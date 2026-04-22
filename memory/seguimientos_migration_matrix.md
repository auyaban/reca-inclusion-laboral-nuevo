# Matriz de migración — Seguimientos

Fecha: 2026-04-21
Base: [seguimientos_legacy_inventory.md](./seguimientos_legacy_inventory.md)

## Criterios de decisión

Esta matriz está optimizada para la plataforma nueva, no para copiar Legacy.

Objetivos prioritarios:

1. más profesional
2. más amigable con el usuario
3. más rápida
4. más confiable
5. lo más homogénea posible con el stack web actual

Principio rector:

`Seguimientos` debe heredar todo lo shared que sí aporte seguridad operativa y consistencia, pero sin forzarlo a encajar como si fuera un formulario largo normal.

## Decisión general

### Qué es `Seguimientos` en web

`Seguimientos` debe implementarse como un **módulo de caso multi-etapa** con:

- un shell visual homogéneo con los long forms
- persistencia shared de drafts
- validación shared con Zod + React Hook Form
- integraciones shared de Google/Supabase

Pero no debe modelarse como:

- un solo formulario lineal
- un submit/finalización único al final del caso
- una copia literal del runtime especial de Tkinter

## Matriz principal

| Área | Decisión | Recomendación para web | Motivo |
|---|---|---|---|
| Caso por vinculado | `Mantener` | La entidad principal sigue siendo el caso por `cedula`, no la empresa ni una sola acta. | Es la lógica real del proceso y organiza bien base, seguimientos e historial. |
| Distinción `Compensar / No Compensar` | `Mantener` | Conservar `6` vs `3` seguimientos visibles, pero como regla de dominio explícita, no implícita en la UI. | Sigue siendo una regla operativa central. |
| Flujo por etapas amigables | `Mantener y mejorar` | Mantener `Identificar vinculado`, `Confirmar empresa`, `Ficha inicial`, `Seguimiento actual`, `Historial`, `Resultado final`. | Ya resuelve una fricción real del Legacy y encaja bien con la UX web. |
| Editor por etapa | `Mantener` | Seguir editando una etapa a la vez. | Reduce carga cognitiva y evita pantallas gigantes con demasiadas reglas cruzadas. |
| Historial editable | `Mantener con guardrails` | Permitir corregir seguimientos previos, pero protegidos por defecto y habilitados solo con `override` + confirmación. | Legacy privilegia corrección sobre bloqueo; en web conviene proteger sin prohibir. |
| `Resultado final` solo lectura | `Mantener con cambio interno` | Mantenerlo readonly en UI, pero dejar de depender ciegamente de fórmulas rotas en Sheets. | La UI readonly es correcta; la implementación actual no es confiable. |
| Criterio de etapa sugerida | `Mantener con cambio` | Mantener una sola etapa sugerida, pero recalcularla desde reglas de dominio tipadas en web. | El concepto funciona; el cálculo legacy por cobertura debe endurecerse. |
| Coverage `90%` | `Cambiar` | No usarlo como única verdad. Combinar cobertura + hitos mínimos por etapa. | `90%` solo es una heurística de completitud, no una validación de negocio robusta. |
| Ficha base + timeline readonly | `Mantener` | Mantener la línea de tiempo visible en la ficha base, pero alimentada por el estado del caso, no solo por celdas espejo. | Es útil para orientación y contexto. |
| Copiar seguimiento anterior | `Mantener` | Conservar la acción y la regla actual: copia datos operativos, pero no fecha ni textos largos. | Es una mejora real de productividad. |
| Acciones rápidas para evaluaciones | `Mantener` | Reutilizar el patrón de bulk actions en la web. | Ahorra tiempo y reduce diligenciamiento repetitivo. |
| Confirmación de sobreescritura | `Mantener y simplificar` | Mantener warning antes de pisar datos existentes, idealmente con diff más claro por etapa. | Protege correcciones sin bloquearlas. |
| PDF base o base + seguimiento | `Mantener con simplificación` | Conservar esas dos opciones en V1. | Es un alcance acotado y ya probado operativamente. |
| Registro de completion por seguimiento | `Mantener con adaptación` | Mantener trazabilidad por seguimiento guardado, pero con contrato web propio. | `Seguimientos` no tiene una sola finalización global como los demás formularios. |
| Dependencia de fórmulas del consolidado | `Eliminar` | El consolidado no debe depender exclusivamente de fórmulas manuales frágiles. | Hoy es uno de los riesgos más claros del Legacy. |
| Runtime especial de drafts fuera del sistema shared | `Eliminar` | No crear un segundo sistema paralelo de drafts en web. | Va contra homogeneidad, mantenibilidad y confiabilidad. |
| Fallback ambiguo al template master | `Eliminar` | `Seguimientos` debe tener template explícito y dedicado. | La ambigüedad actual es deuda técnica y riesgo de drift. |
| Visibilidad inconsistente entre `max_seguimientos` y hojas reales | `Eliminar` | La visibilidad del caso y la estructura del spreadsheet deben salir del mismo modelo. | Hoy UI y Sheet pueden divergir. |
| Búsqueda manual de empresa escondida en el editor | `Cambiar` | La resolución de empresa debe vivir en la entrada del caso y, si se permite editar, hacerlo explícito y auditado. | Hoy hay drift y comportamiento confuso. |

## Capacidades shared del stack nuevo

### Recomendación explícita

| Capacidad shared | Decisión | Cómo aplicarla en `Seguimientos` |
|---|---|---|
| `React Hook Form + Zod` | `Mantener` | Sí, pero por etapa. Un schema para la ficha base y otro por seguimiento. |
| `LongFormShell` visual | `Mantener con adaptación` | Sí para look & feel, navegación lateral, estados y feedback. No como “formulario único”. |
| `LongFormSectionNav` / cards / editor boundary | `Mantener` | Sí, porque ayudan a homogeneidad visual y errores controlados. |
| `DraftPersistenceStatus` y `DraftLockBanner` | `Mantener` | Sí. Son parte del estándar de confiabilidad y estado visible. |
| autosave local inmediato | `Mantener` | Sí, absolutamente. Debe seguir existiendo guardado local rápido y automático. |
| draft remoto | `Mantener con cambio de modelo` | Sí, pero como draft del caso + etapa activa, no como draft plano de un único formulario. |
| takeover / locks | `Mantener` | Sí, especialmente en un módulo donde varias correcciones pueden reabrirse. |
| prewarm | `Cambiar` | Sí como concepto, pero como `bootstrap de caso` y no con la semántica exacta de los long forms actuales. |
| finalization pipeline actual | `Cambiar` | No hay una única finalización. Debe haber `guardar etapa`, `actualizar consolidado` y `exportar PDF`. |

## Qué sí mantendría del estándar shared

### Mantener casi tal cual

- `RHF + Zod`
- componentes shared de estado de draft
- autosave local rápido
- control de locks / takeover
- navegación lateral y tarjetas visuales
- API routes para Google y lógica sensible
- prohibición de tocar Supabase directo desde componentes para operaciones sensibles

### Mantener, pero adaptado a `Seguimientos`

- `LongFormShell`
- persistencia remota de drafts
- idempotencia de operaciones críticas
- prewarm
- pantalla de éxito o acciones finales

## Decisión sobre guardado local, draft remoto y guardado por keystroke

### 1. Guardado local por keystroke

Decisión: `Mantener`

Recomendación:

- autosave local con debounce corto
- por etapa activa
- sin esperar red
- visible en UI con el mismo patrón de estado que los long forms

Esto sí vale totalmente la pena mantener.

### 2. Draft remoto

Decisión: `Mantener con adaptación`

Recomendación:

- no modelarlo como “un draft por formulario”
- modelarlo como **un draft del caso**, con:
  - identidad del caso
  - tipo de empresa
  - etapa activa
  - payload base
  - payloads de seguimientos ya tocados
  - metadata de conflicto/lock

Esto permite:

- continuar en otro dispositivo
- mantener homogeneidad con el hub de borradores
- no perder el estado multi-etapa real

### 3. Guardado remoto por keystroke

Decisión: `No mantener tal cual`

Recomendación:

- sí a la percepción de seguridad “se está guardando”
- no a escribir Google Sheets en cada tecla
- usar:
  - local autosave por keystroke
  - checkpoints remotos batched del draft
  - escritura a Sheets solo al `Guardar etapa`

Motivo:

- escribir Sheets por keystroke volvería el módulo lento, caro y frágil
- rompe confiabilidad en una pieza que ya es más compleja que los demás formularios

En otras palabras:

- `keystroke -> local + checkpoint draft`
- `Guardar etapa -> Google Sheets`

## Decisión sobre prewarm

### Recomendación

Decisión: `Mantener el concepto, cambiar la implementación`

El prewarm actual del proyecto está pensado para formularios largos que terminan generando un spreadsheet provisional por draft y luego lo finalizan.

`Seguimientos` no funciona así:

- no crea una sola acta nueva al final
- trabaja sobre un caso persistente
- escribe por etapas
- puede corregir historial

### Qué haría

#### V1

- no haría depender `Seguimientos` del prewarm actual de finalización
- sí implementaría un `case bootstrap prewarm` desde V1:
  - resolver si el caso existe
  - si no existe, crear carpeta + Sheet + metadata del caso
  - si existe, reutilizar carpeta + Sheet
  - dejar listo el caso antes de abrir editor

#### V2

- evaluar un prewarm específico de `Seguimientos`
- no como “spreadsheet provisional por draft”
- sino como:
  - preparación temprana del caso
  - verificación estructural del Sheet
  - reparación de hojas faltantes / nombres / metadata

Conclusión:

- sí al valor del prewarm
- no a reusar sin más la implementación actual

## Qué cambiaría de fondo respecto a Legacy

### 1. Modelo de datos

Legacy piensa mucho en hoja/celda.
Web debe pensar primero en:

- `Case`
- `BaseStage`
- `FollowupStage[]`
- `FinalSummary`

Y luego mapear eso a Sheets.

### 2. Persistencia

Legacy mezcla:

- estado del caso
- autosave local
- escritura remota
- fórmulas del consolidado

Web debe separar:

1. draft del caso
2. estado persistido del caso
3. proyección a Google Sheets
4. consolidado calculado o verificado

### 3. Consolidado final

Recomendación:

- UI readonly
- backend con responsabilidad explícita sobre el consolidado

Opciones, en orden de preferencia:

1. recalcular el consolidado desde datos del caso y escribirlo explícitamente
2. reparar/verificar fórmulas de la hoja al guardar
3. dejarlo 100% a fórmulas manuales

Mi recomendación es `1` o, si eso es mucho para el primer corte, `2`.

### 4. Reglas de edición

Web debe tener una matriz explícita de edición, no solo comportamiento emergente.

Ejemplo:

- `Ficha base`
  - editable: datos propios de la ficha
  - readonly: timeline histórica salvo la fecha habilitada si la regla lo exige
- `Seguimiento sugerido`
  - totalmente editable
- `Seguimiento previo`
  - editable con warning de corrección histórica
- `Resultado final`
  - readonly siempre

## Matriz de producto

| Tema | Mantener | Eliminar | Cambiar | Mejorar |
|---|---|---|---|---|
| Caso por vinculado | Sí |  |  |  |
| `Compensar / No Compensar` | Sí |  | Formalizarlo como regla de dominio |  |
| Etapa sugerida única | Sí |  | Endurecer cálculo | Mejor feedback visual |
| Historial editable | Sí |  | Con guardrails claros y `override` explícito | Mejor contexto de “corrección” |
| UI por etapas visibles | Sí |  |  | Mejor shell web y navegación |
| `PONDERADO FINAL` readonly | Sí | Dependencia ciega de fórmulas | Implementación interna | Confiabilidad del consolidado |
| Copiar seguimiento previo | Sí |  |  | Mejor CTA y diff de lo copiado |
| Acciones rápidas de evaluación | Sí |  |  | Mejor ergonomía |
| Draft local especial Legacy |  | Sí | Reemplazar por sistema shared |  |
| Draft remoto | Sí |  | Re-modelar como draft de caso |  |
| Guardado local por keystroke | Sí |  |  |  |
| Escritura a Sheets por keystroke |  | Sí |  |  |
| `Guardar etapa` explícito | Sí |  |  |  |
| Template ambiguo |  | Sí | Template dedicado |  |
| Visibilidad inconsistente de hojas |  | Sí | Modelo único para UI + Sheet |  |
| Prewarm | Concepto sí | Reuso literal del actual | Prewarm de caso, no de finalización | Mejor bootstrap y reutilización del bundle existente |

## Recomendación de alcance

### V1

Objetivo: dejar `Seguimientos` usable, homogéneo y confiable sin sobreingeniería.

Incluir:

- módulo de caso multi-etapa
- lookup de vinculado
- confirmación de empresa y tipo `Compensar / No Compensar`
- creación/reutilización del caso
- ficha base
- seguimientos 1..N
- historial editable
- borrador local inmediato
- draft remoto del caso
- locks/takeover
- guardado explícito por etapa
- PDF `base` o `base + seguimiento`
- consolidado readonly con verificación mínima

No incluir en V1:

- prewarm finalization-style reutilizado tal cual
- escritura remota a Sheets por cada cambio
- dependencia ciega en fórmulas legacy

### V2

- prewarm específico de caso
- consolidado recalculado desde backend
- auditoría/reparación estructural del spreadsheet
- reglas de edición más finas por rol o estado

## Recomendación técnica concreta

### Arquitectura propuesta

1. `Seguimientos` como slug propio con runtime propio dentro del repo web.
2. Un estado de caso tipado:
   - `caseMeta`
   - `baseDraft`
   - `followupDrafts`
   - `workflow`
   - `finalSummary`
3. RHF + Zod por etapa, no un mega-form único.
4. Persistencia shared de drafts, pero con identidad de caso.
5. Adapter Google Sheets por etapa:
   - `saveBaseStage`
   - `saveFollowupStage(index)`
   - `refreshFinalSummary`
6. Shell visual shared para conservar homogeneidad.

## Mi decisión sobre tus preferencias

Tu intención de mantener:

- prewarm
- guardado local en sesión
- draft remoto
- guardado “por keystroke”

me parece correcta, con este ajuste:

- `sí` a mantener la experiencia de seguridad y homogeneidad
- `no` a copiar literalmente el mecanismo actual cuando choca con el modelo multi-etapa

La traducción correcta para `Seguimientos` sería:

- `guardado por keystroke`:
  - sí local
  - sí checkpoint draft
  - no directo a Sheets
- `draft remoto`:
  - sí, pero por caso
- `prewarm`:
  - sí como bootstrap de caso
  - no como reaprovechamiento ciego del pipeline actual de finalización

## Siguiente paso recomendado

Con esta matriz, el siguiente entregable útil sería una **propuesta de arquitectura de `Seguimientos` en web** con:

1. entidades
2. rutas
3. modelo de drafts
4. modelo de workflow
5. estrategia de consolidado
6. plan de implementación por fases

Ese documento ya nos dejaría listos para entrar a diseño de código sin improvisar reglas en medio del desarrollo.
