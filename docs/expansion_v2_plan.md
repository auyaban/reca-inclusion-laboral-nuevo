# Plan de expansión multi-app v2 — INCLUSION_LABORAL_NUEVO

> Documento vivo. Es la guía maestra del Product Owner para esta expansión.
> Cualquier dev que vaya a tomar trabajo aquí debe leer este archivo entero antes de pedir tickets.
> Las decisiones se versionan en la sección **Histórico de decisiones** al final.

- **Autor PO:** Claude (rol Product Owner)
- **Owner humano:** Aaron Uyaban
- **Fecha de creación:** 2026-04-28
- **Estado:** aprobado para iniciar implementación de E0
- **Repositorios legacy de referencia:**
  - `C:\Users\aaron\Desktop\empresas_reca` (CRUD de empresas en Tkinter — origen de E2)
  - `C:\Users\aaron\Desktop\RECA_ODS` (sistema de servicios y proyecciones — origen de E6 ODS)
  - `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL` (formularios originales en Tkinter — ya migrados al repo actual)

---

## 1. Visión y objetivo de negocio

Hoy `INCLUSION_LABORAL_NUEVO` es una app monolítica de **diligenciamiento de actas**: el profesional entra, llena un formato, lo finaliza a Sheet+PDF+Supabase. Es lo único que ofrece el `/hub`.

La visión es convertirla en una **plataforma multi-módulo** sin romper lo que ya funciona:

- Aparece un **sidebar tipo Google** (hamburguesita, expande/colapsa) en `/hub` y subrutas. No aparece dentro del editor de un formato.
- El sidebar agrupa **áreas**:
  - **Formatos** → exactamente lo que hoy existe en `/hub`. Encapsulado, no se toca.
  - **Empresas** → módulo nuevo. Foco principal de esta expansión.
  - **ODS** → placeholder visible pero deshabilitado. Se construye en una expansión futura.
- **Formatos** sigue siendo un lanzador de actas como hoy.
- **Empresas** es un sub-hub con su propia navegación interna: *Mis empresas*, *Reclamar*, *Calendario*, y la vista detalle de una empresa con su ciclo de vida.

El objetivo de negocio es que la app deje de ser **solo captura** y pase a ser **gestión**: el profesional ve qué empresas son suyas, en qué etapa están, qué falta hacer, y proyecta su semana. La gerencia, en una fase posterior, ve KPIs reales en tiempo real sin pedir reportes manuales.

### Principios rectores

1. **No tocar lo que ya funciona.** Los formatos, drafts, finalización, prewarm, autosave, hub admin de borradores: intactos. Las nuevas áreas se montan al lado.
2. **Encapsular antes de extender.** El sidebar envuelve la pantalla actual del hub; no la reescribe.
3. **Trazabilidad total.** Toda acción sobre una empresa (asignación, reclamo, soltado, cambio de estado, nota) queda en una bitácora con autor, timestamp y comentario. Render en hora Colombia (`America/Bogota`); BD en UTC.
4. **Datos primero.** Hay 1134 empresas y miles de actas finalizadas en Supabase: el ciclo de vida y los KPIs se derivan de datos existentes, no se reinventan.
5. **Etapas se trabajan 1×1 después.** En esta expansión solo se construye la **estructura** del ciclo de vida (tarjetas vacías, tipo de etapa, link al formato). El comportamiento fino de cada etapa va en una épica posterior (E5).

---

## 2. Roles del sistema

Dia 1 del plan mantiene un rol operativo base para todo usuario autenticado y agrega permisos de aplicacion acumulables para capacidades especiales. Cualquier permiso adicional (interprete, asesor Compensar, auxiliar admin) llega cuando una epica futura lo requiera.

| Rol | Quiénes | Capabilities día 1 |
|---|---|---|
| `inclusion_empresas_admin` (`Admin Inclusión`) | Aaron Vercel, Sandra Pachon, Sara Zambrano, Adriana Viveros | CRUD de empresas/profesionales, asignar/desasignar, ver bitácora completa, administrar acceso Auth y roles de Inclusión |
| `inclusion_empresas_profesional` (`Profesional Inclusión`) | Profesionales con acceso Auth al módulo Empresas | Ver y reclamar empresas, soltar, agregar notas, cambiar estado de **sus** empresas, ver calendario propio |

**Decision estructural actualizada:** los permisos viven en la tabla puente `profesional_roles`, no en una columna unica `profesionales.rol`. Esto permite multiples roles por usuario sin migraciones disruptivas. Los permisos activos de Inclusión son `inclusion_empresas_admin` y `inclusion_empresas_profesional`, siempre traducidos a lenguaje natural cuando sean visibles para el usuario final.

**Resolucion del rol en runtime:** la API/SSR resuelve permisos por la cadena `auth.user.id -> profesionales.auth_user_id -> profesional_roles.role`, con fallback historico por `auth.user.email -> profesionales.correo_profesional`. El cliente no debe asumir roles desde el JWT en el dia 1; siempre se valida en server-side antes de dejar pasar una accion privilegiada.

**Identidad del usuario en bitácoras:** se persiste `auth.users.id` (uuid). Se guarda además un snapshot `actor_nombre` en la bitácora para que la timeline siga siendo legible aunque un profesional sea desactivado o renombrado en el futuro.

---

## 3. Decisiones de producto cerradas

Estas decisiones ya no se discuten. Si un dev quiere modificarlas, debe abrir conversación con el PO antes.

### 3.1 Sidebar y áreas

- Sidebar **solo** en `/hub` y subrutas. No en `/formularios/*`.
- Áreas día 1: **Formatos**, **Empresas**, **ODS** (deshabilitado, tooltip "próximamente").
- Sidebar colapsable, persistencia del estado abierto/cerrado por usuario en `localStorage`.
- Click en "Formatos" del sidebar → `/hub` actual sin cambios. Click en "Empresas" → `/hub/empresas`.

### 3.2 Empresas — modelo de "reclamar"

