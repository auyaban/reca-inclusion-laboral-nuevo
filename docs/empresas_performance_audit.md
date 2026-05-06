---
name: Auditoria de performance y errores Empresas
description: Discovery #158 - mapa correlacionado de bugs, performance y deuda en el modulo Empresas con propuesta de bundle integral. Documento PO Empresas para Dev y QA.
type: audit
issue: 158
milestone: 3
created: 2026-05-06
status: Tanda 1 implementada, pendiente merge
---

## Resumen ejecutivo

El reporte de gerencia ("panel Empresas lento, se cuelga") fue el sintoma visible. La triage a fondo (Supabase + Sentry + Vercel + lectura de codigo en main) mostro algo distinto:

- **No hay un solo bug**, hay **un bundle de 5 problemas activos + 5 deudas latentes**.
- **El issue de mayor volumen NO es el que motivo el reporte de Sandra**. Es un problema de finalizacion silencioso que multiples usuarios estan sufriendo sin reportar.
- **Hay un bug global en ciclo de vida (`finalizado_at_iso`)** introducido por una recomendacion de QA mia previa. Mi auditoria de E3.5b post-fixes aprobo el cambio sin validar contra schema real. Asumido como leccion.
- **Sandra reporta porque su red local empeora un patron que ya existia**. No es problema de Sandra exclusivamente; es problema sistemico que ella amplifica.
- **Sentry no esta identificando usuarios** (`user.email` y `user.id` son `null` en los 64 errores de los ultimos 14 dias). Eso es deuda critica de observabilidad.

El bundle integral debe corregir todo de raiz, no parchar sintomas individuales. Discovery termina aca; sub-issues estan listados en seccion final para abrir tras este merge de auditoria.

## Metodologia

Triage en 4 frentes paralelos, sin tocar codigo de produccion:

1. **Supabase via MCP** (read-only): identidad de usuarios, schema real, distribucion de duraciones de finalizacion, cleanup data, eventos de empresa.
2. **Vercel via MCP** (read-only logs): runtime logs, deployments, status codes. Limitado: no captura stack traces de Server Components.
3. **Sentry via MCP** (read-only events): issues unresolved, agrupacion por digest, IPs/geos, tags, breadcrumbs.
4. **Lectura de codigo en `main`** (sin worktree): solo confirmar que el bug `finalizado_at_iso` esta vigente. El resto del codigo se delega al Dev en briefs incrementales.

Datos crudos de la triage en seccion **Apendice A**.

## Mapa correlacionado de frentes

| # | Frente | Tipo | Volumen real | Causa raiz | Independiente? |
|---|---|---|---|---|---|
| F1 | `[finalization] server_error_response 400/500` | Bug volumen | 13 eventos/14d, 5+ IPs distintas | Server-side, sin diagnosticar (Dev) | Si |
| F2 | Crash `Server Components render` en ciclo de vida | Bug global | 1 evento/14d (Sandra) | `finalizado_at_iso` no existe en schema | Si |
| F3 | `confirmation_failed_after_poll` | UX cliente | 3 eventos/30d, 3 usuarios | Cliente no maneja timeout post-poll, no hay fallback a estado server | Comparte sintoma con F1 |
| F4 | Panel Empresas vacio + "Guardando cambios..." colgado al crear | Pendiente diagnostico | Solo Sandra reportado | Probable: timeout local Sandra agravando F1, pendiente confirmar | Probable Sandra-only |
| F5 | Sentry no identifica usuarios | Deuda observabilidad | 64/64 eventos sin `user.id` ni `user.email` | Falta `Sentry.setUser()` en cliente autenticado | Independiente |
| F6 | 265 NITs duplicados, 382 empresas sin profesional | Deuda calidad data | 22% + 32% del catalogo activo | Saneamiento historico nunca aplicado | Independiente |
| F7 | Lentitud sistematica de finalizacion | Sintoma reportado gerencia | Mediana 25s, p95 ~40s, max 47s | Finalizacion toca Drive + Sheets + PDF + Postgres en serie | Contribuye a F1 y F3 |
| F8 | NEXTJS-N: `Maximum update depth exceeded` | Bug React latente | 3 eventos/14d (23 abr) | Loop de setState no resuelto | Independiente |
| F9 | NEXTJS-Q: `usuario_login no encontrado` para `adrianaviveros@...` | Vinculacion auth | 3 eventos/14d | Profesional con auth_user_id huerfano | Independiente |
| F10 | NEXTJS-R: insercion estructural acta tras footer | Bug PDF/Sheets | 1 evento/14d | Generador de actas, fuera de scope Empresas | Fuera de scope |

