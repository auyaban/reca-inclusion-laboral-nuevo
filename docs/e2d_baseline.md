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

## E2D.3 - Optimización de payloads y catálogos

**Estado:** implementado y con migración remota verificada.

Cambios aplicados:

- `listEmpresas()` usa `EMPRESA_LIST_FIELDS` con sólo las columnas visibles del listado.
- `getEmpresaCatalogos()` usa `public.empresa_catalogo_filtros()` para filtros únicos en vez de traer filas de `empresas`.
- Los asesores del catálogo de Empresa se filtran por `deleted_at is null`.
- La búsqueda global de Empresas queda limitada a `nombre_empresa`, `nit_empresa` y `ciudad_empresa`.
- `count: "exact"` se mantiene porque la medición aislada no justificó cambiar la semántica de paginación.
- `pg_trgm` queda diferido: el plan todavía muestra `Seq Scan`, pero con 1187 filas activas el tiempo de ejecución medido no justifica índices GIN en esta fase.

Mediciones read-only tomadas contra Supabase remoto:

| Medición | Antes | Después / objetivo | Cambio |
|---|---:|---:|---:|
| Listado 50 empresas, JSON de columnas | 47,726 bytes | 19,598 bytes | -58.9% |
| Filtros de Empresas desde filas | 150,451 bytes | 1,941 bytes | -98.7% |
| EXPLAIN búsqueda `bogota`, 8 columnas | 10.736 ms | 4.542 ms con 3 columnas | -57.7% |

Decisión sobre `pg_trgm`:

- No se crea extensión ni índices en E2D.3.
- Motivo: aunque el plan sigue siendo `Seq Scan`, el costo medido con búsqueda reducida fue bajo en la base actual.
- Reapertura: si el HAR real de gerencia sigue mostrando búsquedas >1.5 s después de desplegar payload/catálogos, crear migración con `pg_trgm` e índices GIN parciales para `nombre_empresa`, `nit_empresa` y `ciudad_empresa`.

Decisión sobre `count: "exact"`:

- Se mantiene `count: "exact"`.
- Motivo: el baseline aislado no mostró que el conteo domine el tiempo de listado, y la paginación actual usa total exacto.
- Reapertura: cambiar a `estimated` sólo si una medición de navegación completa demuestra >=25% de tiempo adicional o >=150 ms de mediana atribuible al conteo.

Decisión sobre `unstable_cache` en catálogos:

- No se cachea `getEmpresaCatalogos()` en E2D.3.
- Motivo: la RPC redujo el payload de filtros 98.7% y todavía no hay medición browser que demuestre que los tres round-trips restantes dominen el TTFB de las páginas admin.
- Reapertura: aplicar cache request/runtime con invalidación por tag si el TTFB de páginas admin queda >800 ms post-deploy o si HAR muestra repetición material de catálogos en navegación real.

Decisión de UX sobre búsqueda global:

- La búsqueda libre de Empresas cubre `nombre_empresa`, `nit_empresa` y `ciudad_empresa`.
- Para asesor, profesional, zona, gestión, caja y estado se deben usar los filtros explícitos de la tabla.
- Reapertura: si gerencia reporta un caso operativo real donde necesita buscar por teléfono, contacto, asesor o sede en el cuadro libre, evaluar búsqueda extendida bajo demanda o índices específicos.

## E2D.4 - Auditoría de consumidores browser/directos

**Estado:** implementado localmente con medición read-only. No se migran consumidores a nuevas APIs en esta fase.

Inventario y decisión:

