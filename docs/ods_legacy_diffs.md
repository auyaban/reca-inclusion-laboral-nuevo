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