## Detalle por frente

### F1 - `[finalization] server_error_response 400/500` (volumen alto silencioso)

**Sentry issue**: `JAVASCRIPT-NEXTJS-P` (groupID 7437152643). Estado: unresolved al momento del audit.

**Sintoma cliente**: el primer POST de finalizacion devuelve `4xx` o `5xx`. El cliente lo logea con tag `finalization_server_error=initial_response`. El usuario no necesariamente lo ve porque el sistema poolea status y eventualmente reporta succeeded (todas las finalizaciones cierran OK en BD - 0 fallos en 14 dias en `form_finalization_requests` para todos los usuarios).

**Eventos confirmados ultimos 14 dias** (lista parcial, ver Apendice A para detalle):

| Fecha | IP | Geo | Form | Status |
|---|---|---|---|---|
| 2026-05-06 01:29 | 190.165.56.69 | Rafael Uribe Uribe | presentacion | 400 |
| 2026-05-05 01:33 | 186.29.178.116 | Bogota | evaluacion | 400 |
| 2026-05-04 05:37 | 167.0.69.142 | Bogota | evaluacion | 400 |
| 2026-05-03 02:31 | 152.202.99.207 | Colombia | evaluacion | 400 |
| 2026-04-28 01:41 | 181.59.2.65 | Soacha | seleccion | 500 |
| (~8 mas hasta 2026-04-23) | | | | |

**Total**: 13 eventos, **5 IPs distintas confirmadas**, formularios afectados: presentacion, evaluacion, seleccion. Usuarios reales en silencio porque no falla la operacion final.

**Hipotesis a investigar (Dev)**:
- Race condition en server entre prewarm y finalizacion.
- Validacion de duplicados en BD que falla con 400 en primer intento (probable interaccion con F6 - 265 NITs duplicados).
- Timeout server-side intermedio que hace fallar inicial pero permite retry.
- Lock en `form_finalization_requests` por idempotency key.

**Datos para Dev**:
- Tabla `form_finalization_requests` muestra **TODAS succeeded en 14 dias** (avg 25s, p95 39s, max 47s).
- No hay `request_hash` repetido (sin retries client-side); pero el server tiene logica de polling que enmascara el initial fail.
- Los 5xx aparecen mas en evaluacion+presentacion+seleccion. No en condiciones-vacante.

**Por que Sandra lo nota mas**: su mediana es 30.6s vs 17-26s de otros. Si su red local corta connections >30s, ella nunca recibe la respuesta del retry/poll y queda colgada. Otros usuarios reciben el succeed final sin ver el fail intermedio.

### F2 - Crash en ciclo de vida (`finalizado_at_iso`)

**Sentry issue**: `JAVASCRIPT-NEXTJS-W` (groupID 7458796743). Solo evento: 2026-05-04T15:21:32 UTC.

**Datos del evento**:
- `culprit=/hub/empresas/:id/ciclo-vida`.
- IP 191.156.149.2 (Bogota), Chrome 147 Windows.
- Replay capturado: `replayId=24c032421c0343e18a425543e75dfc93`.
- `mechanism=generic, handled=yes` - el `error.tsx` boundary lo atrapa, devuelve 200 con HTML de fallback. Por eso Vercel no muestra 5xx.