| Consumidor | Uso | Decisión | Motivo |
|---|---|---|---|
| `useEmpresaSearch` | Autocomplete de empresa en formularios | Mantener browser-side, agregar `deleted_at is null` | Campos mínimos, debounce de 300 ms y `limit(20)`. Medición: 1.680 bytes para 8 filas, mediana 136 ms. |
| `getEmpresaById` | Carga detalle de empresa al seleccionar resultado | Mantener browser-side, agregar `deleted_at is null` | Ocurre sólo por acción explícita del usuario. Medición: 610 bytes, mediana 141 ms. |
| `getEmpresaFromNit` | Fallback al reconstruir borrador sin snapshot | Mantener browser-side, agregar `deleted_at is null` | Ocurre sólo si falta snapshot. Medición: 610 bytes, mediana 136 ms. |
| `fetchDraftSummaries` | Lista de borradores remotos en hub/drawer | Mantener | El summary browser no trae `data`; el payload grande queda para `fetchDraftPayload` al abrir borrador. |
| `fetchDraftPayload` | Abrir un borrador específico | Mantener | Necesita `data` completo por diseño y sólo corre por acción explícita. |
| `resolveInitialDraftResolution` | Resolver draft inicial server-side en `/formularios/[slug]` | Mantener, agregar `deleted_at is null` en fallback por NIT | Evita reconstruir formularios con empresas soft-deleted sin cambiar el contrato de formularios. |
| `getHubDraftsData` | Datos iniciales del hub con `empresa_snapshot` | Mantener por ahora | Medición: 32 drafts, 32.450 bytes, mediana 159 ms. Queda bajo el umbral de 100 KB y no domina el egress. |

Medición tomada contra Supabase remoto con service role, tres muestras por query:

| Medición | Filas | Mediana | Bytes |
|---|---:|---:|---:|
| Autocomplete empresa activo, `limit(20)` | 8 | 136 ms | 1.680 |
| `getEmpresaById` activo | 1 | 141 ms | 610 |
| `getEmpresaFromNit` activo | 1 | 136 ms | 610 |
| Hub draft summaries con snapshot | 32 | 159 ms | 32.450 |

Decisión sobre migrar a API server-side:

- No se migra en E2D.4.
- Motivo: los consumidores browser medidos están por debajo de los umbrales definidos (`50 KB` por acción, más de `5` requests por navegación o repetición por tecla sin debounce).
- Reapertura: si un HAR real muestra que borradores del hub superan `100 KB` por carga o más de `20%` de bytes Supabase de la navegación, separar conteo liviano y detalle lazy.

Decisión sobre cache de contexto Auth:

- No se cambia `requireAppRole` ni se cachea en route handlers.
- Motivo: sin HAR de sesión admin no hay prueba de duplicación dañina por request, y cachear autorización en APIs sin una prueba explícita de aislamiento por request sería más riesgoso que beneficioso.
- Reapertura: si el HAR/trace de una navegación SSR muestra llamadas repetidas a `profesionales` y `profesional_roles` dentro del mismo render, crear helper cacheado sólo para Server Components/layouts.

## E2D.5 - Gate final local

**Estado local:** migraciones alineadas y medición read-only suficiente para cerrar los fixes de código. Falta HAR real de gerencia si se quiere validar experiencia de red/browser en producción.

Verificaciones de base:

- `npm run supabase:migration:list`: local y remoto alineados, incluyendo `20260429191717`.
- E2D.3 ya aplicó `public.empresa_catalogo_filtros()` en remoto.
- `pg_trgm` sigue diferido porque las mediciones directas y E2D.4 no superan umbrales.
- `count: "exact"` se mantiene porque no hay evidencia de costo dominante.

Proyección de egress backoffice:

- Antes, cargar listado de Empresas combinaba aproximadamente 178 KB Supabase -> app por navegación.
- Después de E2D.3, listado + filtros queda aproximadamente en 21.5 KB de datos JSON medidos, más catálogos pequeños de profesionales/asesores.
- Con 1.000 navegaciones de listado al mes, el consumo medido de esos endpoints estaría alrededor de 25-35 MB antes de headers/RSC, muy por debajo del gate de 2.5 GB/mes.
- El riesgo principal restante no es Empresas backoffice, sino crecimiento futuro de drafts con snapshots o finalización de actas; eso queda fuera de E2D.

## Reporte técnico consolidado E2D.3-E2D.5

**Objetivo del bloque:** reducir egress y latencia del backoffice de Empresas antes de E3, sin cambiar contratos públicos ni reabrir lógica de formularios. E2D.2a ya había desbloqueado la edición legacy y el feedback visual; E2D.3-E2D.5 se enfocó en bytes, consultas, consumidores directos de Supabase y gate de cierre.

### E2D.3 - Payloads, catálogos y búsqueda

