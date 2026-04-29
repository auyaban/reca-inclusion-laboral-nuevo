# E2D - Performance y Egress de Supabase

**Estado:** cerrado localmente; E3 puede planearse sobre esta base.
**Última actualización:** 2026-04-29.
**Alcance:** backoffice `/hub/empresas*`, navegación desde `/hub`, búsquedas de Empresas, catálogos, listados, eventos y consumo de Supabase.

## Resumen

E2D revisa tiempos de carga, tiempos de búsqueda, feedback visible durante esperas y consumo de egress de Supabase antes de avanzar a E3. La necesidad nace de dos señales de uso real:

- Gerencia reporta búsquedas por nombre de empresa que pueden tardar hasta cerca de un minuto.
- El proyecto ya consumió el egress mensual del free tier de Supabase en un mes anterior.

La fase se trabaja con diagnóstico primero. Las hipótesis actuales del QA de código son fuertes, pero no se aplican optimizaciones sin una medición mínima antes/después.

Resultado de cierre local:

- E2D.2/E2D.2a desbloqueó edición legacy y feedback visual.
- E2D.3 redujo payload de listado y catálogos de Empresas, con migración remota alineada.
- E2D.4 auditó consumidores browser/directos y sólo aplicó filtros `deleted_at is null` de bajo riesgo.
- E2D.5 mantiene `pg_trgm` y `count: "exact"` diferidos porque las mediciones no superan umbrales.
- El HAR real de gerencia queda como validación operativa posterior, no como bloqueo de código.

## Objetivos

- Reducir tiempos percibidos de carga y búsqueda en el backoffice de Empresas.
- Reducir payloads y requests repetidas hacia Supabase.
- Mantener egress proyectado de Supabase por debajo del 50% del free tier mensual como margen operativo.
- Agregar feedback visual claro: cargando, filtrando, guardando, eliminando, restaurando.
- Documentar baseline y mejoras para que E3 no multiplique problemas existentes.

## Fuera de alcance

- No tocar `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*`, `src/app/api/formularios/*` ni hooks de estado de formularios.
- No cambiar reglas de negocio de Empresas, Profesionales, Asesores, Gestores ni Intérpretes.
- No instalar APM pago ni infraestructura nueva.
- No optimizar finalización de actas dentro de esta fase; si aparece como cuello de botella, se documenta como frente aparte.

## Fase E2D.0 - Preparación y cierre de E2C

**Objetivo:** dejar E2C cerrado como base y abrir E2D formalmente.

**Acciones:**

- Confirmar que E2C ya tiene migración remota aplicada y QA de código cerrado.
- Mantener E2C en `memory/roadmap.md` como completada.
- Registrar E2D como frente activo antes de E3.
- Detener cualquier proceso local en `localhost:3000` antes de iniciar mediciones.

**Criterio de salida:** roadmap y memoria muestran E2D como siguiente foco activo.

## Fase E2D.1 - Baseline medible, sin fixes

**Objetivo:** medir la experiencia actual y separar causas reales de suposiciones.

**Escenarios a medir con sesión admin:**

- `/hub` en carga fría.
- `/hub` al regresar desde un formulario.
- `/hub/empresas` en carga fría y caliente.
- `/hub/empresas/admin/empresas` sin búsqueda.
- Búsqueda por nombre parcial de empresa.
- Búsqueda por NIT.
- Búsqueda por ciudad.
- Apertura de detalle de empresa.
- Guardado de edición de empresa.
- Apertura de Profesionales y filtros principales.
- Apertura de Asesores, Gestores e Intérpretes.

**Datos por escenario:**

- Tres muestras mínimas.
- TTFB, FCP, LCP cuando estén disponibles.
- Tiempo total hasta que la UI queda utilizable.
- Número de requests.
- Bytes recibidos por host.
- Diez requests más lentas.
- Diez requests más pesadas.
- Requests duplicadas en la misma navegación.

**Fuentes a separar:**

- RECA/Vercel.
- Supabase REST.
- Supabase Auth.
- Google APIs.
- Requests RSC de Next.
- Extensiones del navegador.

**Queries a analizar con `EXPLAIN ANALYZE`:**

- `listEmpresas` sin búsqueda.
- `listEmpresas` con búsqueda por nombre.
- `listEmpresas` con búsqueda por NIT.
- `getEmpresaCatalogos`.
- `getCurrentUserContext`.
- `listProfesionales`.
- `listCatalogos` para Asesores, Gestores e Intérpretes si aparecen lentos.

