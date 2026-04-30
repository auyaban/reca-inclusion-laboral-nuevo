# Diferencias modulo ODS nuevo vs legacy RECA_ODS

> Documentacion de diferencias conocidas entre el comportamiento del legacy desktop y el modulo web nuevo.
> Cada diferencia tiene un veredicto: aceptable dia 1, o requiere accion futura.

## Busqueda de empresa por nombre

| Aspecto | Legacy | Modulo nuevo | Veredicto |
|---|---|---|---|
| Busqueda por nombre | `difflib.SequenceMatcher` ratio >= 0.8 o token overlap >= 0.6 | `ilike '%query%'` en SQL | **Aceptable dia 1.** El 95% de busquedas reales matchean por substring. Si el operador reporta no encontrar empresas que existen, evaluar agregar fuzzy matching server-side. |

## Calculo financiero

| Aspecto | Legacy | Modulo nuevo | Veredicto |
|---|---|---|---|
| Precision decimal | `decimal.Decimal` con `ROUND_HALF_UP` | `decimal.js` con `ROUND_HALF_UP` | **Equivalente.** Misma semantica de redondeo a 2 decimales. |

## Usuarios nuevos

| Aspecto | Legacy | Modulo nuevo | Veredicto |
|---|---|---|---|
| Crear usuario existente | `ON CONFLICT DO NOTHING` (BD wins) | `ON CONFLICT DO NOTHING` (BD wins) | **Equivalente.** Mismo comportamiento via RPC `ods_insert_atomic`. |

## Seccion 4 — Normalizacion

| Aspecto | Legacy | Modulo nuevo | Veredicto |
|---|---|---|---|
| Catálogos de discapacidad/genero/tipo contrato | Valores con acentos en codigo Python | `src/lib/ods/catalogs.ts` con valores canonicos | **Equivalente.** Mismos valores, centralizados en un solo archivo. |
| Agregacion de oferentes | Preserva posiciones de filas vacias | `aggregateSeccion4()` filtra filas completamente vacias pero preserva vacios intermedios | **Mejora intencional.** Filas completamente vacias no se envian, pero los campos vacios dentro de filas validas mantienen su posicion para alineacion correcta entre campos. |

## Seccion 4 — Normalizacion de oferentes (mejora intencional)

| Aspecto | Legacy | Modulo nuevo | Veredicto |
|---|---|---|---|
| Validacion de `discapacidad_usuario`, `genero_usuario`, `tipo_contrato` al agregar | Solo `.strip()`, acepta cualquier string | Zod enum strict contra catalogo canonico (cliente + server). Rechaza variantes (`MUJER`, `mujer`, `Femenino`) | **Mejora intencional.** El legacy permitio en produccion el caos `genero_usuario = "MUJER;MUJER", "HOMBRE;Mujer", "Mujer;Hombre", "MUJER;MUJER;MUJER"`. El nuevo modulo escribe SIEMPRE `Hombre`, `Mujer`, `Otro` exactos para que reportes futuros agreguen sin perder filas por variantes de capitalizacion. |
| `total_personas` | `len(nombres)` despues de filtrar filas vacias | Igual: count de filas validas (donde al menos un campo esta lleno) | **Equivalente.** |
| Separador de agregacion | `";"` para todos los campos string | `";"` para todos los campos string | **Equivalente.** Las posiciones por indice se respetan: `cedulas.join(";")[i]` corresponde a `nombres.join(";")[i]`. |
| Filas vacias | Se filtran (no se incluyen en agregado ni cuentan en `total_personas`) | Igual | **Equivalente.** |