| Cambio aplicado | Archivos principales | Justificación técnica | Resultado medido |
|---|---|---|---|
| Separar `EMPRESA_LIST_FIELDS` de `EMPRESA_SELECT_FIELDS` | `src/lib/empresas/constants.ts`, `src/lib/empresas/server.ts` | El listado usaba el select completo de detalle/edición, devolviendo columnas que la tabla no renderiza. Separar campos reduce egress sin cambiar el detalle ni edición. | Listado de 50 empresas bajó de 47,726 bytes a 19,598 bytes (-58.9%). |
| Reemplazar dedupe JS de filtros por RPC `empresa_catalogo_filtros()` | `supabase/migrations/20260429191717_e2d_empresas_performance.sql`, `src/lib/empresas/server.ts` | `getEmpresaCatalogos()` traía filas de `empresas` para construir arrays únicos en JS. Además PostgREST cortaba en 1000 filas aunque había más empresas activas, con riesgo de filtros incompletos. | Filtros bajaron de 150,451 bytes a 1,941 bytes (-98.7%) y se elimina el límite funcional de 1000 filas. |
| Filtrar asesores activos en catálogos | `src/lib/empresas/server.ts` | Después de E2C, `asesores` tiene `deleted_at`; el catálogo de Empresa no debe ofrecer asesores eliminados. | Correctitud alineada con soft delete. |
| Reducir búsqueda global a nombre, NIT y ciudad | `src/lib/empresas/queries.ts`, `src/lib/empresas/queries.test.ts` | La búsqueda anterior hacía `ilike` sobre más columnas, aumentando el plan y el trabajo sin evidencia de uso operativo en todos esos campos. Nombre, NIT y ciudad cubren los casos reportados por gerencia. | `EXPLAIN` de búsqueda `bogota` bajó de 10.736 ms a 4.542 ms (-57.7%). |
| Mantener `count: "exact"` | `src/lib/empresas/server.ts` | La medición no mostró que el conteo exacto dominara el tiempo. Cambiarlo a estimado degradaría la paginación sin beneficio probado. | Diferido hasta que el costo sea >=25% o >=150 ms de mediana. |
| Diferir `pg_trgm` | Sin migración adicional | Aunque el plan mantiene `Seq Scan`, la tabla actual es pequeña y la búsqueda reducida quedó bajo umbral. Crear índices GIN ahora agregaría mantenimiento sin evidencia suficiente. | Reabrir sólo si búsqueda browser post-deploy supera 1.5 s o `EXPLAIN` supera 150 ms. |
| Diferir `unstable_cache` para catálogos | Sin cambio de cache en E2D.3 | El RPC ya eliminó el payload masivo. Cachear sin medición de TTFB real agregaría invalidación nueva sin evidencia suficiente. | Reabrir si TTFB admin >800 ms o si HAR muestra repetición material de catálogos. |
| Mantener `zonasCompensar` junto a `filtros.zonas` | `src/lib/empresas/server.ts` | `zonasCompensar` conserva compatibilidad con consumidores creados en Fase 3. La duplicación es una referencia al mismo arreglo en servidor y no vuelve a traer datos. | Auditar y consolidar en una fase futura si ya no hay consumidores legacy. |

**Decisión de seguridad Supabase:** la RPC `public.empresa_catalogo_filtros()` queda con permisos cerrados para `anon` y `authenticated`, y ejecución concedida a `service_role`. Se usa como mecanismo interno server-side; no expone una nueva superficie pública para clientes browser.

### E2D.4 - Consumidores browser/directos de Supabase