**Causa raiz confirmada (codigo + schema)**:
- `src/lib/empresas/lifecycle-tree-server.ts:16` lista `"finalizado_at_iso"` en `EMPRESA_LIFECYCLE_EVIDENCE_FIELDS`.
- `src/lib/empresas/lifecycle-tree-server.ts:171` ordena por `finalizado_at_iso`.
- `src/lib/empresas/lifecycle-tree.ts:33,288` lee `row.finalizado_at_iso`.
- Schema real de `formatos_finalizados_il`: NO tiene esa columna. Solo `finalizado_at_colombia` (timestamp without time zone), `created_at` (timestamptz), `payload_generated_at`.
- Resultado: la query SELECT falla con `column "finalizado_at_iso" does not exist`. Excepcion no atrapada por `try { } catch (EmpresaServerError 404)`. Re-throw - `error.tsx` - pantalla "Ocurrio un error inesperado".

**Origen del bug**: introducido en mi auditoria post-QA de E3.5b (mayo 2026), Hallazgo Mayor #2 mio que pidio cambiar el ORDER BY a `finalizado_at_iso`. El Dev reporto "supabase:doctor pasa, lint pasa, build pasa" y verifique leyendo el codigo, **sin confirmar que la columna existiera en Supabase**. Tests del motor mockean el cliente Supabase, no chocan con schema real.

**Alcance global**: cualquier admin o profesional que entre a `/hub/empresas/[id]/ciclo-vida` de empresa con al menos una evidencia en `formatos_finalizados_il` lo va a sufrir. Por que solo Sandra lo disparo: ciclo de vida es feature reciente, navegacion opcional via CTA, otros usuarios no entraron a empresas con evidencia en 14 dias.

**Empresa especifica del primer evento**: HABITEL S.A.S, NIT 830511280-1, Activa, No Compensar, 3 evidencias finalizadas (Condiciones Vacante + 2x Presentacion del Programa).

### F3 - `confirmation_failed_after_poll`

**Sentry issue**: `JAVASCRIPT-NEXTJS-6` (groupID 7418960836). 3 eventos en 30 dias.

**Datos**:
- 2026-04-24 04:44 - IP 181.237.190.12 (Kennedy, Bogota), Chrome 147, **`environment=vercel-preview`**, form_slug=presentacion.
- 2026-04-17 03:05 - IP 191.109.66.71 (Barrancabermeja), Chrome 147, production, form_slug=presentacion.
- 2026-04-17 03:04 - IP 191.109.66.71 (Bogota), Chrome 147, production, form_slug=presentacion.

**Sintoma**: cliente terminado de finalizar acta, polling para confirmar resultado server fall a despues de N intentos. UX muestra "Failed to fetch" o "Verificar de nuevo".

**Causa raiz hipotesis**: el cliente espera respuesta del polling con timeout fijo. Si la red local del usuario corta connections largas (router, ISP, firewall), el fetch del polling falla. Server completa OK en BD pero el cliente no lo sabe.

**Patron observado**: 3 eventos de 3 ubicaciones distintas - Kennedy, Barrancabermeja, Bogota. Sandra reporto este sintoma con su acta `adf87a0c-62c3-40aa-a839-1c7979b469c1` el 2026-05-06 13:38 (acta finalizada en 24.5s server-side, succeeded en BD, "Failed to fetch" en cliente). No hay evento Sentry de ese 2026-05-06 con `confirmation_failed_after_poll` - posiblemente porque el SDK lo logea como warning no error o porque Sentry hace sampling.

**Fix propuesto**: cuando el polling falla, en vez de mostrar "Failed to fetch", consultar `form_finalization_requests` por idempotency key y mostrar al usuario el estado real (succeeded/processing). Logica server-side defensiva. Backwards compatible.

### F4 - Panel Empresas vacio + "Guardando cambios..." colgado al crear

**Sintomas reportados Sandra**:
- 4-6 mayo: panel `/hub/empresas` se queda en blanco al hacer click.
- 6 mayo 13:17: "Guardando cambios..." colgado al crear VERTIV COLOMBIA SAS.

**Datos**:
- VERTIV se creo OK en BD (id 88925098-eb4e-437b-8f84-6d3809637d90, NIT 800252589, 13:17:32). Sin duplicado. Sin retry visible (el cliente no reintento).
- Panel listing query es `Seq Scan` 1.2ms en EXPLAIN ANALYZE con 1191 empresas. NO es bottleneck server-side.
- Sentry no muestra eventos de "panel vacio" - probablemente porque el render server-side no lanza error, simplemente el cliente nunca recibe la response RSC.

