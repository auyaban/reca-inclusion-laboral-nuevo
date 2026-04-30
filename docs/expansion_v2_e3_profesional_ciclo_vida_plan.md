# E3 - Empresas Profesional y Ciclo de Vida

**Estado:** E3.3 implementada localmente; pendiente QA/preview y aplicacion de migracion antes de deploy.
**Fecha:** 2026-04-29.
**Bloqueado por:** nada a nivel de codigo; E2D quedo cerrado.
**No tocar:** `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*`, `src/app/api/formularios/*`, `src/hooks/use*FormState*`.

## Summary

E3 activa la experiencia operativa de **Profesional Inclusion** dentro de `/hub/empresas`. El profesional podra ver sus empresas, reclamar empresas libres u ocupadas, soltar empresas, cambiar estado de sus empresas, agregar notas y consultar una bitacora util. El ciclo de vida se mostrara como estructura derivada de formularios finalizados y borradores, pero sin reglas granulares por etapa; esas reglas quedan para E5.

La implementacion se hace por capas para reducir riesgo: primero seguridad y datos, luego dominio/API transaccional, luego UI profesional, luego ciclo de vida read-only, y finalmente QA/performance.

## Objetivos de E3

- Dar una experiencia real a usuarios con rol `inclusion_empresas_profesional`.
- Mantener el backoffice admin existente sin regresiones.
- Hacer atomicas las acciones nuevas que modifican empresa y escriben eventos.
- Reusar la capa visual aprobada en Fase 5 y los patrones de performance de E2D.
- Mantener trazabilidad completa en `empresa_eventos`.

## Fuera de Alcance

- Calendario funcional. E3 solo deja placeholder visible; E4 implementa calendario.
- Logica granular por etapa del ciclo de vida. E5 define reglas por etapa.
- Edicion o borrado de notas/eventos. La bitacora es inmutable.
- Importacion Excel.
- Vista de KPIs gerenciales.
- Nuevos roles.
- Cambios en formularios, finalizacion, drafts o hooks de formularios.

## Capa 0 - Hardening Previo

Antes de exponer acciones profesionales, E3 debe cerrar la deuda tecnica que E2A/E2B dejaron diferida.

### Base de datos

- Crear migracion `e3_empresa_lifecycle_events`.
- Ampliar el `CHECK` de `empresa_eventos.tipo` para soportar:
  - `reclamada`
  - `soltada`
  - `quitada`
  - `nota`
- Mantener todos los tipos existentes:
  - `creacion`
  - `edicion`
  - `asignacion_gerente`
  - `desasignacion_gerente`
  - `cambio_estado`
  - `eliminacion`
  - `restauracion`
- Verificar indices existentes:
  - `empresa_eventos(empresa_id, created_at desc)`
  - `empresa_eventos(tipo)`
  - `empresa_eventos(actor_user_id)`
- Si falta alguno, agregarlo idempotentemente.

### Atomicidad recomendada

E3 debe implementar las acciones profesionales mediante RPC transaccional llamada solo desde API server-side con service role.

Decision recomendada:

- Crear funciones RPC `security invoker`, no `security definer`.
- Ubicarlas en `public` solo porque Supabase RPC trabaja sobre schemas expuestos.
- Revocar `execute` a `anon` y `authenticated`.
- Conceder `execute` solo a `service_role`.
- La API valida sesion, rol y payload; la RPC aplica mutacion + eventos en una transaccion.

Funciones propuestas:

- `public.reclamar_empresa(...)`
  - Actualiza `empresas.profesional_asignado_id`.
  - Actualiza `empresas.profesional_asignado`.
  - Si habia dueno previo distinto, inserta evento `quitada`.
  - Inserta evento `reclamada`.
- `public.soltar_empresa(...)`
  - Exige que el actor sea dueno actual o admin.
  - Limpia asignacion.
  - Inserta evento `soltada`.
- `public.cambiar_estado_empresa_operativo(...)`
  - Exige que el actor sea dueno actual o admin.
  - Cambia `estado`.
  - Inserta evento `cambio_estado`.
- `public.agregar_empresa_nota(...)`
  - Inserta evento `nota`.
  - No cambia la empresa.

No se debe llamar ninguna RPC desde cliente browser.

## Capa 1 - Permisos y Modelo de Acceso

### Roles

- `inclusion_empresas_admin` conserva acceso total.
- `inclusion_empresas_profesional` obtiene acceso operativo.
- Usuarios sin ninguno de esos roles no ven el modulo Empresas.

### Reglas de acciones