- **Reclamar = asignación inmediata** al usuario que reclama, esté la empresa libre u ocupada.
- Si la empresa estaba libre: reclamo sin comentario obligatorio.
- Si la empresa tenía dueño previo (reclamar = quitar a otro): comentario **obligatorio**.
- **Soltar:** comentario obligatorio. La empresa vuelve al pool libre (sin profesional asignado).
- **Quitar es indistinto de reclamar a una empresa ocupada** — desde la UI son la misma acción ("Reclamar"), la diferencia la determina el estado actual de la empresa. La bitácora registra dos eventos cuando aplica: `quitada` (al anterior dueño) + `reclamada` (al nuevo).
- Reclamar y soltar **no requieren aprobación del gerente**. Son inmediatos. La auditoría es la garantía.

### 3.3 Empresas — backup y trabajo cruzado

- **Cualquier profesional autenticado puede crear actas para cualquier empresa.** El acta queda con `user_id` del que la creó.
- La empresa **no cambia de dueño** porque otro profesional cree un acta sobre ella.
- Esto es para cubrir incapacidades, backups, apoyo entre colegas, e intérpretes esporádicos.
- En el detalle de la empresa se muestra el acta y quién la creó, distinguible si fue el dueño u otro.

### 3.4 Empresas — estados

Lista canónica (idéntica al legacy `empresas_reca`):

`Activa · En Proceso · Pausada · Cerrada · Inactiva`

- **Default al crear:** `En Proceso`.
- **Cambio de estado siempre requiere comentario obligatorio.**
- Pueden ocurrir varios cambios de estado en la vida de una empresa. Cada uno queda en bitácora.
- Quién puede cambiar el estado: el **dueño actual** o el **gerente**.

### 3.5 Notas y bitácora

- **UX tipo Jira:** stream cronológico, lo más nuevo arriba, autor visible, timestamp en hora Colombia.
- Las **notas son un tipo más** dentro de una bitácora unificada (`empresa_eventos`). Otros tipos en la misma timeline: cambio de estado, asignaciones, reclamos, soltados, creación, edición.
- Filtros sobre la timeline: *Todo* (default) · *Solo notas* · *Solo cambios de empresa*.
- Las notas no se editan ni se borran (para preservar la auditoría). Si el usuario se equivoca, agrega otra nota corrigiendo. Esta regla aplica también a otros eventos.

### 3.6 Calendario

- Es **una pestaña dentro de Empresas**, no un área aparte del sidebar.
- Vistas: **mes / semana / día** (las 3, switchable).
- Eventos siempre **atados a una empresa** (no se permiten eventos huérfanos día 1).
- Cada profesional ve **solo sus propios eventos**.
- El gerente ve sus eventos propios; la vista consolidada del equipo se difiere a la épica de KPIs (E6).

### 3.7 Importación masiva de empresas

- **Fuera del día 1.** Las 1134 empresas ya viven en Supabase y el legacy `empresas_reca` sigue operable si hace falta cargar más. Cuando llegue el momento se reevalúa.

### 3.8 Hora colombiana

- BD persiste en `timestamptz` (UTC).
- Todo render en UI usa `America/Bogota`.
- Helper compartido `formatBogotaDateTime(date)` para uso transversal en toda la app.

---

## 4. Constraints técnicos durables

Estos guardrails no son negociables sin discusión explícita con el PO.

- **Stack:** Next.js 16 (App Router), Tailwind v4, shadcn/ui, React Hook Form + Zod, Supabase, Zustand donde aplique. Nada nuevo.
- **No fetch directo a Supabase desde componentes.** Las acciones críticas (reclamar, soltar, cambio de estado, notas, CRUD de empresa) pasan por **API routes** en `src/app/api/empresas/...`. Esto garantiza atomicidad (UPDATE empresa + INSERT evento en la misma transacción) y simplifica RLS.
- **RLS pesimista pero no exhaustiva.** RLS define qué puede leer/escribir cada rol como red de seguridad. La lógica fina (puedes cambiar estado solo si eres dueño o gerente) vive en API routes con `service_role`.
- **Cero infra paga adicional.** Sin queues, sin cron managed, sin Redis nuevo. Todo dentro de Supabase + Vercel.
- **No tocar el código de formatos.** `src/app/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*`, `src/hooks/use*FormState*`: intocable. Si una épica futura requiere acoplar (ej: derivar etapa del ciclo de vida desde el slug del formato), se hace por **lectura** desde `formatos_finalizados_il`, nunca modificando el flujo de finalización.
- **Sidebar como layout, no como página.** El layout que monta el sidebar debe ser el `layout.tsx` de `/hub`. Si el editor de un formato vive bajo `/formularios/*`, ya está fuera de ese layout y no hereda el sidebar — lo cual es exactamente lo deseado.
- **No introducir `middleware.ts`.** El proxy del repo es `src/proxy.ts`. La protección por rol se agrega ahí.
- **Convenciones existentes:** PascalCase en componentes, camelCase en hooks/utils, schemas Zod antes que componentes, validaciones server-side replicadas con el mismo schema.

---

## 5. Épicas — orden de ejecución

Cada épica es **entregable independiente**. No se mezclan. La E0 desbloquea las demás.

### E0 — Sistema de roles

**Objetivo.** Diferenciar profesionales con permiso `inclusion_empresas_admin` de profesionales sin ese permiso, con backing real en BD, server-side gating de acciones privilegiadas, y un helper de cliente para condicionar UI.

**Alcance — entra:**
- Tabla puente `profesional_roles` con `CHECK CONSTRAINT IN ('inclusion_empresas_admin')`.
- Migracion para asignar `inclusion_empresas_admin` a `aaron_vercel`, `sanpac` (Sandra Pachon), `sarazambrano` y `AdrianaViveros`.
- Helper server `getCurrentUserContext()` en `src/lib/auth/roles.ts` que resuelve el profesional por `auth_user_id` y fallback por email.
- Helper client `useCurrentRole()` que llama a un endpoint cacheable `GET /api/auth/me` y devuelve `{ roles, displayName, hasRole }`.
- Endpoint `GET /api/auth/me` que retorna `{ roles, displayName, email, usuarioLogin, profesionalId }`. Cache HTTP corto (60s).
- Helper para API routes: `requireAppRole(['inclusion_empresas_admin'])` que retorna 403 si no aplica.

**Alcance — fuera:**
- Permisos adicionales (interprete, etc.).
- UI de administración de roles (la asignación se hace por SQL en esta épica).
- Cambio dinámico de rol sin re-login.