**Entregable:** crear `docs/e2d_baseline.md` con tablas de medición, top requests, hipótesis confirmadas/rechazadas y fixes priorizados.

**Criterio de salida:** baseline registrado con suficiente evidencia para escoger fixes. E2D.2 no arranca sin este documento.

## Fase E2D.2 - Feedback visual y estados de carga

**Objetivo:** evitar que gerencia perciba la app como congelada mientras cargan datos.
**Estado:** implementada localmente en E2D.2a.

**Subfase E2D.2a - Compatibilidad legacy de edición:**

- `POST /api/empresas` mantiene validación estricta para empresas nuevas.
- `PUT /api/empresas/[id]` permite guardar empresas históricas incompletas sin obligar a completar la estructura nueva.
- La edición preserva separadores históricos en teléfonos y correos de contacto; por ejemplo, dos teléfonos o dos correos en un mismo campo legacy no se aplanan ni se eliminan.
- La edición conserva normalización de texto y catálogos válidos, y mantiene comentario obligatorio cuando cambia el estado.
- El formulario muestra advertencia no bloqueante cuando una empresa tiene datos históricos incompletos o estructura antigua.

**Cambios implementados:**

- Se agregaron `loading.tsx` en las rutas admin activas de `/hub/empresas*`.
- Se creó `BackofficeTableSkeleton` y `BackofficeFormSkeleton` como base reusable.
- Se agregaron mensajes friendly:
  - `Cargando empresas...`
  - `Filtrando empresas...`
  - `Abriendo empresa...`
  - `Guardando cambios...`
  - `Eliminando registro...`
  - `Restaurando registro...`
  - `Generando contraseña temporal...`
- El filtro de Empresas muestra estado pendiente mientras navega.
- Crear/editar Empresa muestra errores de API, `fieldErrors`, éxito y estado de guardado de forma visible.
- Se mantiene alto contraste y ortografía correcta en español Colombia.

**Criterio de salida:** cumplido para las rutas y acciones activas de backoffice. La medición de reducción real de tiempo/egress queda para E2D.3.

## Fase E2D.3 - Optimización de queries y payloads

**Objetivo:** reducir tiempo real y egress en las rutas de mayor impacto.
**Estado:** implementada localmente para listado, catálogos y búsqueda reducida.

**Hipótesis iniciales a validar contra baseline:**

- `getCurrentUserContext()` puede estar haciendo round-trips redundantes y debe evaluarse con `cache()` request-scoped.
- `getEmpresaCatalogos()` trae muchas filas de `empresas` para construir listas únicas en JS.
- Búsqueda de Empresas usa demasiadas columnas con `%term%` y sin índices trigram.
- Listado de Empresas reutiliza campos de detalle y devuelve más columnas de las que la tabla muestra.
- `count: "exact"` puede duplicar costo de queries en listados donde el total exacto no es crítico.
- Eventos de Empresa devuelven `payload` completo aunque la UI sólo muestra resumen y detalle compacto.
- Drafts del hub pueden cargar `empresa_snapshot` aunque el badge sólo requiere conteos.

**Cambios implementados en E2D.3:**

- `EMPRESA_LIST_FIELDS` separa listado de detalle y reduce columnas de `GET /api/empresas`.
- `public.empresa_catalogo_filtros()` devuelve filtros únicos como arrays y evita traer filas completas de `empresas`.
- `getEmpresaCatalogos()` filtra asesores activos con `deleted_at is null`.
- Búsqueda global reducida a `nombre_empresa`, `nit_empresa` y `ciudad_empresa`.
- `count: "exact"` se mantiene por ahora.
- `pg_trgm` e índices GIN quedan diferidos hasta que una medición post-despliegue justifique el costo.
- `unstable_cache` para catálogos queda diferido: la RPC redujo el payload principal y no hay evidencia browser de TTFB residual dominante.

**Pendientes fuera de E2D.3 inmediata:**

- Evaluar `getCurrentUserContext()` con `cache()` si la navegación completa sigue lenta.
- Strip de snapshots pesados en eventos si crece el timeline.
- Dividir drafts del hub en conteo liviano y detalle lazy si el baseline de E2D.4 lo prioriza.
- Reabrir cache de catálogos si TTFB de páginas admin queda por encima de 800 ms o si HAR muestra repetición material de catálogos.