| Accion | Admin Inclusion | Profesional dueno | Profesional no dueno |
|---|---:|---:|---:|
| Ver home Empresas | Si | Si | Si, si tiene rol profesional |
| Ver Mis empresas | Si | Si | Si, solo las suyas |
| Ver Reclamar | Si | Si | Si |
| Ver detalle de empresa | Si | Si | Si |
| Reclamar empresa libre | Si | Si | Si |
| Reclamar empresa ocupada | Si, con comentario | Si, con comentario | Si, con comentario |
| Soltar empresa | Si | Si | No |
| Cambiar estado | Si | Si | No |
| Agregar nota | Si | Si | Si |
| Ver bitacora | Si | Si | Si |

### Matices importantes

- Reclamar una empresa ocupada desplaza al dueno anterior y siempre exige comentario.
- Reclamar una empresa que el actor ya posee debe devolver respuesta idempotente clara, no crear evento duplicado.
- Soltar siempre exige comentario.
- Cambiar estado siempre exige comentario y debe validar contra el estado real persistido.
- Notas son inmutables; no hay editar ni borrar.
- Empresas soft-deleted nunca aparecen en vistas profesionales ni se pueden reclamar.
- Usuarios con contrasena temporal siguen bloqueados por `requireAppRole`.

## Capa 2 - Dominio y API

Crear o extender la capa `src/lib/empresas/` sin mezclarla con componentes.

### Archivos sugeridos

- `src/lib/empresas/lifecycle-schemas.ts`
  - Zod schemas para reclamar, soltar, cambiar estado, notas y filtros de eventos.
- `src/lib/empresas/lifecycle-events.ts`
  - Builders de payload para `reclamada`, `quitada`, `soltada`, `nota`.
  - Extensiones de `describeEmpresaEvent` para textos user-facing.
- `src/lib/empresas/lifecycle-server.ts`
  - Orquestacion server-side.
  - Llamadas RPC con admin client.
  - Reglas de permiso y error mapping.
- `src/lib/empresas/lifecycle-queries.ts`
  - Query de "mis empresas".
  - Query de pool reclamable.
  - Query de detalle profesional.
  - Query de ciclo de vida read-only.

### Endpoints nuevos

- `GET /api/empresas/mias`
  - Lista empresas asignadas al profesional autenticado.
  - Admin puede usarlo como vista operativa propia si tambien necesita ver sus asignadas.
- `GET /api/empresas/pool`
  - Lista empresas activas reclamables.
  - Incluye flag `ocupada`, nombre del dueno actual y datos minimos.
- `POST /api/empresas/[id]/reclamar`
  - Body: `{ comentario?: string }`.
  - Comentario obligatorio si la empresa tiene dueno distinto.
- `POST /api/empresas/[id]/soltar`
  - Body: `{ comentario: string }`.
- `POST /api/empresas/[id]/estado`
  - Body: `{ estado: "Activa" | "En Proceso" | "Pausada" | "Cerrada" | "Inactiva", comentario: string }`.
- `POST /api/empresas/[id]/notas`
  - Body: `{ contenido: string }`.
- `GET /api/empresas/[id]/eventos`
  - Query: `tipo=todo|nota|cambios`, `page`, `pageSize`.
- `GET /api/empresas/[id]/ciclo-vida`
  - Deriva etapas desde `formatos_finalizados_il` y `form_drafts`.

### Contrato de errores

- `401`: sin sesion.
- `403`: sin rol o accion no permitida.
- `404`: empresa inexistente o soft-deleted.
- `409`: condicion de carrera o estado no compatible.
- `400`: payload invalido o comentario faltante.

Todos los errores deben tener mensaje user-facing en espanol Colombia.

## Capa 3 - UI Profesional

Reusar `src/components/backoffice/` y mantener la direccion visual RECA + acentos legacy.

### Rutas visibles

- `/hub/empresas`
  - Entrada role-aware.
  - Admin sigue viendo backoffice gerencial.
  - Profesional ve home operativo.
- `/hub/empresas/mis`
  - Lista "Mis empresas".
- `/hub/empresas/[id]`
  - Detalle operativo compartido.
- `/hub/empresas/calendario`
  - Placeholder visible: "Calendario en preparacion".

### Home profesional

Cards principales:

- Mis empresas
  - Empresas asignadas al usuario.
  - CTA a `/hub/empresas/mis`.
- Calendario
  - Deshabilitado o placeholder con copy claro.

### Mis empresas

Tabla con:

- Nombre
- NIT
- Estado
- Ultimo formato
- Accion