**Hipotesis dominante**: timeout local Sandra (igual que F3). El cliente nunca recibe la response RSC del listado o de la mutation. Otros usuarios no reportaron este sintoma especifico.

**Pendiente Dev**: leer `EmpresaForm` (mutation post-respuesta) y `EmpresasListView` (renderizado del listado) para confirmar si el cliente tiene timeout fijo, manejo de error de fetch, fallback a refresh tras N segundos.

### F5 - Sentry no identifica usuarios (deuda observabilidad)

**Evidencia**: `search_events` agregado por user en 14 dias devuelve **64 eventos, todos con `user.email=null` y `user.id=null`**.

**Impacto**:
- No podemos filtrar errores por usuario en Sentry.
- Todo el triage actual correlacionamos por timestamp e IP/geo.
- Para futuros incidentes, no sabremos a quien afecto un bug sin timestamp exacto.

**Fix**: en cliente autenticado, agregar `Sentry.setUser({ id, email, username })` cuando carga la sesion. Tipico Next.js layout o root provider. Trivial tecnico, impacto enorme.

### F6 - Calidad de data en `empresas`

**Conteos confirmados via Supabase MCP**:

| Bucket | Empresas afectadas | % del catalogo activo (1191) |
|---|---|---|
| NIT NULL | 10 | 0.8% |
| NIT vacio | 10 | 0.8% |
| Duplicados por NIT exacto | 265 | 22% |
| Duplicados por nombre normalizado | 18 | 1.5% |
| Sin profesional asignado | 382 | 32% |
| Sin estado | 97 | 8% |

**Issue GitHub**: #85 (en milestone Empresas) reportaba 68 duplicados; el real es **265**. Issue debe actualizarse.

**Impacto operativo**:
- Si la creacion de empresa hace lookup de duplicados antes de insertar (probable), las queries de unicidad pueden estar sufriendo a esta escala.
- Si el panel hace agrupacion por NIT, mostraria datos incoherentes.

**Cross-cutting**: relacionado con #156 (consolidar `findEmpresasByNit`/`listActiveEmpresasByNit`) que sigue cross-modulo Seguimientos<->Empresas.

### F7 - Lentitud sistematica de finalizacion

**Datos Supabase ultimo 14 dias** (`form_finalization_requests`):

| Usuario | Total | Avg | p50 | p95 | Max | % >30s |
|---|---|---|---|---|---|---|
| Andrea Henao (`bb1929c8`) | 39 | 19.5s | 18.0s | 34.9s | 38s | 8% |
| **Sandra (`cd13cb36`)** | 35 | 30.3s | 30.6s | 39.3s | 43s | **54%** |
| (otro id 35 events) | 35 | 23.4s | 23.7s | 31.4s | 45s | 9% |
| (sin nombre, 29 events) | 29 | 17.3s | 17.0s | 21.0s | 21s | 0% |
| **Alejandra Perez (`8607a91f`)** | 21 | 29.8s | 30.0s | 38.8s | 47s | **48%** |
| (otros 7 usuarios) | 4-25 | 23-34s | 22-36s | 29-47s | 28-47s | 0-50% |

**Sandra y Alejandra son outliers**: ambas tienen mediana de 30s. Otros usuarios estan en 17-26s.

**Caso de control confirmado**: Andrea Henao (`bb1929c8`, p50 18s, 8% sobre 30s, 39 finalizaciones en 14d) reporta directamente al PO Empresas que sus finalizaciones terminan en 10-15 segundos y **nunca ha tenido errores** (confirmacion 2026-05-06). Esto valida la hipotesis del umbral psicologico: bajo ~25s la finalizacion es transparente para el usuario, sobre ~30s aparecen los sintomas reportados. Sandra esta sobre 30s en 54% de operaciones, Alejandra en 48%, Andrea en 8%. Alejandra todavia no respondio al ping a 2026-05-06.

**Stages (`external_stage`)** mas comunes: `drive.upload_pdf`, `spreadsheet.apply_mutation_done`. Es decir, el cuello de botella es Drive y Sheets, no Postgres.