**Nota de UX para release:** desde E2D.3 la búsqueda libre de Empresas se limita a nombre, NIT y ciudad. Para asesor, profesional, zona, gestión, caja y estado, gerencia debe usar los filtros explícitos de la tabla. Si aparece un caso real de búsqueda libre por contacto, teléfono, asesor o sede, se evaluará búsqueda extendida bajo demanda.

**Criterio de salida:** cumplido con medición read-only registrada en `docs/e2d_baseline.md`; la migración E2D.3 queda alineada local/remoto. Falta HAR real de gerencia sólo como validación operativa posterior.

## Fase E2D.4 - Auditoría de egress y fetch directo a Supabase

**Objetivo:** entender y controlar consumidores que no pasan por APIs de backoffice.

**Puntos a revisar:**

- `useEmpresaSearch`.
- `getEmpresaById`.
- `remoteDrafts`.
- `serverDraftResolution`.
- Autocomplete de empresas en formularios.
- Cualquier `createClient()` browser que consulte tablas grandes.

**Decisión esperada por consumidor:**

- Mantener si el volumen es bajo y el payload está acotado.
- Reducir columnas o límites si hay egress innecesario.
- Migrar a API server-side si se confirma consumo alto o patrón inseguro.

**Criterio de salida:** tabla de consumidores browser con decisión explícita y egress estimado.

**Estado:** implementada localmente.

**Decisiones tomadas:**

- `useEmpresaSearch` se mantiene browser-side y ahora filtra `deleted_at is null`.
- `getEmpresaById` se mantiene browser-side y ahora filtra `deleted_at is null`.
- `getEmpresaFromNit` y `resolveInitialDraftResolution` mantienen fallback por NIT, pero excluyen empresas soft-deleted.
- `fetchDraftSummaries` y `fetchDraftPayload` se mantienen: summaries no traen `data`, payload completo sólo se baja al abrir un borrador.
- `getHubDraftsData` mantiene `empresa_snapshot` porque la medición actual queda bajo 100 KB.
- No se crea API nueva para autocomplete/drafts porque los payloads medidos están acotados.

## Fase E2D.5 - Verificación final y gate a E3

**Objetivo:** cerrar E2D con métricas defendibles.

**Verificación:**

- Repetir los escenarios de E2D.1.
- Comparar mediana antes/después.
- Comparar bytes recibidos por endpoint afectado.
- Ejecutar:
  - `npm test`
  - `npm run lint`
  - `npm run spellcheck`
  - `npm run build`
  - `npm run test:e2e:smoke`
  - `npm run supabase:doctor`
- Si hay migraciones:
  - `npm run supabase:migration:list`
  - Supabase advisors.

**Criterio de salida:**

- Búsqueda de Empresas responde en tiempos operables para gerencia.
- Navegación a Empresas muestra feedback inmediato.
- Egress mensual proyectado para backoffice queda por debajo del 50% del free tier.
- E3 puede arrancar sin multiplicar una deuda de performance conocida.

**Estado local:** cerrado con verificación técnica. `npm run supabase:migration:list` muestra `20260429191717` alineada local/remoto. El HAR real de gerencia queda como validación de producción, no como bloqueo de código.

## Riesgos y decisiones técnicas

- Las funciones `security definer` en Supabase se evalúan con cuidado. Si se usa RPC para filtros, debe tener `search_path` explícito, grants cerrados y advisors limpios.
- `cache()` sólo aplica si es request-scoped y no mezcla usuarios.
- No se reduce búsqueda por columnas hasta confirmar que gerencia no depende de esas columnas para encontrar empresas.
- No se toca finalización de formularios en E2D; si el baseline muestra lentitud ahí, se abre una fase separada.

## Hipótesis iniciales del QA de código

| Hipótesis | Estado inicial | Acción |
|---|---|---|
| `getCurrentUserContext()` sin cache genera round-trips redundantes | Plausible por código | Medir y aplicar cache request-scoped si confirma |
| `getEmpresaCatalogos()` genera egress innecesario | Confirmado como patrón de riesgo | Medir payload y sustituir si confirma impacto |
| Búsqueda de Empresas fuerza scans por `ilike` con `%term%` | Plausible por código | `EXPLAIN ANALYZE` y decidir índices |
| Listado devuelve demasiadas columnas | Confirmado como patrón de riesgo | Crear campos de lista si el payload pesa |
| `count: "exact"` añade costo | Plausible | Medir antes de cambiar |
| No hay loading states de ruta | Confirmado | Implementar feedback si E2D.1 muestra esperas |
| Fetch browser a Supabase puede aportar egress | Confirmado que existe | Medir volumen antes de migrar |
