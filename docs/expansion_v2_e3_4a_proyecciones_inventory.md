# E3.4a - Inventario de Proyecciones, Servicios y Payloads

**Estado:** cerrado como inventario read-only.
**Fecha:** 2026-05-01.
**Worktree:** `codex/e3-4-calendario-proyecciones`.
**Alcance:** documentacion y analisis; sin UI, APIs, migraciones ni cambios de formularios.

## Resumen Ejecutivo

E3.4a confirma que el sistema de proyecciones debe arrancar con una matriz operativa propia, no exponiendo codigos contables crudos. La tabla `tarifas` contiene la base economica, pero el profesional debe elegir servicios con nombres operativos y campos guiados.

La decision vigente se mantiene:

- una proyeccion representa un solo servicio/proceso;
- la empresa, fecha/hora y duracion estimada son obligatorias;
- cantidad de personas se pide solo cuando el servicio lo justifica;
- numero de seguimiento se pide solo para seguimientos;
- cedulas, nombres de personas y cargo/perfil no son obligatorios en la proyeccion inicial;
- Google Calendar, Google Maps, conciliacion automatica y metricas gerenciales quedan fuera de E3.4b inicial.

La recomendacion para E3.4b es crear una base server-side con tabla/config versionada de servicios proyectables y tabla de proyecciones. La UI calendario queda para E3.4c.

Nota posterior: E3.4a.2 cierra decisiones de contrato que ajustan este inventario preliminar: `cantidad_empresas` sale del modelo inicial porque siempre sera 1, `duracion_minutos` vive solo en proyecciones/calendario, `projection_id` solo se copia a `payload_normalized` cuando el acta nace desde calendario, e interprete se modela como segunda linea vinculada cuando el servicio principal lo requiere.

## Evidencia Revisada

Las consultas fueron read-only y limitadas. No se copiaron payloads completos ni datos sensibles al documento.

| Fuente | Evidencia | Resultado |
|---|---|---|
| `public.tarifas` | 101 filas leidas con columnas minimas | 95 codigos operativos de Inclusion Laboral y 6 codigos de hora profesional/director. |
| `formatos_finalizados_il` | 412 registros de metadata agregada | Hay evidencia suficiente para cruzar proyecciones contra formatos finalizados por empresa, tipo y fecha. |
| `formatos_finalizados_il.nombre_formato` | Conteo por nombre de formato | Existen variantes historicas que deben normalizarse, igual que en ciclo de vida. |
| Motor ODS | Lectura de reglas de tarifa | El motor clasifica por tipo documental, descripcion, modalidad, cantidad, duracion o tamano segun servicio. |
| Payload normalized | Inventario de rutas confiables reportadas por formulario | Hay llaves utiles de empresa, fecha, profesional, cargo, participantes y evidencia. |

Nota operativa: algunas consultas directas por CLI tocaron limite temporal de autenticacion del pooler remoto. Para continuar se uso el script del repo `npm run supabase:table` desde el checkout principal con columnas minimas y `limit`.

## Inventario de Tarifas

| Codigos | Servicio contable | Datos que cambian tarifa | Decision E3.4 |
|---|---|---|---|
| 1-36 | Presentacion/promocion del programa | familia RECA/Compensar, modalidad, cantidad de empresas | Incluir con cautela. Para E3.4b preferir una proyeccion por empresa; si gerencia necesita jornadas grupales, disenar despues. |
| 37-42 | Reactivacion/mantenimiento del programa | familia RECA/Compensar, modalidad | Incluir. Es un servicio claro y proyectable. |
| 43-46 | Evaluacion de accesibilidad | modalidad/geografia, empresa hasta 50 o desde 51 trabajadores | Incluir solo para Compensar. Preguntar tamano de empresa si no existe dato confiable. |
| 47-49 | Condiciones de la vacante / levantamiento de perfil | modalidad | Incluir. Una proyeccion equivale a un perfil/cargo esperado. |
| 50-61 | Seleccion incluyente | modalidad, cantidad de participantes | Incluir. Preguntar cantidad esperada; no pedir cedulas. |
| 62-73 | Contratacion incluyente | modalidad, cantidad de participantes | Incluir. Preguntar cantidad esperada; no pedir cedulas. |
| 74-76 | Induccion organizacional | modalidad | Incluir para Compensar. Proceso de empresa. |
| 77-79 | Induccion operativa | modalidad | Incluir. No exigir cedula en proyeccion inicial. |
| 80-82 | Sensibilizacion | modalidad | Incluir para Compensar. Proceso de empresa posterior a contratacion. |
| 83-85 | Seguimiento y acompanamiento | modalidad | Incluir. Preguntar numero de seguimiento. |
| 86-90 | Servicio de interpretacion LSC / visita fallida LSC | horas, cantidad de interpretes o visita fallida | Incluir como linea vinculada cuando el servicio principal requiere interprete; no como servicio principal suelto en calendario inicial. |
| 91-92 | Visita fallida SIL | modalidad | No incluir como proyeccion inicial. Conviene modelarlo como resultado/estado de una proyeccion. |
| 93-95 | Visita adicional / caso especial | modalidad | Revisar con gerencia antes de incluir. Puede ser excepcion operativa, no flujo comun. |
| 96-101 | Hora director / hora profesional | rol y modalidad | Excluir de la UI profesional inicial. Es base contable/admin, no servicio proyectable directo. |

