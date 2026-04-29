# E3 - Empresas Profesional y Ciclo de Vida

**Estado:** E3.1 implementada y aplicada en Supabase remoto; E3.2 pendiente.
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
- `/hub/empresas/reclamar`
  - Pool reclamable.
- `/hub/empresas/[id]`
  - Detalle operativo compartido.
- `/hub/empresas/calendario`
  - Placeholder visible: "Calendario en preparacion".

### Home profesional

Cards principales:

- Mis empresas
  - Empresas asignadas al usuario.
  - CTA a `/hub/empresas/mis`.
- Reclamar
  - Empresas libres u ocupadas reclamables.
  - CTA a `/hub/empresas/reclamar`.
- Calendario
  - Deshabilitado o placeholder con copy claro.

### Mis empresas

Tabla con:

- Nombre
- NIT
- Ciudad
- Sede empresa
- Estado
- Ultima actividad
- Accion

Comportamiento:

- Search por nombre/NIT/ciudad, alineado con E2D.
- Sorting por headers reusable.
- Paginacion.
- Empty state claro: "Aun no tienes empresas asignadas."
- CTA secundario a Reclamar.

### Reclamar

Tabla con:

- Nombre
- NIT
- Ciudad
- Estado
- Dueno actual
- Accion

Comportamiento:

- Badges: `Libre`, `Asignada`, `Tuya`.
- Si esta libre: confirmar y reclamar.
- Si esta ocupada por otro: modal con comentario obligatorio.
- Si ya es tuya: accion deshabilitada o link a detalle.

### Detalle de empresa

Secciones:

- Header con nombre, NIT, ciudad, sede, gestion, estado y dueno.
- Resumen operativo con datos principales.
- Acciones:
  - Reclamar.
  - Soltar.
  - Cambiar estado.
  - Agregar nota.
- Tabs:
  - Resumen.
  - Ciclo de vida.
  - Bitacora.

La UI debe mostrar estados `Cargando...`, `Guardando cambios...`, `Reclamando empresa...`, `Soltando empresa...`, `Agregando nota...`.

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

- Crear schemas lifecycle.
- Crear server helpers.
- Crear endpoints `mias`, `pool`, `reclamar`, `soltar`, `estado`, `notas`, `eventos`.
- Cubrir 401/403/404/409/400.

### E3.3 - UI profesional base

- Activar home operativo para `inclusion_empresas_profesional`.
- Implementar `Mis empresas`.
- Implementar `Reclamar`.
- Agregar loading states.

### E3.4 - Detalle, bitacora y notas

- Implementar `/hub/empresas/[id]`.
- Implementar tabs de resumen, ciclo de vida y bitacora.
- Implementar composer de notas.
- Implementar acciones de reclamar, soltar y cambiar estado.

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