**Permisos:**
| Accion | inclusion_empresas_admin | profesional sin permiso admin |
|---|---|---|
| Leer sus roles | ✓ | ✓ |
| Cambiar roles de otros | ✗ (manual SQL) | ✗ |

**UX / rutas:** ningún cambio visible al usuario en esta épica. Es plumbing.

**Datos:**
```
CREATE TABLE profesional_roles (
  profesional_id bigint NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('inclusion_empresas_admin')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (profesional_id, role)
);
```

**Criterios de aceptación:**
- `GET /api/auth/me` retorna `inclusion_empresas_admin` para los 4 administradores iniciales y `roles: []` para un profesional cualquiera.
- `requireAppRole` rechaza con 403 cuando el rol no coincide.
- `useCurrentRole()` no produce flicker en la UI (el layout `/hub` lo resuelve server-side antes de renderizar children).

**Dependencias:** ninguna. Es la primera épica.

---

### E1 — Shell con sidebar + áreas

**Objetivo.** Envolver `/hub` y todas sus subrutas con un layout que contenga el sidebar tipo Google. Áreas: Formatos (lleva a `/hub`), Empresas (lleva a `/hub/empresas`), ODS (deshabilitado).

**Alcance — entra:**
- Layout `src/app/hub/layout.tsx` que monta el sidebar a la izquierda y el contenido a la derecha.
- Componente `HubSidebar` con:
  - Estado abierto/colapsado, persistido en `localStorage`.
  - Items de área: ícono + texto cuando abierto, solo ícono cuando colapsado.
  - Áreas: Formatos, Empresas, ODS.
  - ODS visualmente deshabilitado, tooltip "Próximamente".
  - Item activo se resalta según ruta actual.
- Header arriba del contenido con el botón hamburguesita (toggle) y el nombre del usuario.
- `/hub` actual queda intacto pero ahora se renderiza dentro del shell.
- Esqueleto de `/hub/empresas/page.tsx` con un placeholder "Empresas — próximamente las pestañas".

**Alcance — fuera:**
- Funcionalidad real de Empresas (eso es E2 y E3).
- Cambios al contenido de `/hub` actual.
- Cualquier UI de KPI o dashboard nuevo.

**Permisos:**
| Acción | gerente | profesional |
|---|---|---|
| Ver sidebar | ✓ | ✓ |
| Ver área Empresas | ✓ | ✓ |
| Ver área ODS | ✓ (deshabilitado) | ✓ (deshabilitado) |

**UX / rutas:**
- `/hub` — formatos (igual que hoy, pero envuelto en shell).
- `/hub/empresas` — placeholder.
- `/hub/admin/borradores` — sigue funcionando (queda dentro del shell también).

**Datos:** ninguno.

**Componentes nuevos sugeridos:**
- `src/components/layout/HubShell.tsx`
- `src/components/layout/HubSidebar.tsx`
- `src/components/layout/HubSidebarItem.tsx`
- `src/components/layout/HubHeader.tsx`

**Criterios de aceptación:**
- Sidebar se ve en `/hub`, `/hub/empresas`, `/hub/admin/borradores`.
- Sidebar **NO** se ve en `/formularios/*` ni en `/login`.
- Toggle persiste entre recargas (cada usuario recuerda su preferencia).
- ODS no es clickeable; muestra tooltip "Próximamente".
- Tests E2E (Playwright) verifican: navegación entre áreas, persistencia de toggle, sidebar oculto en form editor.
- No hay regresiones en los formatos: todos los smoke tests existentes siguen pasando.

**Dependencias:** E0 (para mostrar nombre + identificar usuario).

---

### E2 — Empresas: panel gerente (CRUD)

**Objetivo.** Migrar la funcionalidad esencial del legacy `empresas_reca` al panel web. Solo accesible para `gerente`. Permite alta, edición, borrado, asignación y desasignación de empresas, con bitácora completa.

**Alcance — entra:**
- Vista lista en `/hub/empresas/admin` con:
  - Tabla con columnas: Nombre, NIT, Ciudad, Sede, Gestión, Profesional asignado, Estado, Última edición.
  - Filtros: por profesional asignado, asesor, caja de compensación, zona, estado, gestión (RECA/COMPENSAR).
  - Búsqueda por nombre o NIT.
  - Paginación o virtual scroll (1100+ registros).
- Modal/página de **crear empresa** con todos los campos del legacy:
  - `nombre_empresa` (obligatorio), `nit_empresa`, `direccion_empresa`, `ciudad_empresa`, `sede_empresa`, `gestion` (RECA/COMPENSAR, obligatorio), `responsable_visita`, `cargo`, `contacto_empresa`, `telefono_empresa`, `correo_1`, `caja_compensacion`, `zona_empresa`, `asesor`, `correo_asesor`, `profesional_asignado_id` (FK), `correo_profesional`, `estado` (default `En Proceso`), `observaciones`.
- Modal/página de **edición de empresa** con los mismos campos.
- Acción **borrar empresa** con confirmación. Soft delete (columna `deleted_at`) — no borrado físico.
- Acción **asignar profesional** (cambiar `profesional_asignado_id`). Genera evento en bitácora.
- Acción **desasignar profesional** (poner `profesional_asignado_id = NULL`). Genera evento.
- API routes:
  - `GET /api/empresas` — lista con filtros (todos los autenticados, filtros server-side).
  - `POST /api/empresas` — crear (solo gerente).
  - `GET /api/empresas/:id` — detalle.
  - `PUT /api/empresas/:id` — editar (solo gerente).
  - `DELETE /api/empresas/:id` — soft delete (solo gerente).
  - `POST /api/empresas/:id/asignar` — `{ profesional_id, comentario? }` (solo gerente).
  - `POST /api/empresas/:id/desasignar` — `{ comentario? }` (solo gerente).

**Alcance — fuera:**
- Importación Excel masiva.
- Vista del profesional (es E3).
- Calendario (es E4).
- Detalle con timeline visible (la bitácora se llena pero la UI vive en E3).