## Senales del Motor ODS

El motor ODS no deberia ser la UI del profesional. Si se reutiliza su logica, debe quedar detras de un catalogo operativo.

| Categoria ODS | Dato minimo que necesita | Campo recomendado en proyeccion |
|---|---|---|
| `program_presentation` | gestion/familia, modalidad, cantidad de empresas | `familia_gestion`, `modalidad`, `cantidad_empresas` si se permite jornada grupal. |
| `program_reactivation` | gestion/familia y modalidad | `familia_gestion`, `modalidad`. |
| `accessibility_assessment` | modalidad y tamano de empresa | `modalidad`, `tamano_empresa_bucket`. |
| `vacancy_review` | modalidad | `modalidad`. |
| `inclusive_selection` | modalidad y cantidad de personas | `modalidad`, `cantidad_personas`. |
| `inclusive_hiring` | modalidad y cantidad de personas | `modalidad`, `cantidad_personas`. |
| `organizational_induction` | modalidad | `modalidad`. |
| `operational_induction` | modalidad | `modalidad`. |
| `sensibilizacion` | modalidad | `modalidad`. |
| `follow_up` | modalidad y tipo normal/especial | `modalidad`, `numero_seguimiento`, posible `tipo_seguimiento`. |
| `interpreter_service` | duracion o visita fallida | `duracion_minutos`, posible `visita_fallida`. Diferir. |

## Inventario de Formatos Finalizados

Conteo agregado por `nombre_formato` con evidencia existente:

| Nombre de formato | Registros | Uso esperado |
|---|---:|---|
| Seleccion Incluyente | 61 | Confirmar seleccion y cantidad real de participantes. |
| Revision Condicion | 46 | Variante historica de condiciones/vacante. |
| Presentacion del Programa | 46 | Confirmar presentacion. |
| Condiciones de Vacante | 41 | Crear evidencia de perfil/cargo. |
| Contratacion Incluyente | 36 | Confirmar contratacion y cantidad real. |
| Proceso de Seleccion Incluyente | 32 | Variante historica de seleccion. |
| Presentacion Programa | 29 | Variante historica de presentacion. |
| Servicio de Interpretacion LSC | 26 | Servicio transversal, revisar fuera del calendario inicial. |
| Induccion Operativa | 24 | Confirmar induccion por persona o grupo segun payload. |
| Evaluacion Accesibilidad | 20 | Confirmar evaluacion para Compensar. |
| Servicio de Interpretacion LSC | 14 | Variante con acento en nombre historico. |
| Induccion Organizacional | 14 | Confirmar proceso de empresa Compensar. |
| Sensibilizacion | 9 | Confirmar sensibilizacion. |
| Evaluacion de Accesibilidad | 7 | Variante historica de evaluacion. |
| Seguimiento #1 | 4 | Confirmar seguimiento individual; muestra baja. |
| Reactivacion Programa | 1 | Confirmar reactivacion. |
| Seguimiento #2 | 1 | Confirmar seguimiento individual; muestra baja. |
| Seguimiento #3 | 1 | Confirmar seguimiento individual; muestra baja. |