| Consumidor | Cambio o decisión | Justificación técnica | Medición |
|---|---|---|---|
| `useEmpresaSearch` | Se mantiene browser-side y se agregó `.is("deleted_at", null)` | El autocomplete ya usa debounce, campos mínimos y `limit(20)`. Migrarlo a API agregaría complejidad sin reducir egress de forma significativa. | 8 filas, 1,680 bytes, mediana 136 ms. |
| `getEmpresaById` | Se mantiene browser-side y se agregó `.is("deleted_at", null)` | Carga detalle sólo después de una acción explícita del usuario. El filtro evita reabrir empresas soft-deleted. | 1 fila, 610 bytes, mediana 141 ms. |
| `getEmpresaFromNit` | Se mantiene y se agregó `.is("deleted_at", null)` | Es fallback cuando falta snapshot de empresa en un borrador. Evita reconstruir formularios con empresas eliminadas sin tocar el contrato de formularios. | 1 fila, 610 bytes, mediana 136 ms. |
| `resolveInitialDraftResolution` | Se mantiene y se filtra fallback por NIT contra `deleted_at` | Es parte del flujo de recuperación de drafts; cambiarlo a una API nueva no aporta egress medible ahora. | Cubierto por tests de resolución de draft. |
| `fetchDraftSummaries` / `fetchDraftPayload` | Se mantienen | El summary no trae `data`; el payload completo sólo baja al abrir un borrador. | Bajo umbrales actuales. |
| `getHubDraftsData` | Se mantiene con `empresa_snapshot` | El payload actual no supera el umbral definido para separar conteo liviano y detalle lazy. | 32 drafts, 32,450 bytes, mediana 159 ms. |

**Justificación general:** se corrigió correctitud de soft delete en los consumidores directos sin moverlos a APIs nuevas, porque los payloads medidos están por debajo de los umbrales de E2D.4 (`50 KB` por acción, más de 5 requests por navegación o repetición visible por cada tecla).

### E2D.5 - Gate local a E3

| Verificación / decisión | Resultado | Justificación |
|---|---|---|
| Migración E2D.3 | `20260429191717` alineada local/remoto | La función de filtros ya está disponible en remoto; no se requiere push adicional de migración para este bloque. |
| `pg_trgm` | Diferido | No se superaron los umbrales de latencia directa. Mantenerlo diferido evita índices prematuros. |
| `count: "exact"` | Conservado | Mantiene paginación precisa hasta tener evidencia de costo real en navegación completa. |
| Auth context cache | Diferido | No se cacheó `requireAppRole` ni autorización en APIs sin una prueba explícita de aislamiento por request. Si HAR/trace demuestra duplicación SSR dañina, se implementará sólo para Server Components/layouts. |
| Egress proyectado backoffice Empresas | Bajo el gate | Listado + filtros bajan de aproximadamente 178 KB a cerca de 21.5 KB de JSON medido, más catálogos pequeños. Con 1,000 cargas/mes, el consumo de esos endpoints queda en decenas de MB, lejos del límite de 2.5 GB/mes definido para backoffice. |

### Riesgos que quedan documentados

- Falta HAR real de gerencia en producción/preview para medir navegador, RSC, extensiones, cold starts y red real. No bloquea código, pero debe usarse como validación operativa.
- Si los drafts con `empresa_snapshot` crecen por encima de 100 KB por carga de hub o más de 20% de bytes Supabase de una navegación, se debe separar conteo liviano y detalle lazy.
- Si eventos de empresa empiezan a incluir payloads grandes o snapshots frecuentes, se debe devolver un payload resumido para la actividad reciente.
- Si E3 incrementa el volumen de búsquedas o empresas activas crecen significativamente, reabrir `pg_trgm` con índices GIN parciales para `nombre_empresa`, `nit_empresa` y `ciudad_empresa`.

### Archivos tocados por este bloque

- `src/lib/empresas/constants.ts`
- `src/lib/empresas/queries.ts`
- `src/lib/empresas/server.ts`
- `src/hooks/useEmpresaSearch.ts`
- `src/lib/empresa.ts`
- `src/lib/drafts/remoteDrafts.ts`
- `src/lib/drafts/serverDraftResolution.ts`
- `supabase/migrations/20260429191717_e2d_empresas_performance.sql`
- Tests asociados en `src/lib/empresas`, `src/hooks`, `src/lib/empresa.test.ts`, `src/lib/drafts`

### Conclusión técnica

E2D.3-E2D.5 cerró los consumidores más claros de egress en Empresas sin cambiar la UX visible ni las reglas de negocio. La reducción principal viene de no usar filas de `empresas` como fuente de filtros y de separar el select de listado del select de detalle. Los consumidores browser se dejaron vivos porque están acotados, medidos y ahora respetan soft delete. E3 puede arrancar sobre esta base, con el compromiso de capturar HAR real si gerencia vuelve a reportar búsquedas o navegación lentas después del despliegue.