**Permisos:**
| Acción | gerente | profesional |
|---|---|---|
| Ver `/hub/empresas/admin` | ✓ | ✗ (404 o redirect a `/hub/empresas`) |
| Crear empresa | ✓ | ✗ |
| Editar empresa | ✓ | ✗ |
| Borrar empresa | ✓ | ✗ |
| Asignar/desasignar profesional | ✓ | ✗ |
| Listar empresas | ✓ | ✓ (pero ven distinta UI en E3) |

**UX / rutas:**
- `/hub/empresas/admin` — panel del gerente (lista + acciones).
- `/hub/empresas/admin/nueva` — crear.
- `/hub/empresas/admin/[id]/editar` — editar.

**Datos:**
- Agregar columnas a `empresas`:
  ```
  ALTER TABLE empresas
    ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- si aún no la tiene
    ADD COLUMN profesional_asignado_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

  CREATE INDEX empresas_profesional_asignado_id_idx ON empresas (profesional_asignado_id);
  CREATE INDEX empresas_estado_idx ON empresas (estado);
  CREATE INDEX empresas_deleted_at_idx ON empresas (deleted_at) WHERE deleted_at IS NULL;
  ```
- Mantener la columna legacy `profesional_asignado` (texto con el nombre) durante la transición. Las queries nuevas usan `profesional_asignado_id`. La columna texto se llena por trigger o en el mismo UPDATE para mantener compat con la app legacy mientras siga viva.
- Crear tabla `empresa_eventos` (ver §6 modelo de datos).

**Criterios de aceptación:**
- Un gerente puede crear una empresa nueva con todos los campos del legacy.
- Un gerente puede editar/borrar.
- Un profesional NO puede entrar a `/hub/empresas/admin` (redirige a `/hub/empresas`).
- Cada acción del gerente (crear, editar, borrar, asignar, desasignar) genera **un evento** en `empresa_eventos`.
- El soft delete oculta la empresa del listado por default.
- Tests cubren: alta de empresa con todos los campos, asignación, desasignación, denegación a profesional.

**Dependencias:** E0 (roles), E1 (shell).

---

### E3 — Empresas: panel profesional + ciclo de vida (estructura)

**Objetivo.** Sub-hub de Empresas para el profesional. Permite ver "Mis empresas", reclamar del pool, y ver el detalle de una empresa con su ciclo de vida estructural y notas tipo Jira.

**Alcance — entra:**
- Sub-navegación dentro de `/hub/empresas`:
  - **Mis empresas** — `/hub/empresas/mis`
  - **Reclamar** — `/hub/empresas/reclamar`
  - **Calendario** — `/hub/empresas/calendario` (placeholder en E3, real en E4)
- **Mis empresas:**
  - Lista de empresas donde `profesional_asignado_id = current_user.id`.
  - Columnas: nombre, NIT, sede, estado, última actividad.
  - Click en una fila → `/hub/empresas/[id]`.
- **Reclamar:**
  - Lista de empresas (libres y ocupadas mezcladas, con badge visible cuando ya tienen dueño).
  - Filtros: zona, ciudad, sede, gestión, estado.
  - Botón "Reclamar" en cada fila:
    - Si está libre → confirmación simple, asigna inmediato, genera evento `reclamada`.
    - Si tiene dueño → modal con campo **comentario obligatorio**, genera dos eventos: `quitada` (al anterior) y `reclamada` (al nuevo).
- **Detalle de empresa** (`/hub/empresas/[id]`):
  - Header: nombre, NIT, sede, gestión, estado actual, dueño actual.
  - Tabs:
    - **Resumen** (default): tarjeta con datos de la empresa, dueño, último cambio.
    - **Ciclo de vida**: timeline horizontal o lista de tarjetas con las etapas (ver §5.E3.cdv). Estructura solamente, sin lógica granular por etapa.
    - **Bitácora**: timeline tipo Jira (autor + timestamp Bogotá + acción + comentario). Filtros: Todo / Solo notas / Solo cambios.
    - **Notas (rápida)**: composer al estilo Jira para agregar nota nueva. La nota nueva aparece arriba en la bitácora.
  - Acciones del lado derecho:
    - **Cambiar estado** (Activa, En Proceso, Pausada, Cerrada, Inactiva) → modal con comentario obligatorio.
    - **Soltar empresa** (solo si dueño actual) → modal con comentario obligatorio.
    - **Reclamar** (solo si no es dueño) → mismo flujo que en la pestaña Reclamar.
- API routes:
  - `GET /api/empresas/mias` — empresas asignadas al usuario actual.
  - `GET /api/empresas/pool` — pool reclamable (todas, con flag de si están ocupadas).
  - `POST /api/empresas/:id/reclamar` — `{ comentario? }`. Server determina si es libre o desplaza.
  - `POST /api/empresas/:id/soltar` — `{ comentario }`.
  - `POST /api/empresas/:id/estado` — `{ nuevo_estado, comentario }`.
  - `POST /api/empresas/:id/notas` — `{ contenido }`.
  - `GET /api/empresas/:id/eventos` — bitácora con filtros opcionales `?tipo=nota&desde=...`.
  - `GET /api/empresas/:id/ciclo-vida` — deriva el estado de cada etapa desde `formatos_finalizados_il` filtrando por `empresa_nit`.

#### §5.E3.cdv — Ciclo de vida (estructura)

Las etapas que se muestran como tarjetas en orden:

1. Presentación (`presentacion`)
2. Evaluación de accesibilidad (`evaluacion`)
3. Sensibilización (`sensibilizacion`)
4. Condiciones de la vacante (`condiciones-vacante`)
5. Selección incluyente (`seleccion`)
6. Contratación incluyente (`contratacion`)
7. Inducción organizacional (`induccion-organizacional`)
8. Inducción operativa (`induccion-operativa`)
9. Seguimientos (`seguimientos`)

**Intérprete LSC NO es etapa.** Es servicio transversal y se mostrará como información lateral cuando aplique en E5 o más adelante.

Cada tarjeta muestra:
- Nombre de la etapa.
- Estado derivado de `formatos_finalizados_il`:
  - **No iniciado** — no hay registro.
  - **En borrador** — hay un `form_drafts` activo para esta empresa+slug.
  - **Finalizado** — hay registro en `formatos_finalizados_il`. Muestra fecha + autor + link al Sheet/PDF.
  - **Visita fallida** — flag específico del payload del formato (cuando aplique).
