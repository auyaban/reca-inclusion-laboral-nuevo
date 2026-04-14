---
name: Sensibilización — S0 de convergencia a producción
description: Contraste legacy vs web actual y definición de la estructura final del documento largo
type: working-note
updated: 2026-04-13
---

## Objetivo de S0

Delimitar cómo debe quedar `Sensibilización` antes del refactor a documento largo:

- contrastar `legacy` vs web actual
- identificar drift funcional real
- cerrar la estructura final del documento
- dejar una base clara para S1

> Nota: este documento conserva la fotografía de S0. Varias decisiones iniciales aquí descritas fueron ajustadas en S2; el estado vigente para continuar trabajo está en `memory/sensibilizacion_s3_handoff.md`.

## Fuentes revisadas

- Legacy: `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\sensibilizacion\sensibilizacion.py`
- Validación legacy compartida: `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\formularios\finalize_validation.py`
- Web actual UI: [SensibilizacionForm.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/SensibilizacionForm.tsx)
- Web actual schema: [sensibilizacion.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/validations/sensibilizacion.ts)
- Web actual API: [route.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/app/api/formularios/sensibilizacion/route.ts)

## Verificación del maestro vivo

Se dejó una credencial local ignorada por git en:

- `local-secrets/google-master-mapping-service-account.json`

Y se añadió el script:

- `npm run verify:mapping -- --list-sheets`
- `npm run verify:mapping -- --sheet-name "8. SENSIBILIZACION"`

Con eso ya se validó el template vivo de `Sensibilización`.

## Lo que sí está alineado entre legacy y web

### Estructura base del formulario

El formulario sigue teniendo las mismas 5 secciones funcionales del legacy:

1. `Datos de la empresa`
2. `Presentación de los temas de la sensibilización`
3. `Observaciones`
4. `Registro fotográfico`
5. `Asistentes`

La web actual las implementa como pasos de wizard; el target es mantener ese contenido, pero reubicado dentro de un documento largo.

### Mapping operativo de Sheets

La route web replica el mapping central del legacy para:

- `fecha_visita`, `modalidad`, `nombre_empresa`, `ciudad_empresa`, `direccion_empresa`
- `nit_empresa`, `correo_1`, `telefono_empresa`, `contacto_empresa`
- `cargo`, `asesor`, `sede_empresa`
- `observaciones` en `A26`
- asistentes desde fila `32`, nombre en `C` y cargo en `K`
- crecimiento dinámico de filas a partir de 4 filas base

Conclusión: el pipeline actual ya está operativamente alineado con la lógica principal del legacy y del maestro vivo para sección 1, observaciones y asistentes.

### Secciones informativas sin captura

El legacy no captura datos en:

- sección 2 (`temas`)
- sección 4 (`registro fotográfico`)

La web actual también las trata como bloques informativos, lo cual es consistente.

### Nombre real de la pestaña en el maestro

Se verificó directamente en el spreadsheet maestro:

- nombre real: `8. SENSIBILIZACIÓN`

La búsqueda flexible del script local encuentra también `8. SENSIBILIZACION`, pero el nombre canónico del maestro lleva tilde.

## Drift encontrado

### 1. Patrón de UX

- Legacy: secciones confirmadas por etapas
- Web actual: wizard
- Target aprobado: documento largo

Este es el drift principal y justifica S1.

### 2. Validación de asistentes

Aquí sí hay un drift funcional real:

- legacy: si una fila de asistentes tiene algún dato, exige tanto `nombre` como `cargo`
- web actual: el schema exige `nombre`, pero `cargo` puede quedar vacío

Implicación:

- una fila intermedia con nombre y sin cargo pasa hoy en web
- ese caso habría fallado en el runtime legacy

Decisión propuesta para convergencia:

- **no** crear una variante nueva de asistentes solo para `Sensibilización`
- alinear `Sensibilización` al contrato transversal actual de `AsistentesSection`
- si negocio exige volver a `cargo obligatorio` por fila, debe cerrarse explícitamente antes de S3 porque rompería la reutilización transversal

### 3. Texto fuente de temas

Aquí sí apareció un drift importante entre la web y el maestro vivo.

La web actual muestra una lista resumida de 5 temas:

- objetivo y alcance general
- generalidades del concepto discapacidad
- tipos de discapacidad
- pautas de comunicación e interacción
- impacto en clima laboral y recomendaciones

Pero el maestro vivo contiene un bloque mucho más completo:

- un objetivo extenso en la parte superior del acta
- un bloque `2. PRESENTACIÓN DE LOS TEMAS DE LA SENSIBILIZACIÓN`
- subtema 1 con introducción y temas A-D
- subtema 2 con consideraciones sobre ambientes laborales inclusivos
- subtema 3 con recomendaciones generales para facilitar el proceso de inclusión laboral

Conclusión:

- la sección `Temas` no debe quedarse con la lista resumida actual
- en S2 habrá que rehacer este bloque para que refleje fielmente el contenido fijo del maestro vivo

### 4. Nota final informativa del acta

El maestro vivo incluye además un bloque fijo antes de asistentes con una nota operativa sobre envío del acta en PDF y ventana de comentarios.

Conclusión:

- no es un campo editable
- pero sí conviene decidir en S2 si debe mostrarse como nota informativa dentro del documento o si basta con que exista solo en el output final

## Estructura final del documento largo

Esta es la estructura que queda definida para `Sensibilización` en producción:

1. **Empresa**
   - búsqueda y confirmación integradas en el mismo documento
   - snapshot de datos de empresa visible dentro del formulario

2. **Datos de la visita**
   - fecha de la visita
   - modalidad
   - NIT

3. **Temas de sensibilización**
   - bloque informativo fijo alineado con el maestro vivo
   - incluye el contenido temático completo, no la lista resumida actual
   - no captura datos

4. **Observaciones**
   - campo largo
   - dictado de voz
   - contador visual

5. **Registro fotográfico**
   - bloque informativo / reservado
   - sin captura de datos en esta fase

6. **Asistentes**
   - `AsistentesSection`
   - profesional RECA
   - asistentes intermedios
   - asesor agencia

7. **Nota operativa final**
   - bloque informativo no editable
   - queda sujeto a decisión de S2 si se muestra en el documento web o se deja solo en el PDF final

## Decisiones cerradas en S0

- `Sensibilización` no se rediseña como wizard mejorado; se convierte a documento largo.
- Se mantiene el contenido funcional actual del formulario; el refactor es de shell, navegación y hardening, no de alcance del acta.
- Las secciones `Temas` y `Registro fotográfico` permanecen como bloques informativos.
- El pipeline de finalización actual se conserva.
- El siguiente paso técnico correcto es S1: convergencia del shell.

## Checklist de salida de S0

- [x] Contraste legacy vs web actual documentado
- [x] Verificación del maestro vivo ejecutada con service account local ignorada por git
- [x] Drift funcional principal identificado
- [x] Estructura final del documento largo definida
- [x] Alcance de S1 delimitado