## Rutas JSON Confiables

Estas rutas se deben tratar como evidencia, no como contrato definitivo de captura. E3.4b puede usarlas para conciliar o sugerir datos, pero no debe fallar si faltan.

| Dato | Ruta preferida | Fallback |
|---|---|---|
| NIT empresa | `payload_normalized.parsed_raw.nit_empresa` | columnas de `formatos_finalizados_il` si existen. |
| Nombre empresa | `payload_normalized.parsed_raw.nombre_empresa` | columna `nombre_empresa` cuando exista. |
| Caja/tipo empresa | `payload_normalized.parsed_raw.caja_compensacion` | datos maestros de `empresas`. |
| Fecha operativa | `payload_normalized.parsed_raw.fecha_servicio` | `fecha`, `fecha_ingreso`, `finalizado_at_colombia`, `created_at`. |
| Profesional | `payload_normalized.parsed_raw.nombre_profesional` | autor/finalizador si existe. |
| Cargo/perfil | `payload_normalized.parsed_raw.cargo_objetivo` | `cargo_servicio`, `cargo`. |
| Personas | `payload_normalized.parsed_raw.participantes[]` | rutas especificas por formulario. |
| Cedula persona | `participantes[].cedula_usuario` | `linked_person_cedula` en induccion operativa. |
| Nombre persona | `participantes[].nombre_usuario` | `linked_person_name`. |
| Numero seguimiento | `seguimiento_numero`, `seguimiento_servicio` | inferencia por orden solo como fallback. |
| Evidencia | `pdf_link`, `sheet_link`, `acta_ref` | links del registro finalizado. |

## Matriz Servicio / Proyeccion / Payload

| Servicio operativo | Entra E3.4b | Datos que pide la proyeccion | Datos derivables | Confirmacion por finalizado | Gaps |
|---|---|---|---|---|---|
| Presentacion del programa | Si | empresa, fecha/hora, duracion, modalidad, familia gestion | profesional, tarifa vigente | presentacion / variantes | decidir si se permiten jornadas grupales o solo una empresa. |
| Reactivacion | Si | empresa, fecha/hora, duracion, modalidad, familia gestion | profesional, tarifa vigente | reactivacion | poca muestra historica. |
| Evaluacion de accesibilidad | Si, Compensar | empresa, fecha/hora, duracion, modalidad, tamano empresa | tipo Compensar desde empresa si existe | evaluacion / variantes | tamano puede no existir en maestros. |
| Condiciones de la vacante | Si | empresa, fecha/hora, duracion, modalidad, cantidad de perfiles esperados opcional | profesional, tarifa vigente | condiciones / revision condicion | cargo real llega en acta, no exigir en proyeccion. |
| Seleccion incluyente | Si | empresa, fecha/hora, duracion, modalidad, cantidad personas | profesional, tarifa vigente | seleccion / proceso seleccion | cedulas no se piden antes; cantidad puede ser estimada. |
| Contratacion incluyente | Si | empresa, fecha/hora, duracion, modalidad, cantidad personas | profesional, tarifa vigente | contratacion | no debe asumirse mayor que seleccion sin revision. |
| Sensibilizacion | Si, Compensar | empresa, fecha/hora, duracion, modalidad | profesional, tarifa vigente | sensibilizacion | etapa ocurre despues de contratacion. |
| Induccion organizacional | Si, Compensar | empresa, fecha/hora, duracion, modalidad | profesional, tarifa vigente | induccion organizacional | proceso de empresa, no por persona. |
| Induccion operativa | Si | empresa, fecha/hora, duracion, modalidad, cantidad personas opcional | profesional, tarifa vigente | induccion operativa | persona puede no conocerse al proyectar. |
| Seguimiento | Si | empresa, fecha/hora, duracion, modalidad, numero seguimiento | profesional, tarifa vigente | seguimiento #N | payload actual de seguimientos es limitado; mejorar captura futura. |
| Interprete LSC | Si, como linea vinculada | proyeccion padre, cantidad de interpretes, horas proyectadas | profesional, tarifa vigente | servicio interpretacion | horas reales pueden diferir y se toman del acta de interprete. |
| Visita fallida | Diferir | depende de proyeccion original | estado/resultado de proyeccion | visita fallida | conviene como resultado, no como servicio proyectado normal. |
| Visita adicional / caso especial | Revisar | empresa, fecha/hora, duracion, justificacion | profesional, tarifa vigente | evidencia especial | requiere criterio de gerencia. |
| Hora director/profesional | No | ninguno para profesional | contabilidad | no aplica | no exponer como opcion al profesional. |