- Botón "Abrir formato" que linkea al editor existente con el draft o uno nuevo.
- Si hay múltiples instancias finalizadas (ej: varias presentaciones a lo largo del tiempo), muestra contador y permite expandir.

**Importante:** la estructura es **solo lectura** en E3. Todo el comportamiento fino (qué disparar cuando se finaliza una etapa, cómo influye en el estado de la empresa, qué precondiciones tiene) se trabaja **etapa por etapa en E5**.

**Alcance — fuera:**
- Calendario funcional (E4).
- Lógica granular por etapa (E5).
- Edición de notas o eventos (regla 3.5: inmutables).
- Vista de bitácora a nivel de gerente (mismo timeline, no se diferencia día 1).

**Permisos:**
| Acción | gerente | profesional dueño | profesional no dueño |
|---|---|---|---|
| Ver Mis empresas | ✓ | ✓ | ✓ (las suyas) |
| Ver Reclamar | ✓ | ✓ | ✓ |
| Reclamar empresa libre | ✓ | n/a | ✓ |
| Reclamar empresa ocupada (con comentario) | ✓ | n/a | ✓ |
| Soltar empresa | ✓ | ✓ | ✗ |
| Cambiar estado | ✓ | ✓ | ✗ |
| Agregar nota | ✓ | ✓ | ✓ |
| Ver bitácora | ✓ | ✓ | ✓ |

**UX / rutas:**
- `/hub/empresas` — redirige a `/hub/empresas/mis` por default.
- `/hub/empresas/mis`
- `/hub/empresas/reclamar`
- `/hub/empresas/calendario` (placeholder visible)
- `/hub/empresas/[id]` — detalle con tabs.

**Datos:** sin nuevas tablas, todo se apoya en lo creado en E2 (`empresas`, `empresa_eventos`).

**Criterios de aceptación:**
- Mis empresas muestra solo las del profesional autenticado.
- Reclamar muestra todas, distingue ocupadas con badge.
- Reclamar libre: 1 click, sin comentario.
- Reclamar ocupada: requiere comentario; rechaza envío sin comentario.
- Soltar requiere comentario.
- Cambio de estado requiere comentario.
- Notas se agregan, aparecen arriba en la bitácora con timestamp en hora Bogotá.
- Notas no son editables ni borrables desde la UI.
- Ciclo de vida se deriva de `formatos_finalizados_il` y `form_drafts` correctamente.
- Click en una etapa con borrador abre el editor con ese draft.
- Click en una etapa sin formato abre el editor en modo nuevo, prellenando NIT y nombre de la empresa.
- Tests cubren: reclamo libre, reclamo desplaza, soltar, cambio de estado, nota nueva, render del ciclo de vida.

**Dependencias:** E0, E1, E2.

---

### E4 — Calendario integrado

**Objetivo.** El profesional planea su semana/mes con eventos atados a empresas. Los datos persisten para reportes futuros.

**Alcance — entra:**
- Pestaña `/hub/empresas/calendario` con vistas mes / semana / día (toggleable).
- Crear evento: modal con `empresa_id` (obligatorio, autocompletable), `titulo`, `descripcion`, `tipo` (visita / llamada / tarea / otro), fecha+hora inicio, fecha+hora fin, all-day flag.
- Editar/eliminar eventos propios.
- Marcar evento como realizado / cancelado / reprogramado.
- Vista del detalle de empresa: tab "Agenda" o sección lateral que muestra próximos eventos de esa empresa.
- API routes:
  - `GET /api/empresas/calendario?desde=...&hasta=...` — eventos del usuario actual.
  - `POST /api/empresas/calendario` — crear.
  - `PUT /api/empresas/calendario/:id`.
  - `DELETE /api/empresas/calendario/:id`.
  - `GET /api/empresas/:id/calendario` — eventos asociados a una empresa.

**Alcance — fuera:**
- Integración con Google Calendar (se evalúa en E6).
- Eventos compartidos / agenda del equipo.
- Notificaciones / recordatorios.
- Reglas de recurrencia.

**Datos:**
```
CREATE TABLE empresa_calendario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('visita', 'llamada', 'tarea', 'otro')),
  inicio timestamptz NOT NULL,
  fin timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  estado text NOT NULL DEFAULT 'planeado'
    CHECK (estado IN ('planeado', 'realizado', 'cancelado', 'reprogramado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX empresa_calendario_profesional_inicio_idx
  ON empresa_calendario (profesional_id, inicio);
CREATE INDEX empresa_calendario_empresa_id_idx
  ON empresa_calendario (empresa_id);
```

**Permisos:**
| Acción | gerente | profesional |
|---|---|---|
| Ver eventos propios | ✓ | ✓ |
| Crear eventos propios | ✓ | ✓ |
| Editar/borrar evento ajeno | ✗ | ✗ |
| Ver eventos del equipo | ✗ (día 1) | ✗ |

**UX / rutas:**
- `/hub/empresas/calendario` — calendario.
- `/hub/empresas/[id]` agrega sección lateral "Próximos eventos".

**Componentes sugeridos:** evaluar `react-big-calendar` o `@fullcalendar/react`. Decisión técnica del dev al iniciar la épica; ambos son gratis y maduros.

**Criterios de aceptación:**
- Se pueden crear/editar/borrar eventos.
- Vista mes/semana/día funcionan.
- Eventos persisten con timezone correcto (BD UTC, render Bogotá).
- Detalle de empresa muestra próximos eventos correctamente.
- Tests E2E: crear evento desde calendario, verlo en detalle de empresa.

**Dependencias:** E3.

---

### E5 — Ciclo de vida granular

**Objetivo.** Trabajar etapa por etapa del ciclo de vida, definiendo reglas finas: precondiciones, efectos en el estado de la empresa, datos visibles en cada tarjeta, etc. **Esta épica se subdivide en tickets por etapa cuando lleguemos.**

**Alcance — entra:** TBD por etapa. Se documentará en este mismo archivo cuando se inicie.

**Notas previas (no bloquean):**
- Algunas empresas no pasan por todas las etapas (depende de la gestión RECA vs COMPENSAR).
- Se debe respetar la realidad operativa, no forzar un funnel rígido.

**Dependencias:** E3.

