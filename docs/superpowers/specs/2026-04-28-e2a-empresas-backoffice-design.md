# E2A Empresas Backoffice Design

Fecha: 2026-04-28

## Objetivo

Construir el primer corte funcional del modulo Empresas como backoffice gerencial
para usuarios con `inclusion_empresas_admin`. E2A trae la funcionalidad critica de
Empresas desde el legacy `empresas_reca`, pero adaptada al modelo web: rutas bajo
`/hub/empresas`, mutaciones server-side, auditoria y soft delete.

E2A no construye la experiencia operativa del profesional. Esa experiencia queda
para E3, pero la entrada `/hub/empresas` queda preparada para mostrar contenido
segun capacidades del usuario.

## Alcance

Entra en E2A:

- Sub-hub `/hub/empresas` para `inclusion_empresas_admin`.
- Bloque de backoffice gerencial con cinco secciones visibles:
  - Empresas activa.
  - Profesionales deshabilitada.
  - Asesores deshabilitada.
  - Gestores deshabilitada.
  - Interpretes deshabilitada.
- Listado admin de empresas con busqueda, filtros, ordenamiento y paginacion server-side.
- Pagina completa para crear empresa.
- Pagina completa de detalle editable para empresa existente.
- Soft delete expuesto como accion UI "Eliminar".
- Actividad reciente basica por empresa.
- Tabla `empresa_eventos` y eventos para mutaciones principales.
- Migracion para `empresas.profesional_asignado_id`, `empresas.deleted_at` y auditoria.
- API routes admin con `requireAppRole(["inclusion_empresas_admin"])`.

Fuera de E2A:

- Importar Excel.
- Limpieza o purga masiva de duplicados.
- CRUD funcional de Profesionales, Asesores, Gestores e Interpretes.
- Reset de contrasena de profesionales.
- Vista profesional "Mis empresas".
- Reclamar, soltar, notas operativas y calendario.
- Cambios en formularios, finalizacion, drafts o APIs de formularios.

## Rutas

`/hub/empresas`

- Entrada unica del modulo Empresas.
- Para `inclusion_empresas_admin`, muestra el sub-hub gerencial.
- Para usuarios sin rol admin, E2A muestra un estado operativo en preparacion hasta E3.
  No debe exponer backoffice.

`/hub/empresas/admin/empresas`

- Listado de empresas.
- Controles: busqueda, filtros, paginacion, boton "Nueva empresa".
- Acciones por fila: abrir detalle.

`/hub/empresas/admin/empresas/nueva`

- Pagina completa para crear empresa.
- Formulario agrupado por secciones: Empresa, Compensar, RECA, Observaciones.

`/hub/empresas/admin/empresas/[id]`

- Pagina editable de una empresa.
- Acciones: guardar cambios, eliminar.
- Muestra actividad reciente basica.

## Modelo de permisos

Todo el backoffice E2A requiere `inclusion_empresas_admin`.

La validacion se hace server-side:

- SSR puede usar `getCurrentUserContext()`.
- API routes usan `requireAppRole(["inclusion_empresas_admin"])`.
- El cliente no decide permisos por si solo.

Los profesionales sin admin no tienen acceso a rutas admin. E3 definira su experiencia
operativa dentro de `/hub/empresas`.

## Modelo de datos

### `empresas`

Agregar:

- `profesional_asignado_id bigint null references public.profesionales(id) on delete set null`
- `deleted_at timestamptz null`

Mantener:

- `profesional_asignado`
- `correo_profesional`

Regla:

- `profesional_asignado_id` es la referencia canonica.
- `profesional_asignado` y `correo_profesional` son snapshot legacy para compatibilidad,
  reportes y lectura humana.

Justificacion:

- La asignacion pertenece a un profesional del catalogo, no necesariamente a una cuenta
  Supabase Auth.
- Algunos profesionales pueden existir antes de tener login.
- E3 podra consultar "mis empresas" con `profesional_asignado_id = currentUser.profile.id`.
- `auth.users.id` se reserva para actoria y auditoria.

