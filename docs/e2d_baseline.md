# E2D.1 Baseline - Performance y Egress

**Estado:** baseline inicial parcial.
**Fecha:** 2026-04-29.
**Fase:** E2D.1, sin fixes aplicados.

## Resumen Ejecutivo

Se midieron llamadas directas a Supabase/PostgREST usando `SUPABASE_SERVICE_ROLE_KEY` local para aislar tiempo de base de datos/payload. Estas mediciones no sustituyen el HAR real de gerencia, pero ya confirman problemas de egress y payload en el backoffice de Empresas.

Hallazgos iniciales:

- No se reprodujo una búsqueda de un minuto en llamadas directas a Supabase; las búsquedas medidas respondieron entre 135 ms y 194 ms. Esto sugiere que el minuto reportado puede venir de navegación completa, RSC/render, auth, cold start, red, browser o combinación de requests, no sólo del query aislado.
- `getEmpresaCatalogos()` es el mayor consumidor claro: trae 1000 filas de `empresas` y 125 KB por llamada sólo para construir filtros.
- Hay 1187 empresas activas, pero PostgREST devuelve 1000 filas por defecto en esa consulta. Esto es además un riesgo funcional: filtros generados en JS pueden quedar incompletos.
- El listado de Empresas trae 48 KB para 50 filas; una selección de columnas de lista bajaría a 18 KB, reducción aproximada de 62%.
- No existe ningún `loading.tsx` en `src/app`, por lo que la UI puede sentirse congelada durante navegación server-side.
- Persisten consumidores browser de Supabase para empresa/drafts/formularios; deben auditarse por volumen antes de decidir migración.

## Entorno y Limitaciones

- `localhost:3000`: sin proceso escuchando al iniciar.
- `npm run supabase:migration:list`: local y remoto alineados.
- `npm run supabase:doctor`: timeout tras 124 s en este entorno.
- `npm run supabase:query -- --linked ...`: timeout tras 124 s en este entorno.
- Fallback usado: script temporal con `@supabase/supabase-js` y service role local, sin persistir credenciales ni crear archivos.
- No se capturó HAR de preview con sesión real de gerencia en esta pasada.
- No se capturaron TTFB/FCP/LCP de navegación completa porque las rutas admin requieren sesión/rol real.

## Conteos Remotos

| Tabla | Conteo activo/total medido | Tiempo |
|---|---:|---:|
| `empresas` | 1187 activas | 131 ms |
| `profesionales` | 21 activos | 205 ms |
| `asesores` | 27 activos | 141 ms |
| `gestores` | 10 activos | 196 ms |
| `interpretes` | 28 activos | 151 ms |
| `empresa_eventos` | 7 total | 228 ms |
| `profesional_eventos` | 2 total | 138 ms |
| `form_drafts` | 29 activos | 193 ms |

## Mediciones de Payload y Tiempo

Tiempos son tres muestras por query, reportando mediana. Bytes son JSON de `data`, sin headers HTTP ni overhead de RSC.

| Medición | Filas | Count | Mediana | Bytes |
|---|---:|---:|---:|---:|
| Empresas lista actual, 50 filas, campos completos | 50 | 1187 | 162 ms | 47,978 |
| Empresas lista hipotética, 50 filas, sólo campos visibles | 50 | 1187 | 126 ms | 18,016 |
| Empresas búsqueda por nombre `Asset` | 1 | 1 | 149 ms | 1,078 |
| Empresas búsqueda por NIT `90001848` | 1 | 1 | 152 ms | 1,078 |
| Empresas búsqueda por ciudad `Bogotá` | 50 | 997 | 149 ms | 48,838 |
| Empresas búsqueda amplia `a` | 50 | 1186 | 144 ms | 47,889 |
| Empresas búsqueda amplia `sa` | 50 | 916 | 149 ms | 47,380 |
| Empresas búsqueda amplia `sas` | 50 | 442 | 144 ms | 45,225 |
| Empresas búsqueda amplia `900` | 50 | 398 | 150 ms | 47,397 |
| Empresas catálogos: campos de filtro desde `empresas` | 1000 | 1187 | 130 ms | 125,751 |
| Empresas catálogos: profesionales | 21 | n/a | 118 ms | 2,097 |
| Empresas catálogos: asesores | 27 | n/a | 129 ms | 2,054 |
| Profesionales lista actual | 21 | 21 | 123 ms | 5,523 |
| Asesores lista admin | 27 | 27 | 120 ms | 6,246 |
| Gestores lista admin | 10 | 10 | 133 ms | 2,858 |
| Intérpretes lista admin | 28 | 28 | 176 ms | 3,403 |
| Eventos de empresa, 20 máximo, muestra con 2 eventos | 2 | n/a | 120 ms | 1,581 |
| Drafts hub summary con `empresa_snapshot` | 29 | n/a | 130 ms | 29,578 |

## Hallazgos Confirmados

### H2 - `getEmpresaCatalogos()` genera egress innecesario

Confirmado. La consulta actual trae `zona_empresa`, `estado`, `gestion`, `caja_compensacion` y `asesor` de `empresas` para deduplicar en JavaScript.

Impacto medido:

- 125 KB por llamada sólo para filtros.
- Devuelve 1000 filas aunque hay 1187 empresas activas.
- Puede perder valores únicos de las 187 filas que no llegan por el límite de PostgREST.

Prioridad: alta. Este fix reduce egress y corrige riesgo funcional.

### H4 - Listado de Empresas devuelve más campos de los que muestra

Confirmado. La lista actual usa el mismo select de detalle/edición.

Impacto medido:

- Campos actuales: 47.9 KB por página de 50.
- Campos visibles mínimos: 18.0 KB por página de 50.
- Reducción estimada: 62%.