---

### E6 — Futuro

Pendiente de planificar cuando la operación pida los siguientes módulos. Entran aquí (sin orden):

- **KPIs gerenciales** (vista de gerente con indicadores: $$ acumulado vs contrato, conversión, productividad, pipeline, carga laboral).
- **Vista consolidada de equipo en calendario.**
- **Integración con Google Calendar** (OAuth por usuario o service account compartido — definir entonces).
- **Migración del sistema ODS** (servicios, tarifas, proyecciones financieras del legacy `RECA_ODS`).
- **Roles adicionales** (intérprete, asesor, auxiliar admin).
- **Importación masiva de empresas desde Excel.**
- **Notificaciones / recordatorios.**

---

## 6. Modelo de datos consolidado

### Tablas que existen y se reusan

- `auth.users` — managed por Supabase. Identidad canónica.
- `profesionales` — se le agrega `deleted_at` y se reutiliza `auth_user_id`/`auth_password_temp` para acceso Auth. Los permisos viven en `profesional_roles`, no en una columna `rol`.
- `empresas` — se le agrega `id` (uuid PK si no existe), `profesional_asignado_id`, `deleted_at`, `created_at`, `updated_at`. Mantiene columnas legacy.
- `formatos_finalizados_il` — **fuente de verdad del ciclo de vida**. No se modifica.
- `form_drafts` — fuente de verdad de borradores. No se modifica.

### Tablas nuevas

```
-- Bitácora unificada de eventos sobre una empresa
CREATE TABLE empresa_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'creacion',
    'edicion',
    'asignacion_gerente',
    'desasignacion_gerente',
    'reclamada',
    'soltada',
    'quitada',
    'cambio_estado',
    'nota'
  )),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  actor_nombre text NOT NULL,           -- snapshot legible
  payload jsonb NOT NULL DEFAULT '{}',  -- depende del tipo
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX empresa_eventos_empresa_created_idx
  ON empresa_eventos (empresa_id, created_at DESC);
CREATE INDEX empresa_eventos_tipo_idx
  ON empresa_eventos (tipo);
CREATE INDEX empresa_eventos_actor_idx
  ON empresa_eventos (actor_user_id);
```

#### Forma del `payload` por `tipo`

| Tipo | Forma del payload |
|---|---|
| `creacion` | `{}` (datos vienen de `empresas`) |
| `edicion` | `{ campos_cambiados: ["telefono","ciudad"], antes: {...}, despues: {...} }` |
| `asignacion_gerente` | `{ asignado_a_user_id, asignado_a_nombre, comentario? }` |
| `desasignacion_gerente` | `{ comentario? }` |
| `reclamada` | `{ desde_libre: bool, desplazo_a_user_id?, desplazo_a_nombre?, comentario? }` |
| `soltada` | `{ comentario }` |
| `quitada` | `{ tomada_por_user_id, tomada_por_nombre, comentario }` |
| `cambio_estado` | `{ desde, hacia, comentario }` |
| `nota` | `{ contenido }` |

```
-- Eventos del calendario (E4)
CREATE TABLE empresa_calendario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('visita', 'llamada', 'tarea', 'otro')),
  inicio timestamptz NOT NULL,
  fin timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  estado text NOT NULL DEFAULT 'planeado'
    CHECK (estado IN ('planeado', 'realizado', 'cancelado', 'reprogramado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Trigger sugerido `updated_at`

Usar el mismo patrón que ya existe en `form_drafts` (función `set_updated_at`). Aplicar a `empresas` y `empresa_calendario`.

### RLS sugerida

- `empresa_eventos`:
  - SELECT: cualquier autenticado puede leer eventos de cualquier empresa (la bitácora es de equipo).
  - INSERT: server-only desde API routes con service_role. RLS deniega INSERT directo desde cliente.
- `empresa_calendario`:
  - SELECT/INSERT/UPDATE/DELETE: solo el `profesional_id` que coincide con `auth.uid()`.
- `empresas`:
  - SELECT: cualquier autenticado.
  - INSERT/UPDATE/DELETE: server-only via API routes con service_role + verificación de rol.

---

## 7. Estado actual del repo (qué se reusa, qué no se toca)

### Se reusa (lectura)

- `src/proxy.ts` — extender protección por rol cuando aplique.
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`.
- `src/components/layout/HubFormatsHome.tsx`, `HubShell.tsx` y compañía — shell E1 y formatos encapsulados.
- `src/lib/usuariosRecaServer.ts` — patrón a replicar para queries server-side de empresas.
- `src/app/api/auth/login/route.ts` — referencia del flujo de auth.
- Patrones de drafts, finalización, prewarm — referencia, no se tocan.

### NO se toca

- `src/components/forms/*` — formularios.
- `src/lib/finalization/*` — pipeline de finalización.
- `src/hooks/use*FormState*` — runtime de formatos.
- `src/app/api/formularios/*` — endpoints de formatos.
- `src/app/formularios/*` — editor de formatos.
- Cualquier test asociado a los formatos.

### Carpetas y rutas nuevas

- `docs/expansion_v2_plan.md` (este archivo).
- `src/app/hub/layout.tsx` (E1).
- `src/app/hub/empresas/...` (E1+E2+E3+E4).
- `src/app/api/empresas/...` (E2+E3+E4).
- `src/components/empresas/...` (E2+E3+E4).
- `src/lib/empresas/...` (helpers, schemas Zod).
- `src/lib/auth/appRoles.ts`, `src/lib/auth/roles.ts` y `src/hooks/useCurrentRole.ts` (E0).
- `supabase/migrations/...` — una migración por épica con sufijo descriptivo.

---

## 8. Decisiones aún abiertas (no bloquean día 1)

Estas se resuelven cuando lleguemos a la épica que las requiera. No retrasan E0/E1/E2.

- **Detalle granular de cada etapa del ciclo de vida** — toda la E5.
- **Vista consolidada del calendario para gerente** — entra a E6.
- **OAuth Google Calendar** — entra a E6.
- **Modelado de contratos múltiples** (hoy hay un solo contrato Compensar) — entra a E6 cuando lleguen KPIs.
- **Normalización de `profesional_asignado` legacy texto vs `profesional_asignado_id`** — durante E2 se decide si se hace migración masiva o solo se completa al editar cada empresa.
- **Tipo de "visita fallida" como estado de etapa en el ciclo de vida.** Hoy es un flag en payload del formato. En E5 se decide cómo se refleja en la tarjeta de etapa.

