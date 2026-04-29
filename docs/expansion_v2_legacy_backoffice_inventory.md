# Expansion v2 - Inventario legacy backoffice gerencial

Fecha: 2026-04-28

Este documento inventaria la aplicacion legacy `C:\Users\aaron\Desktop\empresas_reca`
y contrasta sus modulos contra el estado actual de `INCLUSION_LABORAL_NUEVO` y Supabase.
El objetivo es definir E2 sin adivinar: que se trae, que cambia y que se deja fuera.

## Conclusion ejecutiva

La aplicacion legacy no era un panel operativo para profesionales. Era un backoffice de
gerencia para administrar tablas maestras en Supabase con interfaz grafica.

Por eso E2 debe replantearse como:

- E2A: Backoffice gerencial + Empresas CRUD completo.
- E2B: Profesionales CRUD + reset de contrasena/Auth.
- E2C: CRUDs simples para Asesores, Gestores e Interpretes con un patron comun.

Empresas es el modulo principal y mas dinamico. Profesionales es sensible porque toca
autenticacion. Asesores, Gestores e Interpretes son catalogos pequenos y relativamente
estaticos.

## Fuentes revisadas

- Legacy: `C:\Users\aaron\Desktop\empresas_reca\app.py`
- Legacy: `C:\Users\aaron\Desktop\empresas_reca\TEMPLATE_NUEVAS_EMPRESAS.csv`
- Legacy: `C:\Users\aaron\Desktop\empresas_reca\TEMPLATE_NUEVAS_EMPRESAS_INSTRUCCIONES.txt`
- Legacy: scripts en `C:\Users\aaron\Desktop\empresas_reca\scripts\`
- Web actual: `src/app/api/profesionales/route.ts`
- Web actual: `src/app/api/asesores/route.ts`
- Web actual: `src/lib/auth/roles.ts`
- Supabase remoto via MCP: tablas `empresas`, `profesionales`, `asesores`, `gestores`, `interpretes`

## Menu legacy

La pantalla principal contiene 5 modulos:

| Modulo | Descripcion legacy | Tabla principal | Tipo |
|---|---|---|---|
| Empresas | Gestion de empresas y clientes | `empresas` | CRUD especializado |
| Asesores | Asesores de Compensar | `asesores` | CRUD generico |
| Gestores | Gestores de empleo | `gestores` | CRUD generico |
| Profesionales | Profesionales de RECA | `profesionales` | CRUD generico + reset password |
| Interpretes | Interpretes de lengua de senas | `interpretes` | CRUD generico |

La app legacy solo la usaba gerencia. En web, todo este bloque debe quedar protegido por
`inclusion_empresas_admin`.

## Patron comun legacy de CRUD generico

`AppEntidad` y `FormularioEntidad` administran tablas simples.

Funciones comunes:

- Listar todos los registros.
- Ordenar por un campo configurado.
- Crear registro.
- Editar registro seleccionado.
- Eliminar registro seleccionado.
- Refrescar.
- Doble click para editar.
- Atajos: `Ctrl+N` nuevo, `F5` refrescar, `Ctrl+S` guardar dentro del modal, `Esc` cerrar.
- Validacion de campos requeridos.
- Coercion especial: en `profesionales`, `antiguedad` debe ser entero o vacio.

Limitacion legacy:

- No hay paginacion, filtros ni busqueda en estos CRUDs simples.
- En varias tablas se elimina fisicamente.
- Las llaves no son homogeneas: `asesores` usa `nombre`, `profesionales` usa `id`,
  `interpretes` en legacy usa `nombre`, y `gestores` no tiene primary key en remoto.

## Modulo Empresas legacy

### Lista principal

Columnas visibles:

- `nombre_empresa`
- `nit_empresa`
- `ciudad_empresa`
- `estado`
- `zona_empresa`
- `profesional_asignado`
- `asesor`
- `contacto_empresa`
- `telefono_empresa`
- `sede_empresa`

Acciones:

- Nueva empresa.
- Importar Excel.
- Editar.
- Refrescar.
- Eliminar.

Comportamiento:

- Carga por lotes de 1000 registros.
- Infinite scroll cuando la tabla se acerca al final.
- Ordenamiento client-side por columna visible.
- Doble click abre edicion.
- `Ctrl+N` nueva empresa.
- `Ctrl+F` enfoca busqueda.
- `F5` recarga.

### Busqueda

Campos de busqueda:

- Todos
- Nombre
- NIT
- Ciudad
- Profesional

Para "Todos" usa busqueda `ilike` en:

- `nombre_empresa`
- `nit_empresa`
- `ciudad_empresa`
- `estado`
- `zona_empresa`
- `profesional_asignado`
- `asesor`
- `contacto_empresa`
- `telefono_empresa`
- `sede_empresa`

La busqueda sanitiza caracteres raros y normaliza espacios. En busqueda por profesional
hay autocompletado local basado en profesionales presentes en las empresas cargadas.

### Filtros avanzados

Filtros:

- Profesional asignado (`profesional_asignado`)
- Asesor (`asesor`)
- Caja de compensacion (`caja_compensacion`)
- Zona Compensar (`zona_empresa`)
- Estado (`estado`)

Las opciones de filtro se derivan de toda la tabla `empresas`, leyendo por lotes de 1000.

### Formulario Empresa

El formulario esta agrupado por secciones.

#### Seccion Empresa

| Campo | Label legacy | Requerido | Tipo legacy |
|---|---|---:|---|
| `nombre_empresa` | Nombre Empresa | Si | input |
| `nit_empresa` | NIT | No | input |
| `direccion_empresa` | Direccion | No | input |
| `ciudad_empresa` | Ciudad | No | input |
| `sede_empresa` | Sede Empresa | No | input |
| `gestion` | Gestion | Si | select |
| `responsable_visita` | Responsable Visita | No | input |
| `cargo` | Cargo | No | textarea |
| `contacto_empresa` | Contacto(s) | No | textarea |
| `telefono_empresa` | Telefono(s) | No | textarea |
| `correo_1` | Email(s) | No | textarea |
| `estado` | Estado | Si | select |

Valores:

- `gestion`: `RECA`, `COMPENSAR`
- `estado`: `Activa`, `En Proceso`, `Pausada`, `Cerrada`, `Inactiva`
- Default estado: `En Proceso`

#### Seccion Compensar

| Campo | Label legacy | Requerido | Tipo legacy |
|---|---|---:|---|
| `caja_compensacion` | Caja Compensacion | No | select |
| `zona_empresa` | Zona Compensar | No | combobox editable |
| `asesor` | Asesor | No | select desde `asesores` |
| `correo_asesor` | Email Asesor | No | input autollenado |

Valores legacy:

- `caja_compensacion`: `Compensar`, `No Compensar`
- Zonas sugeridas:
  - Soacha
  - Universidad Compensar
  - Kennedy
  - Chapinero
  - Bosa
  - Mosquera
  - Cajica
  - Girardot
  - Suba
  - Empleabilidad Estrategica
  - Por Confirmar

El asesor se carga desde `asesores(nombre,email)` y autollena `correo_asesor`.

#### Seccion RECA

| Campo | Label legacy | Requerido | Tipo legacy |
|---|---|---:|---|
| `profesional_asignado` | Profesional Asignado | No | combobox editable |
| `correo_profesional` | Email Profesional | No | input autollenado |

El profesional se carga desde `profesionales(nombre_profesional, correo_profesional)`.
Si el usuario escribe un profesional que no existe, legacy crea un registro minimo en
`profesionales` con `nombre_profesional` y opcionalmente `correo_profesional`.

Esto no deberia copiarse igual en web sin decision explicita, porque en el sistema actual
`profesionales` tambien participa en auth, roles y auditoria.

#### Seccion Observaciones

| Campo | Label legacy | Requerido | Tipo legacy |
|---|---|---:|---|
| `observaciones` | Observaciones | No | textarea |

### Crear/editar/eliminar empresas

Crear:

- Inserta directamente en `empresas`.
- Valida solo `nombre_empresa` y `gestion`.
- Si hay profesional nuevo escrito manualmente, lo asegura en `profesionales`.

Editar:

- Actualiza directamente `empresas` por `id`.
- No genera bitacora.

Eliminar:

- Borra fisicamente por `id`.
- No usa soft delete.

Decision para web:

- No copiar borrado fisico. E2 debe usar `deleted_at` y ocultar por default.
- E2 debe generar evento en `empresa_eventos` para crear, editar, soft delete,
  asignar y desasignar.
- E2 no debe permitir escritura directa desde cliente; debe usar API routes server-side.

### Importacion Excel

La app legacy permite importar `.xlsx` de empresas.

Campos mapeados desde plantilla:

- NOMBRE -> `nombre_empresa`
- NIT -> `nit_empresa`
- DIRECCION -> `direccion_empresa`
- CIUDAD -> `ciudad_empresa`
- CORREO 1 -> `correo_1`
- CONTACTO -> `contacto_empresa`
- CARGO CONTACTO / CARGO RESPONSABLE -> `cargo` (prioriza responsable si existe)
- SEDE -> `sede_empresa`
- TELEFONO -> `telefono_empresa`
- RESPONSABLE DE LA VISITA -> `responsable_visita`
- ASESOR -> `asesor`
- CORREO DE ASESOR -> `correo_asesor`
- ZONA -> `zona_empresa`
- CAJA DE COMPENSACION -> `caja_compensacion`
- PROFESIONAL ASIGNADO -> `profesional_asignado`
- CORREO PROFESIONAL -> `correo_profesional`
- ESTADO -> `estado`
- OBSERVACIONES -> `observaciones`

Reglas:

- Lee la primera hoja.
- Ignora filas completamente vacias.
- Normaliza NIT y nombre para comparar.
- Duplicado = misma pareja `(nit normalizado, nombre normalizado)`.
- Si mismo NIT tiene nombres distintos, se permite como empresa diferente.
- Muestra resumen con tabs:
  - Nuevas
  - Repetidas en nube
  - Repetidas en archivo
- En nuevas permite marcar/desmarcar registros antes de subir.
- Inserta en chunks de 200.

Decision para web:

- Importacion masiva estaba fuera del E2 original. Ahora queda como candidata a E2D,
  no como parte del primer corte, salvo que gerencia lo necesite desde dia 1.

### Scripts auxiliares legacy

Hay scripts fuera de la UI:

- `import_new_empresas_csv.py`: importa CSV por plantilla, dry-run por default, aplica con `--apply`.
- `sync_empresas_excel.py`: sincroniza Excel contra BD; actualiza por `(nit,nombre)` e inserta faltantes.
- `report_empresas_duplicados_resaltado.py`: reporte Excel/JSON de duplicados exactos y parciales.
- `purge_empresas_reglas_negocio.py`: clasifica duplicados y puede borrar con reglas de negocio.
- `dedupe_empresas_exact.py` y `purge_empresas_nombre_nit_exactos.py`: soporte de limpieza de duplicados.

Decision para web:

- No son CRUD normal. Deben documentarse como herramientas admin de saneamiento/importacion.
- No entran en E2A salvo que se decida agregar "Importar Excel" en web.

## Modulo Profesionales legacy

Tabla: `profesionales`

Columnas visibles:

- `nombre_profesional`
- `correo_profesional`
- `programa`
- `antiguedad`
- `usuario_login`

Formulario:

| Campo | Label legacy | Requerido | Tipo legacy |
|---|---|---:|---|
| `nombre_profesional` | Nombre | Si | input |
| `correo_profesional` | Email | No | input |
| `programa` | Programa | No | input |
| `antiguedad` | Antiguedad | No | entero |
| `usuario_login` | Usuario Login | No | input |

Acciones:

- Nuevo.
- Editar.
- Eliminar.
- Refrescar.
- Restablecer contrasena.

Reset password legacy:

- Solo aparece en modulo `profesionales`.
- Requiere registro seleccionado.
- Requiere `id`, `usuario_login` y `correo_profesional`.
- Usa contrasena temporal fija `Password1234`.
- Calcula hash PBKDF2 local (`usuario_pass_hash`).
- Llama RPC `admin_reset_profesional_password`.
- La RPC intenta enlazar `auth_user_id` por `correo_profesional` si esta vacio.
- Si hay `auth_user_id`, actualiza `auth.users.encrypted_password`.
- Limpia `usuario_pass`, actualiza `usuario_pass_hash`, marca `auth_password_temp = true`.

Estado remoto actual:

- `profesionales` tiene 21 filas.
- 16 tienen `auth_user_id`.
- 16 tienen `usuario_login`.
- 18 tienen `correo_profesional`.
- 13 tienen `usuario_pass_hash`.
- 4 tienen `is_admin = true`.
- E0 ya creo `profesional_roles` con 4 permisos `inclusion_empresas_admin`.

Riesgos:

- Hay dos modelos de admin: legacy `is_admin` y nuevo `profesional_roles`.
- La RPC `admin_reset_profesional_password` esta en schema `public` como `SECURITY DEFINER`.
  Para E2 conviene envolverla detras de API route con `requireAppRole`, y evaluar mover
  funciones privilegiadas a schema privado en una migracion posterior.
- Crear profesionales ya no es solo insertar una fila: puede requerir crear/enlazar usuario
  Supabase Auth o dejarlo explicitamente como "perfil sin acceso".

Decision para web:

- E2B debe definir dos modos:
  - Profesional con acceso: requiere email, usuario_login y provisioning/enlace Auth.
  - Profesional catalogo/sin acceso: solo sirve como dato maestro, no puede iniciar sesion.
- Reset password debe ser accion admin server-side, con confirmacion y respuesta auditada.
- No usar `is_admin` como fuente de permisos de Empresas; usar `profesional_roles`.

## Modulo Asesores legacy

Tabla: `asesores`

Columnas/listado:

- `nombre`
- `email`
- `telefono`
- `sede`
- `gestor`

Formulario:

| Campo | Label legacy | Requerido | Tipo |
|---|---|---:|---|
| `nombre` | Nombre | Si | input |
| `email` | Email | No | input |
| `telefono` | Telefono | No | input |
| `sede` | Sede | No | input |
| `gestor` | Gestor | No | input |

Supabase actual:

- 27 filas.
- Primary key: `nombre`.
- Tambien existe columna `localidad`, que legacy no muestra.
- Web actual solo expone `GET /api/asesores` con `nombre` para formularios.

Decision para web:

- CRUD simple admin.
- Definir si `localidad` se muestra o se conserva oculta. Como existe en BD, el inventario
  recomienda mostrarla en E2C si gerencia la reconoce.

## Modulo Gestores legacy

Tabla: `gestores`

Columnas/listado:

- `nombre`
- `email`
- `telefono`
- `sede`
- `localidades`

Formulario:

| Campo | Label legacy | Requerido | Tipo |
|---|---|---:|---|
| `nombre` | Nombre | Si | input |
| `email` | Email | No | input |
| `telefono` | Telefono | No | input |
| `sede` | Sede | No | input |
| `localidades` | Localidades | No | textarea |

Supabase actual:

- 10 filas.
- No tiene primary key.
- RLS solo tiene SELECT authenticated.

Riesgo:

- El legacy actualiza/elimina por `nombre`, pero la tabla remota no declara PK.
- Antes de CRUD web hay que agregar una llave estable o declarar `nombre` unico si los datos
  lo permiten.

Decision para web:

- E2C debe incluir una mini-migracion para llave estable antes de permitir editar/eliminar.

## Modulo Interpretes legacy

Tabla: `interpretes`

Columnas/listado:

- `nombre`

Formulario:

| Campo | Label legacy | Requerido | Tipo |
|---|---|---:|---|
| `nombre` | Nombre | Si | input |

Supabase actual:

- 28 filas.
- Tiene `id uuid`, `nombre`, `created_at`, `nombre_key`.
- Primary key: `id`.
- Unique: `nombre` y `nombre_key`.
- Ya existe normalizacion web en `src/lib/interpretesCatalog.ts`.

Decision para web:

- CRUD simple admin usando `id` como llave real.
- Mantener normalizacion `nombre_key` y no tocar los formularios que consumen el catalogo.

## Supabase: realidad actual relevante

Filas actuales:

| Tabla | Filas |
|---|---:|
| `empresas` | 1183 |
| `profesionales` | 21 |
| `asesores` | 27 |
| `gestores` | 10 |
| `interpretes` | 28 |

### `empresas`

Columnas actuales principales:

- `id uuid primary key default gen_random_uuid()`
- `nombre_empresa text not null`
- `nit_empresa`
- `direccion_empresa`
- `ciudad_empresa`
- `sede_empresa`
- `zona_empresa`
- `correo_1`
- `contacto_empresa`
- `telefono_empresa`
- `cargo`
- `responsable_visita`
- `profesional_asignado`
- `correo_profesional`
- `asesor`
- `correo_asesor`
- `caja_compensacion`
- `estado default 'En Proceso'`
- `observaciones`
- `created_at`
- `updated_at`
- `comentarios_empresas`
- `gestion`
- `tamaño`

Faltan para E2/E3:

- `profesional_asignado_id`
- `deleted_at`
- `empresa_eventos`

Estado de datos:

- `gestion` esta mayoritariamente vacia: 1084 null, 58 RECA, 41 COMPENSAR.
- `estado` tiene muchos valores no canonicos: variantes de mayusculas, `Cerrado`,
  `Stand by`, `ACTIVA / SENA`, `SENA`, typos y valores que parecen datos corridos.
- `caja_compensacion` tiene variantes: `No Compensar`, `No compensar`, `NO COMPENSAR`,
  typos como `Compenasr`, y valores fuera de catalogo.

Decision para web:

- El formulario debe usar catalogos canonicos hacia adelante.
- El listado debe tolerar datos historicos no canonicos.
- Cualquier normalizacion masiva debe ser migracion/proceso separado, no side effect del CRUD.

### RLS/politicas

Estado actual importante:

- `empresas` permite SELECT/INSERT/UPDATE/DELETE a cualquier `authenticated`.
- `profesionales` usa `is_current_user_admin()` y self-access.
- `asesores` y `gestores` tienen solo SELECT authenticated.
- `interpretes` tiene politica restrictiva deny clients y politicas antiguas permisivas; por
  ser restrictiva, el deny efectivo bloquea clientes.

Decision para web:

- E2 debe pasar escrituras por API routes con service role y `requireAppRole`.
- Conviene endurecer RLS de `empresas` para no permitir escrituras directas desde clientes.
- Las tablas maestras deben quedar server-only para mutaciones.

## Web actual relacionada

Ya existe:

- `/api/profesionales`: GET autenticado, service role, devuelve solo
  `nombre_profesional` y `cargo_profesional` para formularios.
- `/api/asesores`: GET autenticado, service role, devuelve solo `nombre`.
- `src/lib/interpretesCatalog.ts`: normalizacion/sort para interpretes.
- `src/lib/auth/roles.ts`: `getCurrentUserContext()` y `requireAppRole()`.
- `/hub/empresas`: placeholder E1.

Restriccion:

- No tocar `src/app/formularios/*`, `src/components/forms/*`,
  `src/lib/finalization/*`, `src/app/api/formularios/*`.

## Recomendacion de alcance

### E2A - Backoffice shell + Empresas CRUD

Debe incluir:

- `/hub/empresas/admin` como entrada gerencial.
- Tarjetas internas o tabs: Empresas, Profesionales, Asesores, Gestores, Interpretes.
- Activar primero Empresas.
- Listado de empresas con busqueda, filtros, paginacion server-side y acciones.
- Crear/editar empresa con secciones Empresa, Compensar, RECA, Observaciones.
- Soft delete.
- Auditoria en `empresa_eventos`.
- Mutaciones server-side con `requireAppRole(["inclusion_empresas_admin"])`.

No incluir todavia:

- Importacion Excel.
- Limpieza de duplicados.
- Vista profesional "Mis empresas".
- Reclamar/soltar por profesionales.
- Calendario.

### E2B - Profesionales admin

Debe incluir:

- Listado y CRUD de profesionales.
- Diferenciar perfil con acceso vs perfil catalogo.
- Crear/enlazar usuario Supabase Auth automaticamente cuando gerencia habilite acceso.
- Reset password server-side con contrasena temporal unica por accion.
- Mostrar contrasena temporal una sola vez para copiar; nunca guardarla en eventos.
- Manejo explicito de `auth_user_id`, `usuario_login`, `correo_profesional`.
- Roles desde `profesional_roles`, no desde `is_admin`.
- Roles user-facing: `Admin Inclusión` y `Profesional Inclusión`.
- Solo `aaron_vercel` puede asignar o quitar `Admin Inclusión`.
- Perfiles con acceso Auth requieren `correo_profesional`, `usuario_login` y al menos un rol.
- Soft delete exige comentario, quita roles, desactiva Auth y libera empresas asignadas.
- Restaurar deja el perfil como catalogo sin roles ni acceso Auth.

Post-QA E2B aplicado:

- Ningún admin puede eliminar su propio perfil; evita lock-out por desactivar el usuario actual.
- Un admin distinto de `aaron_vercel` no puede eliminar el perfil super-admin.
- Antes de enlazar un usuario Auth encontrado por correo se valida que no esté vinculado a otro profesional activo.
- Los endpoints protegidos por `requireAppRole` rechazan usuarios con contraseña temporal hasta completar `/auth/cambiar-contrasena-temporal`.
- Atomicidad transaccional de mutación + eventos queda fuera de E2B; requiere RPC/reconciliador en E3/E2C.

## QA manual post-E2B - Fases 1 y 2

Fase 1 estabiliza hallazgos manuales sin cambiar contratos:

- `Nuevo profesional` conserva la navegación a `/hub/empresas/admin/profesionales/nuevo`;
  queda cubierto con test de componente.
- Los logs reportados de `console-log.service.ts`, `bitwarden_wasm_internal_bg.js`,
  `bootstrap-autofill-overlay.js` y `notifications.bitwarden.com` corresponden a
  extensiones de navegador, no a la aplicación RECA.
- Textos user-facing del backoffice de Empresas corrigen ortografía visible:
  `Búsqueda`, `Gestión`, `Última edición`, `Acción`, `Página`, `Dirección`,
  `Teléfono`, `Caja de compensación`, `Todavía`.

Fase 2 normaliza escrituras nuevas de Empresas antes de persistir en Supabase:

- Se remueven espacios invisibles al comienzo/final y se colapsan espacios internos.
- Campos principales se guardan en formato primera mayúscula y demás minúsculas.
- `nit_empresa` elimina puntos y espacios; solo permite números y un guion.
- `estado`, `caja_compensacion` y `gestion` aceptan variantes conocidas y escriben
  valores canónicos.
- Valores desconocidos no se inventan: devuelven `400` con mensaje claro.
- La migración `20260429112715_qa_empresas_normalizacion_catalogos.sql` saneó en remoto
  534 filas con mappings seguros. Quedan sin tocar 60 valores ambiguos de `estado` y
  4 valores ambiguos de `caja_compensacion` para decisión manual posterior.

## QA manual post-E2B - Fase 3

Fase 3 mejora la captura operativa de Empresas y Profesionales sin tocar
`/formularios/*`.

Empresas:

- `Zona` pasa a `Zona Compensar` y queda como dropdown cerrado desde valores únicos
  actuales de Supabase.
- `Sede` pasa a `Sede empresa`.
- `Responsable de visita` queda como sección única con nombre, cargo, teléfono y
  correo.
- `Contactos` queda como sección separada: el primer contacto es readonly y replica al
  responsable; contactos adicionales se agregan con el botón `Agregar contacto adicional`.
- La escritura legacy conserva columnas actuales, serializando con `;` y manteniendo
  alineadas las posiciones entre `contacto_empresa`, `cargo`, `telefono_empresa` y
  `correo_1`.
- Si una fila adicional tiene cargo, teléfono o correo, debe tener nombre. Los correos
  de responsable/contactos se validan si se diligencian.
- El asesor se puede seleccionar desde `asesores` para autocompletar correo, o escribir
  manualmente como quickfix sin crear ni modificar la tabla `asesores`.

Profesionales:

- Crear/editar normaliza `nombre_profesional`, exige 2 a 5 palabras y guarda
  capitalización natural en español.
- La UI pide solo el usuario local del correo y muestra fijo `@recacolombia.org`; el
  servidor guarda el correo completo y rechaza dominios externos.
- `usuario_login` es readonly y lo genera el servidor con primeras 3 letras del primer
  nombre + primeras 3 letras del último apellido, en minúscula y sin tildes. Si existe,
  agrega sufijo numérico.
- `programa` queda como dropdown cerrado con el único valor actual `Inclusión Laboral`.
- Se agrega `GET /api/empresas/profesionales/login-sugerido` para sugerencia visual; el
  servidor sigue siendo la fuente de verdad al crear, editar o habilitar acceso.

## QA manual post-E2B - Fase 3.1

Estado local: implementada. Fase 3.1 agrupó los hallazgos del preview de Fase 3 que
debían resolverse antes de pasar a Fase 4 o retomar E3. Los demás puntos del checklist
manual de Fase 3 quedan verdes.

### Bloqueantes

- **Crear empresa sin feedback:** en preview, después de llenar toda la información y
  hacer clic en `Crear empresa`, la interfaz no muestra éxito, error ni cambio de estado.
  Se debe reproducir con sesión admin, revisar Network/API y garantizar que cualquier
  error de validación o servidor quede visible en pantalla.
- **Campos obligatorios de Empresa:** antes de guardar deben exigirse `nombre_empresa`,
  `nit_empresa`, `direccion_empresa`, `ciudad_empresa`, `sede_empresa`, `zona_empresa`,
  `gestion`, `estado`, responsable de visita completo y profesional asignado.
- **Responsable de visita completo:** el responsable exige nombre, cargo, teléfono y
  correo. Ese registro genera siempre el primer contacto readonly.
- **Compensar obligatorio:** la sección Compensar debe quedar completa antes de guardar:
  caja de compensación, Zona Compensar, asesor y correo de asesor. El quickfix manual de
  asesor sigue permitido, pero nombre y correo deben diligenciarse.
- **Contactos adicionales:** cada contacto adicional es opcional, pero si se crea una
  fila debe exigir mínimo nombre y cargo. Teléfono y correo pueden quedar vacíos. Debe
  existir un botón claro para eliminar un contacto adicional creado por error.
- **Teléfonos normalizados:** teléfonos de responsable/contactos deben aceptar solo
  números, máximo 10 dígitos. Los espacios se eliminan antes de escribir en Supabase; se
  rechazan signos, letras y otros caracteres especiales.

### Altos

- **Autocompletado del navegador:** los formularios de backoffice deben pedir al navegador
  no mostrar listas de autocompletar, igual que los formularios productivos. Aplicar en
  inputs de Empresas y Profesionales, especialmente NIT, correo, teléfono y nombres.
- **Ortografía user-facing:** revisar mensajes visibles, errores de validación y botones
  de Empresas/Profesionales con criterio más estricto de español Colombia. Debe pasar
  `npm run spellcheck` y revisión manual de textos nuevos.
- **Errores de extensión:** el stack `bootstrap-autofill-overlay.js` pertenece a Bitwarden
  u otra extensión del navegador, no a código RECA. Aun así, la mitigación del punto de
  autocompletado debe reducir la interferencia de overlays externos.

### Medios

- **Filtro de estado en Profesionales:** cambiar el filtro se percibe lento y depende del
  botón `Filtrar`. Al presionar `Filtrar`, la tabla debe actualizar estado en pantalla
  de forma clara. Se debe agregar feedback de carga o aplicar el filtro inmediatamente
  al cambiar el select si mantiene mejor la UX.

### Cierre implementado

- `EmpresaForm` sincroniza responsable/contactos con React Hook Form antes de validar,
  muestra resumen superior en formularios inválidos y mapea `fieldErrors` del API a los
  campos visibles.
- `Crear empresa` muestra `Guardando...` durante la petición y ya no falla de forma
  silenciosa cuando falta información obligatoria.
- Crear/editar Empresa exige nombre, NIT, dirección, ciudad, sede empresa, Zona
  Compensar, gestión, estado, responsable completo, sección Compensar completa y
  profesional asignado.
- Los teléfonos se normalizan removiendo espacios y se rechazan letras, signos o más de
  10 dígitos antes de escribir en Supabase.
- Los contactos adicionales pueden eliminarse; si una fila adicional tiene datos, exige
  mínimo nombre y cargo.
- Inputs críticos de Empresas y Profesionales usan los helpers de `browserAutofill` para
  pedir al navegador que no muestre autocompletados intrusivos.
- En Profesionales, el filtro de estado navega inmediatamente, resetea `page=1` y el
  botón `Filtrar` muestra feedback mientras cambia la URL.

### Alcance y no alcance

- No se toca `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*` ni
  `src/app/api/formularios/*`.
- No se implementa todavía sorting/reordenamiento de columnas ni rediseño completo.
- QA manual de Fase 3/3.1 queda cerrado para avanzar; los hallazgos menores del preview se
  trasladan a Fase 4.

## QA manual post-E2B - Fase 4: Tabla de Empresas

Estado local: implementada. Fase 4 tomó el siguiente bloque operativo del backoffice:
hacer que las tablas activas sean más útiles para gerencia y cerrar hallazgos menores
detectados al final del QA de Fase 3.1.

### Alcance principal

- **Sorting por headers:** los títulos de columnas principales ordenan ascendente y
  descendente. La URL refleja `sort`/`direction` para mantener navegación, refresh y
  paginación consistentes. Aplica hoy a Empresas y Profesionales; el componente queda
  reusable para Asesores, Gestores e Intérpretes cuando esos paneles existan.
- **Filtros por columnas principales:** hacer más claros los filtros básicos de la lista de
  Empresas. Deben servir para operación diaria sin obligar a editar una empresa para
  encontrarla.
- **Reacomodar columnas:** queda opcional dentro de Fase 4. Si crece por persistencia de
  estado o complejidad visual, se separa a mini fase posterior.

### Hallazgos menores diferidos desde Fase 3.1

- **Ciudad con acentos:** entradas como `Bogota` y variantes seguras de ciudades presentes
  en Supabase se normalizan antes de guardar. La solución es conservadora: mapeos conocidos
  y seguros, sin inventar nombres de ciudad ambiguos.
- **Actividad reciente más útil:** la bitácora actual muestra que hubo una edición, pero no
  siempre muestra información suficiente para el usuario. Debe priorizar eventos claros:
  observación registrada, valor relevante, quién lo hizo y cuándo. Para ediciones, mostrar
  cambios importantes sin saturar; por ejemplo campo, valor anterior y nuevo cuando aplique.
- **Guardar observaciones queda en `Guardando...`:** revisar el flujo de editar Empresa cuando
  se guarda una observación. Aunque el evento aparece en actividad reciente, el botón no debe
  quedar bloqueado; debe mostrar éxito, error o completar navegación/refresco.
- **Primer contacto desalineado:** el bloque readonly del primer contacto debe quedar alineado
  visualmente con las columnas de contactos adicionales y con labels consistentes.

### Cierre implementado

- Empresas expone sorting en columnas `Nombre`, `NIT`, `Ciudad`, `Gestión`,
  `Profesional`, `Asesor`, `Estado` y `Última edición`. Default: `updated_at desc`.
- Profesionales agrega sorting server-side en `Nombre`, `Correo`, `Programa`,
  `Antigüedad` y `Usuario login`. Default: `nombre_profesional asc`.
- Los filtros, búsqueda y paginación preservan `sort`/`direction`; un click de header
  resetea `page=1`.
- Ciudad usa mapa ortográfico conservador basado en valores únicos remotos actuales:
  `Bogotá`, `Chía`, `Cajicá`, `Sopó`, `Facatativá`, `Tocancipá`, `Zipaquirá`,
  `Bojacá`, `Fusagasugá`, `Gachancipá`, `Sesquilé` y `Fontibón`.
- Actividad reciente muestra resumen y detalle compacto para observaciones, cambios de
  estado, asignaciones y ediciones relevantes.
- Editar observaciones ya no deja el botón en `Guardando...`: en edición muestra éxito y
  refresca la actividad.
- El primer contacto readonly alinea visualmente sus inputs con contactos adicionales.

### No alcance

- No se toca importación Excel.
- No se rediseña completo el backoffice.
- No se cambia el modelo legacy de columnas de `empresas`.
- No se toca `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*` ni
  `src/app/api/formularios/*`.

## QA manual post-E2B - Fase 5: Coherencia visual backoffice

Estado local: implementada sobre Fase 4. La dirección aprobada es **RECA + acentos
legacy** sólo para `/hub/empresas*`, manteniendo el backoffice compacto y operativo.

### Cierre implementado

- Se creó la capa visual reusable `src/components/backoffice/`:
  `BackofficePageHeader`, `BackofficeSectionCard`, `BackofficeField`,
  `BackofficeBadge`, `BackofficeFeedback`, `BackofficeTableCard` y
  `SortableTableHeader`.
- Home de Empresas usa hero RECA/teal y cards por módulo. Empresas y Profesionales
  quedan habilitados para admin; Asesores, Gestores e Intérpretes siguen visibles
  deshabilitados.
- Listados de Empresas y Profesionales usan header, filtros en card, tabla protagonista,
  badges de alto contraste y empty states consistentes. Sorting, filtros, búsqueda,
  paginación y URLs se preservan.
- Crear/editar Empresa y Crear/editar Profesional usan secciones visuales alineadas a los
  formularios largos existentes, sin cambiar schemas, payloads ni endpoints.
- Detalle, acciones sensibles, contraseña temporal y actividad reciente usan cards y
  feedback de alto contraste.
- Se corrigió bajo contraste visible: texto principal `gray-900`, secundario mínimo
  `gray-600/700`, links RECA oscuros y botones con contraste alto.
- Post-QA visual menor: formularios de Empresa y Profesional incluyen placeholders de
  ejemplo en campos editables para guiar la captura sin escribir datos reales.

### No alcance

- No cambia contratos API, reglas de negocio, rutas ni migraciones.
- No toca el shell general del hub ni `/formularios/*`.
- No agrega columnas móviles ni rediseña la navegación global.

### E2C - Catalogos simples

Debe incluir:

- CRUD reusable para Asesores, Gestores, Interpretes.
- Migracion para llave estable en `gestores`.
- Mantener normalizacion de interpretes.

### E2D - Importacion/saneamiento empresas

Opcional posterior:

- Importar Excel.
- Reportar duplicados.
- Purga/saneamiento asistido.
- Dry-run obligatorio antes de aplicar.

## Decisiones cerradas para E2A

- Todo E2A queda restringido a `inclusion_empresas_admin`.
- `/hub/empresas` es la entrada unica del modulo Empresas. En el futuro renderizara
  contenido distinto por rol/capacidad.
- Para admins, `/hub/empresas` muestra el backoffice gerencial con las 5 secciones
  legacy visibles.
- En E2A solo Empresas queda activa; Profesionales, Asesores, Gestores e Interpretes
  quedan visibles pero deshabilitadas.
- Importar Excel no se trae.
- La accion visible se llama "Eliminar", aunque la implementacion sea soft delete.
- Edicion normal: comentario opcional y diff automatico `antes/despues` en bitacora.
- Cambio de estado: comentario obligatorio.
- El formulario de Empresa solo permite seleccionar profesionales existentes; no crea
  profesionales minimos automaticamente.
- `empresas.profesional_asignado_id` debe referenciar `public.profesionales(id)`.
- `profesional_asignado` y `correo_profesional` se mantienen como snapshot legacy.
- Crear/editar usa paginas completas, no modal.
- La pagina de detalle es editable directamente.
- Listado con paginacion server-side, busqueda y filtros en servidor.
- E2A muestra actividad reciente basica; timeline avanzado queda para E3.

## Preguntas abiertas fuera de E2B

1. En E2C, se debe mostrar `localidad` en Asesores aunque legacy no la muestra?
2. En E2C, para Gestores, se puede imponer `nombre` unico o preferimos agregar `id uuid`?
3. En E3, como se presenta la experiencia de `Profesional Inclusión`: reclamar, soltar, notas, estados y calendario propio.
