---
name: Selección y Contratación — F0 de alineación canónica
description: Contraste legacy vs maestro vivo y definición del target web para los formularios con personas repetibles
type: working-note
updated: 2026-04-15
---

## Objetivo de F0

Cerrar el estado canónico antes de tocar UI o API para `seleccion` y `contratacion`:

- contrastar `legacy` vs maestro vivo
- identificar drift real de mapping y layout
- definir el contrato web objetivo
- dejar acotado el alcance de `F1`

## Fuentes revisadas

- Legacy:
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\seleccion_incluyente\seleccion_incluyente.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\contratacion_incluyente\contratacion_incluyente.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\completion_payloads.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\google_sheets_client.py`
- Soporte secundario:
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\docs\cell_maps\03_seleccion_incluyente.txt`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\docs\cell_maps\04_contratacion_incluyente.txt`
- Tests legacy:
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\tests\test_seleccion_incluyente_templates.py`
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\tests\test_contratacion_incluyente_templates.py`
- Web actual:
  - [forms.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/forms.ts)
  - [LongFormShell.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/LongFormShell.tsx)
  - [sheets.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/google/sheets.ts)
  - [companySpreadsheet.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/google/companySpreadsheet.ts)
  - [payloads.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/finalization/payloads.ts)
- Verificación del maestro vivo:
  - `npm run verify:mapping -- --list-sheets`
  - `npm run verify:mapping -- --sheet-name "4. SELECCIÓN INCLUYENTE"`
  - `npm run verify:mapping -- --sheet-name "5. CONTRATACIÓN INCLUYENTE"`

## Decisiones transversales cerradas

### 1. Fuente de verdad

- El maestro vivo de Google Sheets prevalece sobre el runtime legacy y sobre `docs/cell_maps/*`.
- Si `legacy` y maestro difieren, la web debe seguir el maestro.

### 2. Desarrollo de la actividad

- `desarrollo_actividad` queda como **campo único de nivel formulario**.
- No queda atado a cada oferente o vinculado.
- No se replica en el estado cliente por fila.
- Se escribe una sola vez en la celda compartida del template:
  - `Seleccion`: `A14`
  - `Contratacion`: `A15`

### 3. Patrón UX objetivo

- Ambos formularios nacen como **documento largo de una sola página**.
- La sección repetible vive dentro del documento como cards por persona:
  - `Oferente 1`, `Oferente 2`, etc.
  - `Vinculado 1`, `Vinculado 2`, etc.
- No se implementa wizard nuevo.

### 4. Contrato de asistentes

- Para ambos formularios el target web queda en modo `reca_plus_generic_attendees`.
- Razón:
  - el template muestra filas genéricas de `Nombre completo / Cargo`
  - no hay una fila visualmente reservada para `Asesor Agencia`
  - permite respetar el conteo base de filas sin forzar una semántica que el maestro no exhibe

### 5. Salidas del formulario

- Ambos deben seguir generando:
  - Google Sheet final
  - PDF final
  - registro en `formatos_finalizados_il`
- La pantalla final debe ser homogénea con el resto del sistema.

### 6. Alcance de V1

- V1 prioriza paridad operativa, no helpers extra del legacy.
- Los textos sugeridos o botones de inserción rápida del legacy no bloquean la migración.
- Si se recuperan, deben entrar como mejora posterior sobre un textarea simple, no como dependencia de la finalización.

## Selección incluyente

### Estado actual contrastado

| Área | Legacy | Maestro vivo 2026-04-15 | Target web | Decisión F0 |
|---|---|---|---|---|
| Sección 1 | Incluye `caja_compensacion` y `profesional_asignado` en la definición de campos | La pestaña viva ya no muestra esos campos; la sección 1 termina antes del bloque 2 | Mostrar y exportar solo el bloque visible del maestro | El mapping de Sheets debe seguir el maestro; `legacy` queda como apoyo histórico |
| Título y layout | Runtime usa hoja unificada con bloque por oferente | El maestro real usa `4. SELECCIÓN INCLUYENTE` y mantiene un bloque repetible completo | Reusar una sola hoja con duplicación de bloques | Se mantiene hoja unificada |
| Desarrollo de la actividad | Terminó compartiéndose para todos | Sigue existiendo como celda única en `A14` | Campo largo único de formulario | Cerrado |
| Oferentes | Array dinámico, mínimo 1, 91 campos mapeados por bloque | El bloque repetible sigue vigente | Cards repetibles dentro de una sola sección | Cerrado |
| Ajustes y recomendaciones | Sección 5 se desplaza según número de oferentes | Sigue desplazándose desde la fila 77 | Sección única posterior al array | Cerrado |
| Asistentes | Base de 2 filas | El maestro confirma 2 filas base (`84`, `85`) | `RECA + asistentes libres` | Cerrado |
| PDF | Individual y grupal | El template y el flujo final siguen siendo PDF + Sheet | Mantener ambos outputs | Cerrado |

### Drift relevante

1. El `legacy` todavía conserva campos de sección 1 que el maestro vivo ya no exhibe.
2. `docs/cell_maps/03_seleccion_incluyente.txt` sigue siendo útil como apoyo, pero ya no es fuente primaria.
3. El motor web actual aún no soporta clonar bloques completos de 61 filas dentro de la misma pestaña.

### Estructura web objetivo

1. `Empresa`
2. `Desarrollo de la actividad`
3. `Oferentes`
4. `Ajustes y recomendaciones`
5. `Asistentes`

### Notas operativas

- Cada oferente debe conservar su bloque completo de caracterización.
- La validación mínima útil es:
  - al menos un oferente significativo
  - `desarrollo_actividad` obligatorio si existe al menos un oferente
  - asistentes con `nombre + cargo` por fila usada
- El payload normalizado debe preservar la lista de participantes y `cargo_objetivo` cuando sea un valor único.

## Contratación incluyente

### Estado actual contrastado

| Área | Legacy | Maestro vivo 2026-04-15 | Target web | Decisión F0 |
|---|---|---|---|---|
| Sección 1 | Incluye `caja_compensacion` y `profesional_asignado` | El maestro vivo sí conserva ambos campos | Mantener snapshot alineado a la hoja viva | Cerrado |
| Título y layout | Hoja unificada con bloque por vinculado | La pestaña viva `5. CONTRATACIÓN INCLUYENTE` sigue esa estructura | Reusar una sola hoja con duplicación de bloques | Cerrado |
| Desarrollo de la actividad | Existe como campo compartido | Sigue existiendo como celda única en `A15` | Campo largo único de formulario | Cerrado |
| Vinculados | Array dinámico, mínimo 1, 69 campos mapeados por bloque | El bloque repetible sigue vigente | Cards repetibles dentro de una sola sección | Cerrado |
| Ajustes y recomendaciones | Sección 6 se desplaza según el número de vinculados | El maestro la conserva desde la fila 69 | Sección única posterior al array | Cerrado |
| Asistentes | Base de 4 filas | El maestro confirma 4 filas base (`75` a `78`) | `RECA + asistentes libres` | Cerrado |
| PDF | Individual y grupal | El flujo final sigue siendo Sheet + PDF | Mantener ambos outputs | Cerrado |

### Drift relevante

1. Aquí el drift entre `legacy` y maestro es menor que en `Seleccion`.
2. El reto principal no es mapping sino infraestructura de Sheets:
   - bloque repetible de 52 filas
   - preservación de alturas
   - exclusiones de auto-resize

### Estructura web objetivo

1. `Empresa`
2. `Desarrollo de la actividad`
3. `Vinculados`
4. `Ajustes y recomendaciones`
5. `Asistentes`

### Notas operativas

- `grupo_etnico_cual` debe seguir la normalización del legacy:
  - si `grupo_etnico != Si`, queda `No aplica`
- La validación mínima útil es:
  - al menos un vinculado significativo
  - `desarrollo_actividad` obligatorio si existe al menos un vinculado
  - `ajustes_recomendaciones` obligatorio
  - asistentes con `nombre + cargo` por fila usada

## Brecha técnica cerrada por F0

`Seleccion` y `Contratacion` no pueden montarse solo con el contrato actual de [sheets.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/google/sheets.ts).

Hoy el repo web resuelve bien:

- escritura de celdas
- inserción de filas simples
- validaciones checkbox
- auto-resize de filas escritas

Pero para estos formularios todavía falta soportar:

- duplicación de un bloque completo del template dentro de la misma pestaña
- repetición del bloque `N-1` veces
- copiado de alturas de fila del bloque base
- exclusión explícita de filas estructurales en auto-resize

Eso convierte `F1` en una fase de infraestructura, no de UI.

## Alcance de F1

`F1` debe dejar listo el motor compartido para ambos formularios:

1. Extender `FormSheetMutation` con un contrato de **template block duplication**.
2. Implementarlo en [sheets.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/google/sheets.ts).
3. Mantener compatibilidad con las inserciones simples ya usadas por `condiciones-vacante`.
4. Cubrir tests para:
   - bloque repetido
   - copia de alturas
   - exclusiones de auto-resize
   - convivencia con `prepareCompanySpreadsheet`

## Checklist de salida de F0

- [x] Contraste `legacy vs maestro vivo` documentado para `Seleccion`
- [x] Contraste `legacy vs maestro vivo` documentado para `Contratacion`
- [x] Decisión cerrada: `desarrollo_actividad` único a nivel formulario
- [x] Decisión cerrada: modo de asistentes genérico
- [x] Estructura objetivo del documento largo definida para ambos
- [x] Alcance técnico de `F1` delimitado