**Cero finalizaciones failed** en 14 dias para ningun usuario. El server siempre completa, pero al cliente le toma 17-47s recibir la confirmacion final.

**Bundle no necesita optimizar esto en F1.** Pero esta lentitud sistematica AGRAVA F1 y F3 - cualquier red local con timeout <30s va a sufrir. Optimizar finalizacion es trabajo separado, no urgente, pero entra al backlog.

### F8 - NEXTJS-N: Maximum update depth exceeded

**Sentry issue**: `JAVASCRIPT-NEXTJS-N` (groupID 7436784499). 3 eventos en 14 dias, todos 2026-04-23.

**Sintoma**: React loop de setState. Probablemente bug de hook con dependencia incorrecta.

**Pendiente Dev**: localizar componente afectado (no esta en stack publico).

### F9 - NEXTJS-Q: usuario_login huerfano

**Sentry issue**: `JAVASCRIPT-NEXTJS-Q` (groupID 7437152678). 3 eventos en 14 dias.

**Sintoma**: `Error: No se encontro usuario_login para el correo autenticado: adrianaviveros@recacolombia.org`.

**Causa probable**: el usuario `adrianaviveros@...` tiene sesion Auth Supabase pero no tiene entrada en `profesionales` con ese correo, o el correo cambio sin actualizar `correo_profesional`. Bug data, no de codigo.

### F10 - NEXTJS-R: insercion estructural acta tras footer

**Sentry issue**: `JAVASCRIPT-NEXTJS-R`. 1 evento, 24 abril.

**Sintoma**: `Error: La insercion estructural de "1. PRESENTACION DEL PROGRAMA IL" ocurre en o despues del footer ACTA ID y no se puede reanudar de forma segura.`

**Scope**: generador de actas (Sheets/PDF). Fuera del modulo Empresas. Mencion solo para completitud.

## Restricciones globales del bundle

Todas las correcciones del bundle deben respetar:

- **Backwards compatibility / no bloqueo**: panel Empresas y finalizacion deben seguir operativos durante toda la implementacion. Si un fix nuevo falla, el flujo viejo debe seguir operando.
- **Egress Supabase debajo del 50% del free tier** (decision E2D vigente).
- **`pg_trgm` sigue diferido** salvo medicion `>1.5s` en busquedas (ninguna evidencia hasta ahora lo justifica).
- **No-fantasma test obligatorio** en cada fix: revertir el fix debe hacer fallar el test. Para F1 y F2 esto es critico.
- **No tocar `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*`, `src/app/api/formularios/*` ni hooks de formularios** **salvo en F1** que toca el flow de finalizacion explicitamente.
- **Sandra y otros usuarios con red local intermitente deben quedar mejor con el bundle, no peor**.

## Plan de sub-issues (orden propuesto)

Orden por dolor compuesto = (volumen real) x (severidad usuario) - (costo de fix). Frentes 4-7 son deuda continua, no parte del bundle inmediato.

### Tanda 1 - Bundle inmediato

**1. F2 fix `finalizado_at_iso`** (XS, 1-2h)
   - Modificar `lifecycle-tree-server.ts:16,171` y `lifecycle-tree.ts:33,288`.
   - Reemplazar por `finalizado_at_colombia` o eliminar referencia (usar solo `created_at`).
   - **Test no-fantasma obligatorio**: integration test que valida la query corre contra Supabase real (no mock).
   - QA dual: si.
   - Severidad: cualquier admin/profesional que entre a ciclo de vida de empresa con evidencia.

**2. F1 investigar `server_error_response 400/500`** (M, 4-8h discovery + impl)
   - Discovery Dev: trazar root cause server-side. Posibles vias:
     - `console.log` instrumentado en cliente con `request_id` para correlacionar con server.
     - Lectura de codigo de finalizacion (`src/lib/finalization/`, `src/app/api/formularios/[slug]/route.ts`).
     - Replay del evento Sentry (hay replay disponible para F2; ver si hay para F1).
     - Reproducir con perfil de prueba en preview.
   - Una vez root cause confirmada, abrir sub-issue de fix.
   - Severidad: 13 eventos/14d, 5+ usuarios silenciosos.
   - **Sub-decision PO**: si el fix toca `src/lib/finalization/` (fuera del scope Empresas estricto), validar con PO ODS y/o Aaron.