Comportamiento:

- Search de mis empresas por nombre/NIT.
- Buscador operativo dentro de la misma pantalla para cualquier empresa activa; solo consulta con minimo 3 caracteres.
- Resultados del buscador con badges `Tuya`, `Libre`, `Asignada a X`.
- Sorting por headers reusable.
- Paginacion.
- Empty state claro: "Aun no tienes empresas asignadas."
- Seccion roja `N empresas nuevas`; solo una nota explicita posterior a la asignacion/toma cierra la alerta.

### Detalle de empresa

Secciones:

- Header con nombre, estado y estado de asignacion.
- Resumen read-only con datos principales, contactos, Compensar, observaciones, notas y bitacora reciente.
- Acciones:
  - Asignarmela.
  - Tomar control.
  - Soltar.
  - Agregar nota.
- Secciones plegables; abiertas por defecto `Datos principales` y `Notas`.

La UI debe mostrar estados `Cargando...`, `Guardando cambios...`, `Guardando nota...`.

## Capa 4 - Ciclo de Vida Read-only

E3 solo muestra estructura; no implementa reglas granular por etapa.

Etapas:

1. Presentacion (`presentacion`)
2. Evaluacion de accesibilidad (`evaluacion`)
3. Sensibilizacion (`sensibilizacion`)
4. Condiciones de la vacante (`condiciones-vacante`)
5. Seleccion incluyente (`seleccion`)
6. Contratacion incluyente (`contratacion`)
7. Induccion organizacional (`induccion-organizacional`)
8. Induccion operativa (`induccion-operativa`)
9. Seguimientos (`seguimientos`)

Cada etapa muestra:

- Estado:
  - `No iniciado`
  - `En borrador`
  - `Finalizado`
  - `Visita fallida` cuando el payload lo indique
- Fecha ultima actividad.
- Autor cuando exista.
- Link al Sheet/PDF si esta finalizado.
- Boton para abrir formato existente o iniciar uno nuevo con empresa prellenada.

Reglas:

- Interprete LSC no es etapa; es servicio transversal.
- Si hay multiples finalizados, mostrar contador y permitir expandir.
- Si hay borrador activo, abrir ese draft.
- Si no hay borrador ni finalizado, abrir formulario nuevo con empresa prellenada.

## Capa 5 - Performance, Egress y QA

E3 debe respetar lo aprendido en E2D.

### Performance

- Listados con campos minimos.
- Page size conservador.
- Nada de snapshots grandes en listados.
- No traer eventos completos si solo se necesita contador.
- Ciclo de vida debe consultar por empresa puntual, no barrer todas las empresas.
- Mantener `count: "exact"` solo si no aparece costo relevante.

### Loading y feedback

- `loading.tsx` para rutas nuevas.
- Skeletons de tabla y detalle.
- Mensajes friendly:
  - `Cargando tus empresas...`
  - `Buscando empresas...`
  - `Abriendo empresa...`
  - `Reclamando empresa...`
  - `Guardando nota...`

### QA manual

Checklist minimo:

- Profesional con rol puede entrar a `/hub/empresas`.
- Usuario sin rol no ve Empresas.
- Admin conserva backoffice.
- Mis empresas solo muestra asignadas al usuario.
- Reclamar libre asigna y crea evento.
- Reclamar ocupada exige comentario y crea `quitada` + `reclamada`.
- Soltar exige comentario, libera empresa y crea evento.
- Cambiar estado exige comentario y crea evento.
- Nota aparece arriba de bitacora y no se puede editar/borrar.
- Ciclo de vida muestra finalizados/borradores sin modificar formularios.
- Formularios siguen sin sidebar ni cambios visuales.

## Public Interfaces

### Roles

- Reusa `inclusion_empresas_admin`.
- Reusa `inclusion_empresas_profesional`.

### Rutas

- `/hub/empresas/mis`
- `/hub/empresas/reclamar`
- `/hub/empresas/[id]`
- `/hub/empresas/calendario`

### Endpoints

- `GET /api/empresas/mias`
- `GET /api/empresas/pool`
- `POST /api/empresas/[id]/reclamar`
- `POST /api/empresas/[id]/soltar`
- `POST /api/empresas/[id]/estado`
- `POST /api/empresas/[id]/notas`
- `GET /api/empresas/[id]/eventos`
- `GET /api/empresas/[id]/ciclo-vida`

### Eventos nuevos

- `reclamada`
- `soltada`
- `quitada`
- `nota`

## Plan de Implementacion por Capas

### E3.1 - Migracion y contrato de eventos