### `empresa_eventos`

Crear tabla:

- `id uuid primary key default gen_random_uuid()`
- `empresa_id uuid not null references public.empresas(id) on delete cascade`
- `tipo text not null`
- `actor_user_id uuid not null references auth.users(id)`
- `actor_profesional_id bigint null references public.profesionales(id) on delete set null`
- `actor_nombre text not null`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Tipos E2A:

- `creacion`
- `edicion`
- `asignacion_gerente`
- `desasignacion_gerente`
- `cambio_estado`
- `eliminacion`

Payload:

- `creacion`: `{ snapshot: { ...camposEmpresa } }`
- `edicion`: `{ campos_cambiados: string[], antes: object, despues: object, comentario?: string }`
- `asignacion_gerente`: `{ asignado_a_profesional_id, asignado_a_nombre, comentario?: string }`
- `desasignacion_gerente`: `{ anterior_profesional_id, anterior_nombre, comentario?: string }`
- `cambio_estado`: `{ desde, hacia, comentario }`
- `eliminacion`: `{ comentario?: string, snapshot: { ...camposEmpresa } }`

## Formulario de empresa

Secciones:

Empresa:

- `nombre_empresa` requerido.
- `nit_empresa`
- `direccion_empresa`
- `ciudad_empresa`
- `sede_empresa`
- `gestion` requerido.
- `responsable_visita`
- `cargo`
- `contacto_empresa`
- `telefono_empresa`
- `correo_1`
- `estado` requerido.

Compensar:

- `caja_compensacion`
- `zona_empresa`
- `asesor`
- `correo_asesor`

RECA:

- `profesional_asignado_id`
- snapshot `profesional_asignado`
- snapshot `correo_profesional`

Observaciones:

- `observaciones`

Catalogos canonicos para escritura:

- `gestion`: `RECA`, `COMPENSAR`
- `estado`: `Activa`, `En Proceso`, `Pausada`, `Cerrada`, `Inactiva`
- `caja_compensacion`: `Compensar`, `No Compensar`

El listado y filtros toleran valores historicos no canonicos. El formulario de crear/editar
usa valores canonicos hacia adelante. No hay normalizacion masiva automatica en E2A.

## Reglas de negocio E2A

Crear empresa:

- Requiere `nombre_empresa` y `gestion`.
- `estado` default `En Proceso`.
- Si se selecciona profesional, debe existir en `profesionales`.
- Crea evento `creacion`.

Editar empresa:

- Comentario opcional.
- Detecta campos cambiados.
- Registra `antes` y `despues` en `empresa_eventos`.
- Si cambia `estado`, exige comentario y registra `cambio_estado`.

Asignar profesional:

- Solo permite profesionales existentes.
- Actualiza `profesional_asignado_id`, `profesional_asignado` y `correo_profesional`.
- Comentario opcional.
- Registra `asignacion_gerente`.

Desasignar profesional:

- Limpia `profesional_asignado_id`, `profesional_asignado` y `correo_profesional`.
- Comentario opcional en E2A.
- Registra `desasignacion_gerente`.

Eliminar empresa:

- UI usa label "Eliminar".
- Implementacion hace soft delete con `deleted_at = now()`.
- La empresa desaparece del listado por default.
- Confirmacion obligatoria.
- Comentario opcional.
- Registra `eliminacion`.

## Listado de empresas

Columnas:

- Nombre
- NIT
- Ciudad
- Sede
- Gestion
- Profesional asignado
- Asesor
- Caja de compensacion
- Zona
- Estado
- Ultima edicion

Busqueda:

- Query string libre.
- Busca en nombre, NIT, ciudad, profesional asignado, asesor, contacto, telefono y sede.

Filtros:

- Profesional asignado.
- Asesor.
- Caja de compensacion.
- Zona.
- Estado.
- Gestion.

Paginacion:

- Server-side.
- Tamano inicial: 50 por pagina.
- Query params controlan busqueda, filtros, pagina, tamano y orden.

Ordenamiento:

- Server-side para columnas principales.
- Default por `updated_at desc` o `nombre_empresa asc` si no hay `updated_at`.

## Actividad reciente

La pagina `[id]` muestra una lista basica de eventos recientes:

- Fecha/hora en America/Bogota.
- Actor.
- Tipo de evento.
- Resumen corto.

El timeline avanzado con filtros tipo Jira queda para E3.

## Seguridad y RLS

API routes E2A usan service role y validan `inclusion_empresas_admin`.

La migracion debe endurecer RLS para que mutaciones de `empresas` no queden abiertas a
cualquier usuario autenticado. Lectura puede seguir disponible para autenticados si E3 la
requiere, pero escrituras directas desde cliente deben quedar bloqueadas o no depender de
politicas permisivas.

`empresa_eventos`:

- La UI lee actividad reciente por `GET /api/empresas/[id]/eventos`.
- No hay lectura directa desde componentes cliente.
- INSERT/UPDATE/DELETE no estan disponibles para clientes directos.
- Las inserciones vienen de API routes.

## APIs

Rutas propuestas:

- `GET /api/empresas`
- `POST /api/empresas`
- `GET /api/empresas/[id]`
- `PUT /api/empresas/[id]`
- `DELETE /api/empresas/[id]`
- `GET /api/empresas/[id]/eventos`

`PUT /api/empresas/[id]` recibe el formulario completo y detecta cambios de asignacion,
desasignacion, estado y campos generales para registrar los eventos correspondientes.
Los endpoints especificos de reclamar/soltar quedan para E3.

## Estados de error

- 401: usuario no autenticado.
- 403: autenticado sin `inclusion_empresas_admin`.
- 404: empresa no existe o esta eliminada y no se pide explicitamente.
- 400: payload invalido por Zod.
- 409: conflicto de actualizacion si se detecta estado stale durante edicion.
- 500: error inesperado con log server-side.

## Testing

Unit/integration:

- Schemas Zod de empresa.
- Query builder de filtros/paginacion.
- Serializacion de eventos.
- Diferencia `antes/despues` para edicion.
- Gating admin en API routes.
- Soft delete oculta empresas.

UI:

- Sub-hub muestra cinco secciones; solo Empresas activa.
- Listado renderiza columnas principales.
- Filtros y busqueda actualizan query params.
- Formulario crea empresa con campos requeridos.
- Edicion guarda cambios y muestra actividad reciente.
- Eliminar pide confirmacion.

E2E smoke:

- Admin entra a `/hub/empresas` y ve backoffice.
- Admin entra al listado, busca una empresa y abre detalle.
- Admin puede llegar a nueva empresa.
- Profesional sin rol no ve backoffice.
- `/formularios/*` sigue sin sidebar de Empresas ni cambios de E2A.

## Decisiones cerradas

- Todo E2A es solo para `inclusion_empresas_admin`.
- `/hub/empresas` es entrada unica del modulo, no una ruta exclusiva de admin.
- El backoffice muestra las cinco secciones legacy, pero solo Empresas queda activa en E2A.
- Importar Excel no se trae.
- La accion UI se llama "Eliminar", aunque sea soft delete.
- Edicion normal permite comentario opcional y registra diff automatico.
- No se crean profesionales desde Empresa.
- Escritura usa catalogos canonicos; lectura tolera historicos.
- Listado usa paginacion server-side de 50 por pagina.
- Actividad reciente basica entra en E2A.
- Crear/editar usa paginas completas, no modal.
- Detalle de empresa es editable en la misma pagina.
- `profesional_asignado_id` referencia `profesionales.id`, no `auth.users.id`.

## Riesgos

- La tabla `empresas` tiene politicas RLS permisivas para mutaciones de usuarios autenticados.
- Datos historicos tienen valores no canonicos en `estado`, `gestion` y `caja_compensacion`.
- La tabla `profesionales` mezcla catalogo, Auth legacy, Auth Supabase y roles nuevos.
- El formulario de empresa es largo; requiere componentes pequenos y testables.
- La auditoria debe ser consistente antes de permitir acciones destructivas.