Prioridad: alta.

### H8 - No hay estados de carga por ruta

Confirmado. `src/app` no tiene `loading.tsx`. La navegación server-side puede quedar visualmente quieta hasta que resuelvan auth, lista, catálogos y render.

Prioridad: alta para UX, aunque no reduzca tiempo real.

### H10 - Existen consumidores browser directos de Supabase

Confirmado por búsqueda estática.

Puntos principales:

- `src/hooks/useEmpresaSearch.ts`
- `src/lib/empresa.ts`
- `src/lib/drafts/remoteDrafts.ts`
- hooks de drafts locales/remotos

No se consideran bug por sí mismos porque soportan formularios existentes. Se deben medir por volumen antes de migrarlos.

## Hallazgos Parciales o Pendientes

### H1 - `getCurrentUserContext()` sin cache

Plausible por código. `getCurrentUserContext()` no usa `cache()` y se invoca desde layout, access helpers y APIs. Falta medir duplicación real en navegación admin con sesión.

### H3 - Búsqueda con `ilike` en 8 columnas

Plausible por código, pero no se reprodujo lentitud extrema con PostgREST directo. Falta `EXPLAIN ANALYZE` en Supabase Studio o CLI cuando `db query` deje de timeoutear.

### H5 - `count: "exact"`

Plausible. Las mediciones incluyen count exact y aun así no fueron lentas en PostgREST directo. Se debe evaluar en navegación completa antes de cambiar paginación.

### H6 - Drafts del hub con `empresa_snapshot`

Parcial. El payload actual medido fue 29.6 KB para 29 drafts activos. No es el principal consumidor hoy, pero puede crecer con uso.

### H7 - Eventos con `payload` completo

Parcial. En la muestra medida el payload fue bajo porque sólo había 2 eventos. Puede crecer cuando existan más ediciones o snapshots grandes.

### H9 - Streaming/Suspense

Pendiente. Requiere medición de navegación completa con sesión admin.

## Riesgos de Egress Estimados

Navegación a listado de Empresas combina aproximadamente:

- Lista actual: 47.9 KB.
- Filtros desde `empresas`: 125.7 KB.
- Profesionales catálogo: 2.1 KB.
- Asesores catálogo: 2.1 KB.

Total mínimo Supabase -> app por carga: ~178 KB, sin headers ni overhead. Con un select de lista reducido y filtros server-side livianos, el mismo flujo debería bajar a cerca de 20-30 KB más overhead. Esto sería una reducción aproximada de 80% a 90% para esa navegación.

## Observaciones de Correctitud Detectadas

- `getEmpresaCatalogos()` consulta `asesores` sin filtrar `deleted_at`. Después de E2C, debería devolver sólo asesores activos para formularios de Empresa.
- La consulta de filtros de Empresas se queda en 1000 filas por límite de PostgREST. Aunque el egress fuera aceptable, esto justifica reemplazarla.

## Pendiente para Completar E2D.1

Para cerrar completamente E2D.1 falta una medición browser real:

- Preview o local con sesión `inclusion_empresas_admin`.
- HAR de:
  - `/hub`
  - `/hub/empresas`
  - `/hub/empresas/admin/empresas`
  - búsqueda por nombre de empresa que gerencia percibe lenta
  - apertura de detalle
  - guardado de edición
- Separar bytes por host:
  - RECA/Vercel
  - Supabase REST
  - Supabase Auth
  - Google APIs
  - extensiones
- Registrar TTFB/FCP/LCP cuando DevTools lo permita.

## Recomendación para E2D.2/E2D.3

E2D.2/E2D.2a quedó implementada localmente como desbloqueo operativo y feedback visual. El siguiente orden recomendado se concentra en E2D.3:

1. Reemplazar `getEmpresaCatalogos()` por una estrategia que no traiga 1000 filas de `empresas`; esto corrige egress y riesgo de filtros incompletos.
2. Crear `EMPRESA_LIST_FIELDS` para listados.
3. Filtrar `asesores.deleted_at is null` en catálogos de Empresa.
4. Medir duplicación real de `getCurrentUserContext()` y aplicar `cache()` request-scoped si se confirma.
5. Ejecutar `EXPLAIN ANALYZE` para decidir índices trigram en búsqueda.
6. Reducir columnas de búsqueda global si la medición lo respalda.
7. Revisar `count: "exact"` sólo después de confirmar costo real en navegación.

## E2D.2a - Decisión de compatibilidad legacy

Durante el uso de gerencia se confirmó un bloqueo operativo adicional: empresas existentes en Supabase fueron creadas antes de las reglas nuevas de Fase 3.1, por lo que editar una observación o un dato menor podía exigir reorganizar responsable, contactos, teléfonos, Compensar y profesional asignado antes de guardar.

Decisión aplicada para E2D.2a:

- Creación de empresas sigue estricta y mantiene las reglas completas de calidad de datos.
- Edición de empresas existentes opera en modo compatibilidad legacy: permite guardar cambios aunque falten datos históricos o existan contactos, teléfonos o correos antiguos.
- La edición preserva los separadores históricos de esos campos. Si un responsable trae dos teléfonos o dos correos en el mismo valor legacy, el `PUT` no los convierte a un número largo ni los descarta.
- Cambio de estado sigue exigiendo comentario.
- Valores de catálogo presentes siguen validándose contra opciones canónicas.
- El formulario muestra una advertencia informativa cuando detecta datos históricos incompletos, pero no bloquea el guardado.

Este ajuste no reduce egress ni tiempo real de consultas; se considera un desbloqueo operativo y de UX antes de E2D.3.