- Implementado en migracion `20260429210058_e3_1_empresa_lifecycle_rpc` y aplicado en Supabase remoto.
- CHECK de `empresa_eventos.tipo` ampliado para `reclamada`, `soltada`, `quitada` y `nota`.
- RPCs transaccionales server-only creadas con grants cerrados.
- Helpers TS minimos y tests agregados para el contrato RPC y los textos de actividad.
- Post-QA: se agrega migracion correctiva `e3_1_empresa_nota_lock` para que `empresa_agregar_nota` use `select ... for update` sobre la empresa antes de insertar el evento `nota`.

#### Decisiones Post-QA E3.1

- **Aplicado:** `empresa_agregar_nota` ahora bloquea la fila de empresa activa con `for update`. Aunque la RPC no muta `empresas`, esto evita insertar una nota mientras otra transaccion elimina o reasigna la empresa, y deja el patron alineado con reclamar, soltar y cambiar estado.
- **Diferido:** consolidar las dos consultas de `profesional_roles` en una sola agregacion. El costo actual ocurre dentro de la misma RPC y no genera round-trips HTTP ni egress; se reabre si las mediciones de E3.2 muestran volumen alto de acciones.
- **Diferido:** eliminar el indice `(empresa_id, tipo, created_at desc)`. Se conserva porque E3.4/E3.5 planean filtros de bitacora por notas/cambios; si la UI final no usa ese filtro, se remueve en migracion correctiva.
- **Diferido a UI:** comentario ingresado al reclamar una empresa ya propia se descarta porque la accion es idempotente y no crea evento. E3.3 debe mostrar el estado `unchanged` como aviso, no como error.
- **Diferido a E3.2:** pruebas con SQL real de reclamar/soltar/estado/nota. E3.2 expondra endpoints y podra cubrir esos flujos con tests de API sin mutar datos productivos manualmente.

### E3.2 - Dominio/API profesional

- Implementado localmente sin migraciones nuevas.
- Se agregan `lifecycle-schemas.ts`, `lifecycle-queries.ts` y `lifecycle-api.ts` para separar validacion, queries livianas y helpers de route handlers.
- Endpoints entregados:
  - `GET /api/empresas/mias`
  - `GET /api/empresas/pool`
  - `POST /api/empresas/[id]/reclamar`
  - `POST /api/empresas/[id]/soltar`
  - `POST /api/empresas/[id]/estado`
  - `POST /api/empresas/[id]/notas`
  - `GET /api/empresas/[id]/eventos` extendido para admin/profesional, filtros `todo|nota|cambios` y paginacion.
- Todos los endpoints usan `requireAppRole(["inclusion_empresas_admin", "inclusion_empresas_profesional"])`, por lo que usuarios con contrasena temporal siguen bloqueados.
- Los listados operativos usan `EMPRESA_OPERATIVA_LIST_FIELDS`, busqueda limitada a nombre/NIT/ciudad y respuestas camelCase con `assignmentStatus`.
- La bitacora operativa valida empresa activa, pagina resultados y no devuelve `payload` crudo al cliente; solo `id`, `tipo`, `actorNombre`, `createdAt`, `resumen` y `detalle`.
- Las mutaciones llaman las RPCs transaccionales de E3.1 y devuelven `{ ok, code, message, data }`; errores de negocio se mapean a `{ error, code }`.
- Cobertura agregada para schemas, queries y route handlers con 401/403, payload invalido, roles operativos y eventos sanitizados.

#### Decisiones Post-QA E3.2

- **Aplicado:** los eventos operativos ahora salen en camelCase (`actorNombre`, `createdAt`) para mantener el contrato igual a `mias` y `pool` antes de que E3.3 construya UI encima.
- **Aplicado:** se agrega cobertura explicita de 401 y 403 en `mias`, `pool`, eventos y mutaciones de ciclo de vida para asegurar que ninguna ruta consulta ni muta datos cuando falla `requireAppRole`.
- **Diferido:** `EMPRESA_ESTADO_OPTIONS` sigue duplicado entre TypeScript y la RPC SQL. Es una deuda controlada porque el estado canonico ya existe en ambos lados por seguridad defensiva; se reabre solo si se agregan estados nuevos.
- **Diferido:** `GET /api/empresas/[id]/eventos` mantiene dos consultas, una para validar empresa activa y otra para listar eventos. El costo es bajo y evita exponer eventos de empresas eliminadas sin complicar la query con joins en Supabase.
- **Descartado como riesgo cliente:** `payload` crudo se lee solo server-side para construir `resumen` y `detalle`; no viaja al browser.
- **Diferido:** `profesionalId ?? -1` en `listMisEmpresas` se conserva como guard defensivo ante un contexto mal formado. `requireAppRole` ya debe resolver perfil, y `-1` devuelve cero filas sin filtrar datos de otro usuario.