---

## 9. Cómo se mantiene este plan

### Quién actualiza qué

- **El PO (Claude en chats futuros)** mantiene actualizado:
  - El estado de cada épica (sección 10).
  - Las decisiones que se vayan tomando durante la implementación.
  - El histórico al final.
- **El dev** que implemente cada épica deja un commit que actualice la sección 10 marcando la épica como completa y agregando un puntero al PR.

### Reglas de actualización

- No se borra historia de decisiones; si una decisión se revierte, se anota la nueva con razón.
- Cada cambio sustantivo en alcance se anota en el histórico al final.
- Cuando una decisión "abierta" se cierra, se mueve de §8 a §3 con la fecha.

### Mecanismo en chats futuros

Cuando el dev pida ayuda implementando una épica, el PO en sesión:
1. Lee este archivo entero antes de proponer cualquier cosa.
2. No re-discute decisiones cerradas (§3) sin permiso explícito del owner.
3. Documenta la conversación relevante en este archivo si genera una decisión nueva.

---

## 10. Estado de implementación

**Última actualización:** 2026-04-29

| Épica | Estado | Notas |
|---|---|---|
| E0 — Roles | 🟢 Completada | Migraciones `20260428232758_e0_profesional_roles` y `20260428235332_e0_profesional_roles_guard` aplicadas en Supabase remoto; 4 roles `inclusion_empresas_admin` verificados. |
| E1 — Shell + sidebar | 🟢 Completada | Layout `/hub`, sidebar colapsable persistente, header, placeholder `/hub/empresas`, roles iniciales sin flicker y smoke tests actualizados. |
| E2 — Empresas (gerente) | 🟢 E2A/E2B completadas local + remoto | Backoffice gerencial en `/hub/empresas`: Empresas y Profesionales activos para `inclusion_empresas_admin`; Asesores/Gestores/Intérpretes visibles deshabilitados. E2B agrega CRUD de profesionales, acceso Auth, roles, reset de contraseña temporal, soft delete/restauración y auditoría. Migraciones E2A y E2B aplicadas en Supabase remoto. |
| E3 — Empresas (profesional) + ciclo de vida | 🔵 Lista para planificar tras QA E2B | La base de `profesional_asignado_id`, `empresa_eventos`, `inclusion_empresas_profesional` y acceso Auth por profesional ya existe; falta definir experiencia profesional. |
| E4 — Calendario | ⚪ Bloqueada por E3 | — |
| E5 — Ciclo de vida granular | ⚪ Bloqueada por E3 | Se planifica al llegar. |
| E6 — Futuro | ⚪ — | Sin planificación detallada. |

Leyenda: ⚪ pendiente · 🔵 lista para iniciar · 🟡 en progreso · 🟢 completada · 🔴 bloqueada con problema

---

## 11. Histórico de decisiones

### 2026-04-28 — Plan inicial aprobado

- Visión multi-app encapsulada (no reescritura).
- 3 áreas día 1: Formatos (intacto), Empresas (foco), ODS (placeholder).
- Empresas se entrega en 3 épicas (gerente, profesional, calendario).
- Roles formales desde el día 1 (`gerente`, `profesional`).
- Reclamar = asignación inmediata; comentario obligatorio si desplaza.
- Estados legacy intactos; default `En Proceso`; comentario obligatorio en cambio.
- Notas tipo Jira, inmutables, hora Bogotá.
- Calendario dentro de Empresas, sin Google Calendar día 1.
- Importación Excel diferida.
- Ciclo de vida granular se trabaja etapa por etapa en E5 (futuro).
- KPIs y ODS migración entran a E6 (futuro).

### 2026-04-28 — E0 ajusta roles a permisos multiples

- Se reemplaza el diseño de columna unica `profesionales.rol` por tabla puente `profesional_roles`.
- El primer permiso real es `inclusion_empresas_admin`.
- Administradores iniciales de Empresas: `aaron_vercel`, `sanpac` (Sandra Pachon), `sarazambrano`, `AdrianaViveros`.
- La resolucion canonica usa `auth.users.id` contra `profesionales.auth_user_id`, con fallback historico por correo.
- QA E0 agrego una migracion posterior con comentarios de postura server-only y guard explicito para validar que esos 4 permisos iniciales existan.

### 2026-04-28 — E1 shell + sidebar completada

- `/hub` y subrutas usan `src/app/hub/layout.tsx` con sidebar persistente y header compartido.
- `Formatos` conserva la grilla actual como contenido de `/hub`; `Empresas` abre `/hub/empresas` con placeholder; `ODS` queda deshabilitado con tooltip.
- El layout pasa roles iniciales al cliente para evitar flicker de `useCurrentRole()`.
- El drawer de borradores lee `panel=drafts` desde la URL para seguir funcionando dentro del layout global.

### 2026-04-28 — E2A se redefine como backoffice gerencial de Empresas

- E2A queda restringida a `inclusion_empresas_admin`.
- `/hub/empresas` será la entrada única del módulo y podrá renderizar contenido por rol/capacidad.
- Para admins se muestra backoffice gerencial con secciones legacy visibles: Empresas activa; Profesionales, Asesores, Gestores e Intérpretes deshabilitadas.
- Importar Excel no se trae.
- Eliminar en UI será soft delete con `deleted_at`.
- La referencia canónica de asignación será `empresas.profesional_asignado_id -> public.profesionales(id)`, no `auth.users(id)`.
- `auth.users.id` se reserva para actoría en `empresa_eventos`.
- Crear/editar empresa se hará en páginas completas; detalle será editable y mostrará actividad reciente básica.

### 2026-04-28 — E2A Empresas backoffice completada