**3. F3 fallback a estado server cuando polling falla** (S, 2-4h)
   - En cliente, cuando `confirmation_failed_after_poll` se dispara, consultar `form_finalization_requests` por idempotency key del flow actual y mostrar estado real al usuario.
   - Modal con copy: "Tu finalizacion puede haberse completado correctamente. Estado actual: <status>. <link a refresh>".
   - **Test no-fantasma**: simular timeout polling, validar que muestra estado server real.
   - Severidad: media. Mejora UX para usuarios con red intermitente.

**4. F5 `Sentry.setUser()` en cliente autenticado** (XS, 1h)
   - En layout root o provider de sesion del lado cliente, llamar `Sentry.setUser({ id: profesional.id, email: profesional.correo_profesional, username: profesional.usuario_login })`.
   - **Test no-fantasma**: agregar test que valida que un evento Sentry simulado tras login incluye `user.id`.
   - Bloquea: nada.
   - Severidad: alta para mantenimiento futuro. Sin esto, la proxima triage va a ciegas.

### Tanda 2 - Sandra-specific (post Tanda 1)

**5. F4 confirmar root cause** (S, 2-4h discovery)
   - Dev lee `EmpresaForm` post-mutation y `EmpresasListView`.
   - Reproducir con perfil de prueba en `vercel-preview` con throttling network simulado.
   - Si confirma timeout local Sandra: mismo fix que F3 (fallback a estado server).
   - Si confirma otra causa: abrir sub-issue.

### Tanda 3 - Deuda separada

**6. F6 cleanup data #85** (M, 4-6h)
   - Plan de saneamiento: 265 NITs duplicados, 10 NULL, 382 sin profesional.
   - Decision PO de UX: que mostrar al usuario en duplicados antes del fix.
   - Migracion idempotente con backup.
   - **Cross-modulo**: validar con PO Seguimientos por #156.

**7. F8 fix Maximum update depth** (S, 2h)
   - Localizar componente con `componentDidUpdate` o `useEffect` con setState recurrente.
   - Fix de dependencia / guard.

**8. F9 limpieza `adrianaviveros@...` y similares** (XS, 30min)
   - Validar en `profesionales` y `auth.users`. Re-vincular o invitar de nuevo.

### Latente (sin tanda, no bloquea)

- F7 lentitud sistematica finalizacion: optimizacion de Drive + Sheets + PDF queda como audit separado. Mencionado en plan post-Fase 7 del repo.
- F10 insercion estructural acta tras footer: del scope ODS, fuera de Empresas.

## Decisiones pendientes de PO antes de Tanda 1

1. **Confirmar con Aleja y Andrea** los sintomas reportados. Andrea CONFIRMO 2026-05-06 que termina en 10-15s y nunca ha tenido errores (caso de control valido). Aleja sigue pendiente. Resultado afecta priorizacion entre F4 (Sandra-only) y F1 (sistemico): la confirmacion de Andrea refuerza F1 como sistemico para usuarios sobre el umbral de 25-30s.
2. **Decidir si F1 entra o no al milestone Empresas** o se delega al PO ODS dado que toca `src/lib/finalization/`. Mi recomendacion: PO Empresas mantiene ownership porque el sintoma es en el modulo Empresas; coordinacion con PO ODS si el fix obliga a tocar codigo compartido.
3. **Decidir si saneamos Sentry user ID antes de Tanda 1 o paralelo**. Mi recomendacion: paralelo (F5 puede ir como sub-issue de Tanda 1 sin bloquear).
4. **Verificar si hay evento Sentry de `confirmation_failed_after_poll` el 2026-05-06** (acta de Sandra). Si no existe, Sentry esta haciendo sampling y debemos entender por que.

## Apendice A - Datos crudos de la triage

### A1. Identidades de usuarios mencionados

