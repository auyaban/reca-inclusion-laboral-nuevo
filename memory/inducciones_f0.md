---
name: Inducciones Organizacional y Operativa — F0 de alineación canónica
description: Contraste legacy vs maestro vivo y definición del target web conjunto para los dos formularios de inducción
type: working-note
updated: 2026-04-16
---

## Objetivo de F0

Cerrar el estado canónico antes de tocar UI o API para `induccion-organizacional` y `induccion-operativa`:

- contrastar `legacy` vs maestro vivo
- definir el contrato web objetivo conjunto
- separar qué se resuelve una sola vez y qué queda específico por formulario
- dejar una secuencia de fases ejecutables sin solaparse

## Fuentes revisadas

- Legacy:
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\induccion_organizacional\induccion_organizacional.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\induccion_operativa\induccion_operativa.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\completion_payloads.py`
- Soporte de mapping:
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\docs\cell_maps\05_induccion_organizacional.txt`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\docs\cell_maps\06_induccion_operativa.txt`
- Web actual:
  - [forms.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/forms.ts)
  - [longFormHydration.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/longFormHydration.ts)
  - [payloads.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/payloads.ts)
  - [usuariosReca.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/usuariosReca.ts)
  - [prefixedDropdowns.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/prefixedDropdowns.ts)
  - [AsistentesSection.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/AsistentesSection.tsx)
  - [UsuarioRecaLookupField.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/UsuarioRecaLookupField.tsx)
  - [LongTextField.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongTextField.tsx)

## Decisiones transversales cerradas

### 1. Patrón UX objetivo

- Ambos formularios nacen como **documento largo de una sola página**.
- No se implementa wizard nuevo.
- Ambos deben entrar a `LONG_FORM_SLUGS` y usar el mismo contrato de drafts, navegación lateral, confirmación previa y pantalla final homogénea.

### 2. Solo un vinculado en web

- Aunque el legacy permite múltiples filas en `section_2`, la web solo debe permitir **1 vinculado** por formulario.
- El estado cliente objetivo debe tratar ese bloque como `vinculado` singular, no como array editable por el usuario.
- Si el pipeline server-side o el payload normalizado necesita lista, se adaptará internamente como arreglo singleton en la capa de finalización.

### 3. Impacto técnico en Google Sheets

- Al limitar la web a un solo vinculado, estas dos migraciones **no necesitan** la infraestructura de duplicación de bloques del template usada por `Seleccion` y `Contratacion`.
- Sí se mantiene el crecimiento dinámico de asistentes por encima de las 4 filas base del template.
- Las posiciones vivas a respetar siguen siendo:
  - `Inducción Organizacional` → hoja `6. INDUCCIÓN ORGANIZACIONAL`
  - `Inducción Operativa` → hoja `7. INDUCCIÓN OPERATIVA`

### 4. Contrato de `usuarios_reca`

- El lookup del vinculado debe reutilizar el patrón web low-egress actual:
  - búsqueda manual por cédula
  - sin prefetch agresivo
  - carga explícita por botón
  - sin polling
- La precarga debe salir de `mapUsuarioRecaToInduccionPrefill()` ya disponible en [usuariosReca.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/usuariosReca.ts).
- Campos de prefill cerrados para inducciones:
  - `cedula`
  - `nombre_oferente`
  - `telefono_oferente`
  - `cargo_oferente`
- En V1 el uso de `usuarios_reca` queda **solo lectura**. No se fuerza sync best-effort al finalizar salvo requerimiento nuevo.

### 5. Contrato visual compartido

- `Empresa`, `Vinculado`, `Observaciones` y `Asistentes` deben verse coherentes entre ambos formularios y con `Sensibilización`, `Selección` y `Contratación`.
- No se crean dos estilos distintos de chips, dropdowns, headers o botones masivos.
- Si aparece UI nueva, debe salir de un bloque shared o de variantes mínimas sobre componentes existentes.

### 6. Observaciones y textos largos

- `Observaciones` y cualquier bloque narrativo largo deben salir con `LongTextField`.
- Deben llevar:
  - textarea autoexpandible
  - botón de dictado
  - mismo estilo de foco/error del resto del proyecto

### 7. Contrato de asistentes

- Ambos formularios usarán `AsistentesSection` con modo `reca_plus_generic_attendees`.
- Razón:
  - el template escribe asistentes genéricos en columnas `C/L`
  - no hay una fila especial de asesor en la hoja
  - coincide con tu instrucción de que “asistentes debe ser como es en web para todos”

### 8. Botones masivos y dropdowns legacy

- Los botones masivos sí hacen parte del alcance de paridad.
- No se rediseñan como una mejora futura: deben entrar desde la migración funcional.
- Como el source Python no deja el naming de esos botones tan explícito como el mapping de datos, la implementación debe partir de inventario visual contra el runtime legacy antes de cerrar UI.

## Estructura web objetivo

## Inducción Organizacional

1. `Empresa`
2. `Vinculado`
3. `Desarrollo del proceso`
4. `Ajustes razonables al proceso de inducción`
5. `Observaciones`
6. `Asistentes`

## Inducción Operativa

1. `Empresa`
2. `Vinculado`
3. `Desarrollo del proceso de inducción operativa`
4. `Habilidades socioemocionales`
5. `Nivel de apoyo requerido`
6. `Ajustes razonables requeridos`
7. `Primer seguimiento establecido`
8. `Observaciones / recomendaciones`
9. `Asistentes`

## Contraste por formulario

## Inducción Organizacional

### Estado actual contrastado

| Área | Legacy / maestro | Target web | Decisión F0 |
|---|---|---|---|
| Sección 1 | Mantiene el mismo snapshot amplio de empresa (`fecha_visita`, `modalidad`, `empresa`, `contacto`, `caja_compensacion`, `asesor`, `profesional_asignado`) | Reusar snapshot vivo completo | Cerrado |
| Vinculado | Legacy permite varias filas y corre el resto de la hoja | 1 solo vinculado en web | Cerrado |
| Desarrollo del proceso | Matriz grande con `visto`, `responsable`, `medio_socializacion`, `descripcion` | Mantener matriz completa en web | Cerrado |
| Ajustes razonables | 3 filas con dropdown `medio` y recomendación derivada por fórmula en Sheets | Mostrar dropdown + recomendación visible también en web | Cerrado |
| Observaciones | Texto largo único | `LongTextField` + dictado | Cerrado |
| Asistentes | 4 filas base, genéricos | `AsistentesSection` web | Cerrado |

### Reglas y hallazgos relevantes

- `section_3` es la parte más densa del formulario y necesita botones masivos por subsección para no volver la UI inviable.
- `medio_socializacion` ya tiene catálogo legacy:
  - `Video`
  - `Documentos escritos`
  - `Imagenes`
  - `Presentaciones`
  - `Mixto`
  - `Exposicion oral`
  - `No aplica`
- `section_4` ya trae medios y recomendaciones operativas cerradas en legacy:
  - `Video`
  - `Documentos Escritos, Presentaciones, Imagenes y Evaluaciones escritas`
  - `Plataformas`
  - `No aplica`
- En Sheets, la recomendación de `section_4` se resuelve por fórmula en columna `G`, pero en la web debe verse explícitamente para que el usuario no diligencie a ciegas.

## Inducción Operativa

### Estado actual contrastado

| Área | Legacy / maestro | Target web | Decisión F0 |
|---|---|---|---|
| Sección 1 | Snapshot amplio de empresa, alineado al maestro | Reusar snapshot vivo completo | Cerrado |
| Vinculado | Legacy permite varias filas y desplaza el resto de la hoja | 1 solo vinculado en web | Cerrado |
| Desarrollo del proceso | Items con `ejecucion` + `observaciones` | Mantener matriz completa en web | Cerrado |
| Habilidades socioemocionales | Bloques con `nivel_apoyo`, `observaciones` y `nota` por bloque | Mantener bloques completos | Cerrado |
| Nivel de apoyo requerido | 3 filas con dropdown + observaciones | Mantener bloque completo | Cerrado |
| Ajustes / seguimiento / observaciones | Tres bloques narrativos simples | `LongTextField` y campo fecha donde corresponda | Cerrado |
| Asistentes | 4 filas base, genéricos | `AsistentesSection` web | Cerrado |

### Reglas y hallazgos relevantes

- `section_3` necesita botones masivos legacy para diligenciar varios items sin repetir interacción por fila.
- `section_4` y `section_5` tienen el patrón ideal para reutilizar `prefixedDropdowns.ts`:
  - si un dropdown usa prefijo `0.`, `1.`, `2.`, `3.` o `No aplica`
  - el dropdown acoplado debe moverse al mismo prefijo
- Esto aplica especialmente al caso que mencionaste:
  - si el usuario marca `1` en un dropdown, el otro debe quedar en `1`
  - y lo mismo para `0`, `2`, `3` y `No aplica`
- `section_4` además trae catálogos legacy de observaciones por fila. La web debe tratarlos como dropdowns coherentes, no como texto libre improvisado.

## Fases de implementación propuestas

Las fases están pensadas para que cada una tenga ownership claro, máximo reaprovechamiento y cero solape entre base compartida y slices específicos.

### F1 — Base compartida de inducciones

Objetivo: dejar lista una fundación única para ambos formularios antes de abrir diferencias de negocio.

- agregar ambos slugs a `LONG_FORM_SLUGS`, route entrypoints y lazy loading
- crear módulo shared de inducciones con:
  - defaults
  - normalización
  - snapshot de empresa
  - contrato de `vinculado` singular
  - helpers de `usuarios_reca` para inducciones
- montar sección shared de vinculado con:
  - `UsuarioRecaLookupField`
  - `Cargar/Reemplazar datos`
  - warning visual si se va a reemplazar info ya diligenciada
  - highlight de campos modificados respecto al snapshot cargado
- cerrar contrato shared de textos largos y asistentes
- definir tokens UI de botones masivos y dropdowns para que ambos formularios compartan estética

Salida esperada:

- ambos formularios ya están registrados como long forms
- existe una base shared suficiente para no duplicar empresa, vinculado, dictado ni asistentes
- el lookup de `usuarios_reca` queda resuelto una sola vez

### F2 — Slice completo de Inducción Organizacional

Objetivo: cerrar el formulario organizacional de punta a punta sobre la base shared.

- crear schema, defaults y normalización propios de `induccion-organizacional`
- crear `sections`, `hydration` y `validation target`
- montar `Desarrollo del proceso` con todas sus subsecciones
- portar botones masivos legacy de organizacional
- montar dropdowns coherentes para `medio_socializacion`
- montar `Ajustes razonables` con:
  - dropdown de medios
  - recomendación visible en la web
  - copy coherente con el resto del proyecto
- montar `Observaciones` como textarea largo con dictado
- conectar `AsistentesSection`
- implementar `POST /api/formularios/induccion-organizacional`
  - validación server-side
  - escritura a Sheets
  - PDF
  - registro en `formatos_finalizados_il`

Salida esperada:

- `induccion-organizacional` queda funcional de extremo a extremo
- la recomendación por medio ya no depende solo de mirar la hoja final
- el formulario ya respeta tu requisito de 1 vinculado y lookups manuales low-egress

### F3 — Slice completo de Inducción Operativa

Objetivo: cerrar el formulario operativa de punta a punta sin reabrir problemas ya resueltos en organizacional.

- crear schema, defaults y normalización propios de `induccion-operativa`
- crear `sections`, `hydration` y `validation target`
- montar `Desarrollo del proceso` con botones masivos legacy
- modelar `Habilidades socioemocionales` y `Nivel de apoyo requerido`
- extraer reglas de dropdowns acoplados a un contrato puro sobre `prefixedDropdowns.ts`
- aplicar la sincronización bidireccional en UI para los pares/grupos que lo necesiten
- montar `Ajustes razonables requeridos`, `Primer seguimiento` y `Observaciones / recomendaciones`
- conectar `AsistentesSection`
- implementar `POST /api/formularios/induccion-operativa`
  - validación server-side
  - escritura a Sheets
  - PDF
  - registro en `formatos_finalizados_il`

Salida esperada:

- `induccion-operativa` queda funcional de extremo a extremo
- la lógica “si uno queda en 1, el otro también” ya vive en helpers testeables, no embebida en JSX
- el formulario comparte la base visual y de lookup con organizacional

### F4 — Hardening técnico conjunto

Objetivo: endurecer ambos formularios como lote antes de abrir QA manual.

- tests de defaults y normalización para ambos slugs
- tests de `validation target` para ambos slugs
- tests de helpers de `usuarios_reca` aplicados a inducciones
- tests puros de botones masivos si se extraen como helpers
- tests puros de sincronización de dropdowns prefijados para operativa
- route tests para ambos endpoints
- validación de payload normalizado y attachment final
- revisión de copy visible y `npm run spellcheck`

Salida esperada:

- lote técnico estable
- paridad legacy crítica cubierta por tests
- sin depender de QA manual para detectar regresiones básicas

### F5 — Preview, QA manual y cierre documental

Objetivo: validar el lote en entorno preview antes de commit/push.

- crear preview deployment del worktree actual sin commit si es viable
- entregar link directo al preview y, si aporta, también el inspector
- ejecutar checklist focal de QA para:
  - empresa
  - lookup `usuarios_reca`
  - 1 solo vinculado
  - botones masivos
  - dropdowns acoplados
  - recomendaciones de organizacional
  - dictado en observaciones
  - asistentes
  - finalización y pantalla final
- documentar hallazgos bloqueantes antes de push
- sincronizar `roadmap`, `MEMORY` y la página canónica de Notion que corresponda solo si el lote cambia estado real

Salida esperada:

- lote listo para commit/push o con hallazgos bloqueantes bien documentados
- checklist reutilizable afinado para `Evaluación` y `Seguimientos`

## Dependencias y no-dependencias

### Lo que sí depende de base compartida

- registro long-form de ambos slugs
- snapshot de empresa
- lookup low-egress de `usuarios_reca`
- estilo de botones masivos y dropdowns
- asistentes
- textos largos con dictado

### Lo que no debe bloquear el arranque

- no hace falta nueva infraestructura de bloques repetibles
- no hace falta sync de escritura a `usuarios_reca`
- no hace falta reabrir decisiones de asistentes ni de drafts

## Checklist de salida de F0

- [x] Contraste `legacy vs maestro vivo` documentado para ambos formularios
- [x] Decisión cerrada: solo 1 vinculado en web
- [x] Decisión cerrada: lookup manual low-egress a `usuarios_reca`
- [x] Decisión cerrada: `AsistentesSection` genérica para ambos
- [x] Decisión cerrada: observaciones largas con dictado
- [x] Fases ejecutables sin solaparse definidas para el lote completo