- `/hub/empresas` renderiza por rol: admin ve sub-hub gerencial; profesional sin admin ve módulo operativo en preparación.
- Rutas admin entregadas: `/hub/empresas/admin/empresas`, `/hub/empresas/admin/empresas/nueva`, `/hub/empresas/admin/empresas/[id]`.
- APIs server-only entregadas bajo `/api/empresas/*`, protegidas con `requireAppRole(["inclusion_empresas_admin"])`.
- `empresas.profesional_asignado_id`, `empresas.deleted_at` y `empresa_eventos` quedaron aplicadas en Supabase remoto.
- Se endureció escritura directa de `empresas` para clientes autenticados; las mutaciones pasan por API routes con service role.

### 2026-04-28 — E2A post-QA

- Se verificó en remoto que `public.empresas` conserva `empresas_select_authenticated` para `authenticated`; se agregaron migraciones correctivas explícitas para no depender de estado preexistente y para dejar la policy como `to authenticated using (true)` sin reevaluar `auth.role()` por fila.
- La validación de comentario obligatorio por cambio de estado quedó duplicada correctamente: UX en Zod y defensa server-side contra el estado persistido real.
- La bitácora de reasignación guarda también `anterior_profesional_id` y `anterior_nombre`.
- La búsqueda de Empresas escapa `%` y `_` antes de construir filtros `ilike`.
- Los endpoints `/api/empresas/*` tienen cobertura de autorización 401/403.
- Decisión consciente: la atomicidad estricta empresa+evento no se resuelve en E2A con RPC; se reevalúa en E2B/E3 cuando se diseñe el contrato de bitácora/ciclo de vida. E3 deberá ampliar el `CHECK` de `empresa_eventos.tipo` para eventos como `reclamada`, `soltada`, `quitada` y `nota`.
- Decisión consciente: validación estricta de email queda diferida porque los campos legacy pueden contener texto no normalizado; se abordará con limpieza de datos o regla de producto.
- Decisión consciente: `getCurrentUserContext` con `cache()` queda diferido; no se mezcla con este post-QA porque afecta auth compartido y requiere pruebas de SSR/API separadas.

### 2026-04-29 — E2B Profesionales gerencia implementada

- `/hub/empresas` activa la tarjeta Profesionales para admins; rutas entregadas: `/hub/empresas/admin/profesionales`, `/hub/empresas/admin/profesionales/nuevo` y `/hub/empresas/admin/profesionales/[id]`.
- APIs server-only entregadas bajo `/api/empresas/profesionales/*`, protegidas con `requireAppRole(["inclusion_empresas_admin"])`; `/api/profesionales` de formularios conserva contrato y solo excluye soft-deleted.
- Se agrega `inclusion_empresas_profesional` con etiqueta user-facing `Profesional Inclusión`; `inclusion_empresas_admin` se muestra como `Admin Inclusión`.
- Reglas cerradas: solo `aaron_vercel` asigna o quita `Admin Inclusión`; cualquier `Admin Inclusión` puede soft-deletear otro admin sin editar roles; todo perfil con acceso Auth exige correo, `usuario_login` y al menos un rol.
- Acceso Auth: gerencia puede crear/enlazar usuario Auth, generar contraseña temporal única, resetear contraseña y verla una sola vez; se marca `auth_password_temp` y `app_metadata.reca_password_temp`.
- Cambio obligatorio: usuarios con contraseña temporal son redirigidos a `/auth/cambiar-contrasena-temporal` antes de entrar a `/hub` o `/formularios`.
- Soft delete de profesional exige comentario, quita roles, desactiva Auth, libera empresas asignadas y crea eventos de desasignación en `empresa_eventos`; restaurar deja el perfil como catálogo sin roles ni acceso Auth.
- Migraciones E2B aplicadas en Supabase remoto: `20260429034821_e2b_profesionales_backoffice`, `20260429040657_e2b_profesionales_rls_cleanup`, `20260429041718_e2b_profesionales_advisor_cleanup` y `20260429042122_e2b_profesionales_rpc_grants_cleanup`.
- Decisión consciente: por duplicados legacy de `correo_profesional`, el índice único estricto aplica a perfiles activos con `auth_user_id`; la API impide nuevos conflictos al crear/habilitar/restaurar y no fuerza limpieza destructiva de datos históricos.
- Decisión consciente: Supabase Admin API permite ban/update de usuario, pero no revocación universal por `user_id` desde este flujo; los access tokens existentes expiran por TTL. El guard de contraseña temporal se basa en JWT/app metadata y se refuerza en rutas/API.
- Advisors E2B: se eliminaron política SELECT duplicada, índice `auth_user_id` duplicado y RPCs legacy no usadas (`get_my_profesional_profile`, `resolve_login_email`). Se conservan `current_usuario_login()` e `is_current_user_admin()` porque políticas RLS existentes de `formatos_finalizados_il` dependen de ellas.

### 2026-04-29 — E2B post-QA

- Se bloquea server-side la autoeliminación de un admin y también que un admin distinto de `aaron_vercel` elimine el perfil super-admin. Motivo: eliminar a `aaron_vercel` dejaría bloqueada la administración de `Admin Inclusión` y requeriría recuperación manual por SQL.
- `enable-access` valida antes de tocar Supabase Auth que el usuario Auth encontrado por correo no esté vinculado a otro profesional activo. Esto evita rotar la contraseña de otro profesional y luego fallar por el índice único de `auth_user_id`.
- `requireAppRole` rechaza APIs protegidas cuando `auth_password_temp = true`; el único flujo permitido para completar setup sigue siendo `/api/auth/cambiar-contrasena-temporal`, que no usa ese helper.
- La contraseña temporal ya no tiene prefijo fijo; conserva complejidad mínima y mezcla caracteres requeridos en posiciones aleatorias. La contraseña definitiva exige longitud, una letra y un número.
- Se amplió cobertura de endpoints críticos: `[id]`, `enable-access`, `reset-password`, `cambiar-contrasena-temporal`, guards de `requireAppRole` y defensas server-side de `deleteProfesional`/`enableProfesionalAccess`.
- Decisión consciente: la atomicidad estricta de las mutaciones multi-step de Profesionales queda diferida a E3/E2C mediante RPC transaccional o reconciliador. No se resolvió en este post-QA porque cambiaría el contrato de persistencia completo y no es un parche local.
- Decisión consciente: `getCurrentUserContext` con `cache()` sigue diferido. Es optimización de performance compartida entre SSR y API; no se mezcla con un cierre de seguridad para no alterar semántica de autenticación sin una batería separada.