| auth_user_id | Nombre | Login | Rol | Email |
|---|---|---|---|---|
| `cd13cb36-e2c9-4697-a9ad-b84631477cd9` | Sandra Milena Pachon Rojas | sanpac | admin + profesional | sandrapachon@recacolombia.org |
| `8607a91f-e8ef-4103-a13e-ece687f5888a` | Alejandra Perez Bustacara | lauper | profesional | alejandraperez@recacolombia.org |
| `bb1929c8-d17d-435f-b8a5-479a3514be33` | Andrea Henao | andhen | profesional | andreahenao@recacolombia.org |

### A2. Sentry issues relevantes

| Issue ID | Titulo abreviado | groupID | Eventos/14d | Estado |
|---|---|---|---|---|
| `JAVASCRIPT-NEXTJS-P` | finalization server_error_response 400/500 | 7437152643 | 13 | unresolved |
| `JAVASCRIPT-NEXTJS-W` | Server Components render (ciclo de vida) | 7458796743 | 1 | (no en unresolved) |
| `JAVASCRIPT-NEXTJS-6` | confirmation_failed_after_poll | 7418960836 | 3 | (latente) |
| `JAVASCRIPT-NEXTJS-T` | Debe ingresar horas o minutos cuando hay servicio de interpretacion | 7450990027 | 14 (pico 30 abr) | (formularios) |
| `JAVASCRIPT-NEXTJS-N` | Maximum update depth exceeded | 7436784499 | 3 | latente |
| `JAVASCRIPT-NEXTJS-Q` | usuario_login no encontrado adrianaviveros | 7437152678 | 3 | latente |
| `JAVASCRIPT-NEXTJS-R` | insercion estructural tras footer | (n/a) | 1 | scope ODS |
| `JAVASCRIPT-NEXTJS-G` | FinalizationPrewarmPreparationError | 7435108656 | 3 | conocido |

### A3. Empresa con bug F2

- ID: `6b03e3f0-dbd0-4005-a642-f8fc3b2d316d`
- Nombre: HABITEL S.A.S
- NIT: 830511280-1
- Caja: No Compensar
- Estado: Activa
- Evidencia: 3 registros en `formatos_finalizados_il` (Condiciones Vacante + 2 Presentacion del Programa).

### A4. Acta colgada Sandra

- registro_id: `adf87a0c-62c3-40aa-a839-1c7979b469c1`
- Empresa: Vertiv (id 88925098-eb4e-437b-8f84-6d3809637d90)
- Form: Presentacion del Programa
- Server: 2026-05-06 13:38:55, 24.5s, succeeded.
- Cliente: "Failed to fetch" tras 1m 50s de espera.

### A5. EXPLAIN ANALYZE listado empresas

```sql
SELECT id, nombre_empresa, nit_empresa, ciudad_empresa, estado, profesional_asignado_id, caja_compensacion, updated_at
FROM empresas
WHERE deleted_at IS NULL
ORDER BY updated_at DESC NULLS LAST
LIMIT 100;
```

- **Plan**: Limit -> Sort (top-N heapsort) -> Seq Scan empresas.
- **Tiempo**: 1.215 ms total. 125 buffers shared hit, 0 reads. **No es bottleneck**.

### A6. Snapshot deployments Vercel

- Production actual: `dpl_6VVtCTmFDK8y9hqa9WRU6WZgcXyr` (commit `ac4bcb77`, "F4 Seguimientos polish", 2026-05-06).
- Bug F2 vigente desde el merge a main de E3.5b post-fixes (anterior a este audit).

## Apendice B - Limitaciones del audit

- **Vercel runtime logs no captura stack traces de Server Components**. El `error.tsx` boundary atrapa la excepcion y devuelve 200 con HTML; Vercel solo registra el 200. Sentry es la unica fuente del stack para F2.
- **Sentry no identifica usuarios** (F5). La correlacion con Sandra/Aleja/Andrea fue por IP/geo/timestamp, no por user.id. Decisiones derivadas son de alta confianza pero no confirmadas a nivel de usuario. Resuelto post-F5: ver Cierre Tanda 1.
- **No se reprodujo F2 ni F3 en local**. El audit es read-only sobre produccion. La reproduccion queda para el Dev en el sub-issue.
- **No se leyo `EmpresaForm`, `EmpresasListView`, `src/lib/finalization/`** - delegado al Dev en briefs incrementales.