## Campos Recomendados para E3.4b

Campos base de `proyecciones`:

- `id`
- `empresa_id`
- `profesional_id`
- `service_key`
- `codigo_servicio_resuelto` nullable e interno
- `inicio_at`
- `duracion_minutos`
- `modalidad`
- `cantidad_personas`
- `numero_seguimiento`
- `tamano_empresa_bucket`
- `familia_gestion`
- `estado`
- `observaciones`
- `created_at`
- `updated_at`

Campos de catalogo/config de servicios:

- `service_key`
- `nombre_operativo`
- `categoria_ods`
- `etapa_ciclo_vida`
- `formato_confirmacion`
- `requiere_cantidad_personas`
- `requiere_numero_seguimiento`
- `requiere_tamano_empresa`
- `aplica_solo_compensar`
- `permitir_calendario`
- `orden`
- `activo`

No pedir en la proyeccion inicial:

- cedulas;
- nombres de personas;
- cargo/perfil obligatorio;
- codigo contable manual;
- datos de Google Calendar;
- direccion o ubicacion para Maps.

## Mejoras Futuras a `payload_normalized`

Estas mejoras no se implementan en E3.4a, pero conviene tenerlas como backlog tecnico porque no cargan al profesional si se derivan server-side.

| Campo sugerido | Beneficio |
|---|---|
| `document_kind` canonico | Simplifica ODS, calendario y ciclo de vida. |
| `empresa_id` | Evita matching por NIT/nombre. |
| `modalidad_servicio` canonica | Reduce ambiguedad de tarifa. |
| `cantidad_personas` | Evita contar participantes en ODS/calendario. |
| `cantidad_empresas` | Soporta presentaciones grupales si se aprueban. |
| `tamano_empresa_bucket` | Resuelve evaluacion de accesibilidad. |
| `familia_gestion` | Diferencia RECA/Compensar sin inferir texto. |
| `duracion_minutos` | Ayuda a calendario e interprete LSC. |
| `projection_id` | Permite conciliacion directa entre proyeccion y formato finalizado. |

## Decisiones Pendientes para E3.4b

1. **Presentaciones grupales:** recomendacion inicial: una proyeccion por empresa. Si gerencia necesita jornada grupal, agregar modelo especifico despues.
2. **Tamano de empresa:** para evaluacion de accesibilidad, decidir si se pregunta siempre o se deriva de datos maestros cuando exista.
3. **Seguimientos 4-6:** solo aplican Compensar, pero la evidencia historica actual tiene muestra muy baja. No bloquear E3.4b por eso.
4. **Interprete LSC:** tratar como segunda linea vinculada cuando el servicio principal lo requiere, con cantidad de interpretes y horas proyectadas.
5. **Visita fallida:** modelar como resultado/estado de una proyeccion, no como servicio de agenda principal.
6. **Tarifas editables:** la matriz puede vivir en Supabase, pero no deberia ser editable por gerencia hasta tener auditoria, validaciones y pruebas.

## Recomendacion para E3.4b

E3.4b debe construir solo la base server-side:

1. Crear tabla/config versionada de servicios proyectables.
2. Crear tabla de proyecciones con una fila por servicio.
3. Crear dominio y schemas Zod para crear/editar/cancelar proyecciones.
4. Crear endpoints server-side protegidos por rol profesional/admin.
5. Mantener codigos de tarifa como resolucion interna o sugerida, no como input visible.
6. Dejar Google Calendar, Maps, conciliacion automatica, metricas gerenciales y contabilidad fuera de la primera implementacion.

E3.4c debe construir la UI calendario sobre esa base.

## Cierre

E3.4a no cambia datos ni comportamiento. Su valor es reducir incertidumbre antes de crear tablas y UI. La fase confirma que proyecciones, ODS y ciclo de vida comparten muchas llaves, pero tambien confirma que hay que separar catalogo operativo de codigos contables para no cargar al profesional con decisiones de tarifa.