### E3.3 - UI profesional base

- Implementada localmente.
- `/hub/empresas` ahora es role-aware para admin y profesional: admin conserva backoffice; profesional ve home operativo con `Mis empresas` y placeholder de `Calendario`.
- `/hub/empresas/mis` muestra tabla de asignadas con contador rojo de nuevas, filtro por nombre/NIT/estado, sorting por `Nombre`, `NIT`, `Estado` y `Ultimo formato`, y buscador operativo de cualquier empresa activa con minimo 3 caracteres.
- `GET /api/empresas/mias` se extiende con `nuevas`, `newCount`, `esNueva`, `ultimoFormatoAt` y `ultimoFormatoNombre`, respaldado por RPC `empresas_profesional_mis_resumen`.
- `/hub/empresas/[id]` entrega detalle read-only en pagina amplia, con datos principales, contactos, Compensar, observaciones, notas explicitas, bitacora reciente y acciones de asignacion/liberacion con comentario.
- `GET /api/empresas/[id]/operativa` expone el detalle read-only liviano para roles operativos.
- `/hub/empresas/calendario` queda como placeholder visible, sin calendario funcional.
- Decision de negocio: la busqueda global de empresas vive dentro de `Mis empresas`; no existe pantalla separada `Reclamar` en E3.3.
- Decision de datos: `E3_3_ASSIGNMENT_ALERTS_START_AT` define el corte de alertas. Si falta en local/test, el fallback no cuenta legacy como nuevo.

### E3.4 - Calendario y proyeccion semanal

- Definir junto con gerencia si el calendario empieza interno puro o con integracion Google Calendar posterior.
- Modelar proyecciones semanales por profesional y visibilidad metrica para gerencia.
- Mantener empresas como entidad obligatoria de cada evento.

### E3.5 - Ciclo de vida read-only

- Derivar etapas desde `formatos_finalizados_il` y `form_drafts`.
- Mostrar borradores/finalizados/visita fallida.
- Linkear a formularios existentes sin tocar su logica.

### E3.6 - QA, preview y cierre

- Ejecutar pruebas.
- Crear preview Vercel.
- QA manual con roles admin/profesional/sin rol.
- Actualizar `memory/MEMORY.md`, `memory/roadmap.md` y este documento.

## Test Plan

### Unit

- Schemas exigen comentario en reclamar ocupada, soltar y cambio de estado.
- Nota vacia falla.
- Estado invalido falla.
- Event builders producen payloads sin datos sensibles.
- Permisos distinguen admin, dueno y no dueno.
- Ciclo de vida deriva estados correctamente desde finalizados y drafts.

### API

- `GET /api/empresas/mias`: 401 sin sesion, 403 sin rol, 200 con profesional.
- `GET /api/empresas/pool`: excluye soft-deleted.
- Reclamar libre crea evento `reclamada`.
- Reclamar ocupada sin comentario devuelve 400.
- Reclamar ocupada con comentario crea `quitada` + `reclamada`.
- Soltar por no dueno devuelve 403.
- Soltar por dueno libera empresa.
- Cambio de estado sin comentario devuelve 400.
- Nota aparece en eventos.

### UI

- Home profesional renderiza cards correctas.
- Mis empresas muestra solo asignadas.
- Reclamar muestra badges `Libre`, `Asignada`, `Tuya`.
- Modales muestran errores visibles.
- Bitacora filtra notas/cambios.
- Loading skeletons aparecen en rutas nuevas.

### Regression

- Admin backoffice sigue accesible.
- APIs admin existentes siguen funcionando.
- `/formularios/*` sin sidebar.
- `npm run lint`
- `npm run spellcheck`
- `npm run build`
- `npm run test:e2e:smoke`
- `npm run supabase:doctor`
- `npm run supabase:migration:list`

## Assumptions

- E3 se limita a `inclusion_empresas_profesional` y `inclusion_empresas_admin`.
- Reclamar puede desplazar a otro profesional con comentario obligatorio.
- Soltar no requiere aprobacion gerencial.
- Notas son visibles para equipo y admins.
- Eventos son inmutables.
- Calendario real empieza en E4.
- Reglas granulares de etapas empiezan en E5.
- La atomicidad se resuelve con RPCs server-only en E3.1.