## Cierre Tanda 1 - 2026-05-06

Tanda 1 implementada en branch `codex/empresas-tanda-1` con 4 sub-issues acumulados. PR final con `Closes #162, #163, #164, #165`. Reportes QA dual de cada frente cumplidos sin blockers.

### Resumen de hallazgos vs lo que esperaba el discovery

| Frente | Hipotesis del audit | Realidad post-Dev | Status |
|---|---|---|---|
| F2 #162 | Bug global de schema, root cause confirmada | Confirmado tal cual: query a columna inexistente | Cerrado |
| F1 #163 | Bug volumen alto silencioso afectando multiples usuarios | **Giro: era ruido de telemetria**. Las 4 hipotesis (race condition prewarm, duplicados NIT, timeouts Drive/Sheets, lock idempotency) refutadas con evidencia. Root cause real: 400 de validacion Zod normal reportados a Sentry como `server_error_response`. KPI BD `0 failed` lo confirmo. Fix: whitelist explicita en confirmation layer | Cerrado |
| F3 #164 | UX defensivo con fallback a endpoint de status | Confirmado: reusa `/api/formularios/finalization-status` existente, max 3 intentos con `retryAfterSeconds` capeado a 30s, telemetria preservada Opcion A | Cerrado |
| F5 #165 | Trivial: `Sentry.setUser()` post-login | Confirmado, con edge case detectado: profesionales con `correo_profesional` NULL caen a `auth.users.email` (preexistente, capturado en #171) | Cerrado |

### Notas operativas detectadas durante implementacion

- **500 historicos `usuario_login`** (F1 / Sentry NEXTJS-Q): atribuidos a releases anteriores con fallback posterior por `app_metadata.usuario_login`, `profesionales.auth_user_id` y correo legacy. No reaparecen en release actual. Reabrir solo si vuelven.
- **Andrea Henao confirmada como caso de control**: termina en 10-15s sin errores, valida el umbral psicologico de 25-30s sobre el cual aparecen los sintomas reportados.
- **Alejandra Perez** sigue pendiente de respuesta al ping; su patron (48% finalizaciones >30s) sugiere el mismo perfil que Sandra.
- **Edge case email Sentry**: el fallback `correo_profesional ?? auth.users.email` en `serializeProfessional` significa que profesionales con datos huerfanos en `profesionales.correo_profesional` envian email auth en vez del corporativo. Capturado en #171.

### Deuda capturada para continuidad (7 issues tech-debt totales)

- **#166** schema validation guard cross-repo (origen: F2 R1+R3).
- **#167** Date.parse NaN sobre `timestamp without time zone` (origen: F2 Menor 1 + R2 + R4 + Arch H4).
- **#168** `nombre_empresa` vacio overquery (origen: F2 R5).
- **#169** fallback finalizacion sin timeout propio por intento (origen: F3 R2).
- **#170** consolidar `readNonEmptyString` en `src/lib/observability/` (origen: F5 Arch H2).
- **#171** Sentry email fallback `auth.users.email` cuando `correo_profesional` null (origen: F5 Menor 2 / H4).
- **#172** telemetria ausente para errores de red en initial response (origen: F1 Riesgo B).

### Re-priorizacion del bundle pendiente (post Tanda 1)

- **Tanda 2 (F4)**: panel Empresas vacio + crear empresa colgado Sandra. Bajo prioridad: con F1+F3 cerrados, los sintomas de Sandra deberian reducirse significativamente. Reabrir solo si persisten.
- **Tanda 3**: F6 (#85 saneamiento data 265 NITs duplicados + 382 sin profesional + 10 NULL), F8 (NEXTJS-N Maximum update depth), F9 (NEXTJS-Q `adrianaviveros` auth huerfano).
- **Latentes**: F7 (lentitud sistematica finalizacion mediana 25s), F10 (acta tras footer scope ODS).

### KPI invariante post-merge

`form_finalization_requests` debe seguir con **0 rows `status='failed'`** en muestra continuamente. Si aparece >0 post-merge, reabrir investigacion porque el bundle no debio degradar este KPI.
