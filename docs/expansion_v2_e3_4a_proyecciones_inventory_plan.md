# E3.4a - Inventario de Proyecciones, Servicios y Payloads

**Estado:** ejecutado; ver inventario en `docs/expansion_v2_e3_4a_proyecciones_inventory.md`.
**Fecha:** 2026-05-01.
**Worktree:** `codex/e3-4-calendario-proyecciones`.
**No tocar:** `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*`, `src/app/api/formularios/*`, `src/hooks/use*FormState*`.

## Summary

E3.4a prepara el calendario y las proyecciones semanales sin construir todavia UI, API, migraciones ni cambios de formularios. Es una fase read-only de inventario y diseno para entender como se conectan cuatro fuentes: tabla `tarifas`, motor ODS, `formatos_finalizados_il.payload_normalized` y el futuro calendario profesional.

La decision de negocio aprobada es:

- una proyeccion representa un solo servicio/proceso;
- el calendario empieza interno; Google Calendar y Google Maps quedan para despues;
- el selector de proceso debe ser un catalogo operativo curado, no una exposicion directa de codigos contables;
- la matriz operativa puede vivir en tabla Supabase a futuro, pero primero se disena con control de version y sin UI editable;
- E3.4a solo inventaria y documenta decisiones; no cambia comportamiento productivo.

## Objetivos

1. Inventariar los codigos vigentes de `tarifas` relevantes para Inclusion Laboral.
2. Mapear cada codigo/servicio a un nombre operativo amigable para profesionales.
3. Revisar que datos exige o infiere hoy el motor ODS para cada servicio.
4. Revisar muestras reales de `payload_normalized` por formulario para saber que datos ya existen.
5. Definir que debe pedir una proyeccion y que puede derivar el sistema.
6. Identificar campos que conviene agregar a `payload_normalized` en fases futuras sin cargar al profesional.
7. Entregar una matriz que permita disenar E3.4b/E3.4c con menos incertidumbre.

## Fuera de Alcance

- No crear tabla de proyecciones.
- No crear UI de calendario.
- No crear endpoints nuevos.
- No cambiar formularios.
- No cambiar `payload_normalized`.
- No implementar conciliacion contra formatos finalizados.
- No implementar metricas gerenciales.
- No integrar Google Calendar ni Google Maps.
- No crear UI editable para la matriz de servicios.

## Fuentes a Revisar

### 1. Tabla `tarifas`

Revisar solo columnas necesarias:

- `codigo_servicio`
- `referencia_servicio`
- `programa_servicio`
- `descripcion_servicio`
- `modalidad_servicio`
- `valor_base`
- `vigente_desde`
- `vigente_hasta`

Preguntas del inventario:

- Que codigos pertenecen realmente a Inclusion Laboral.
- Cuales son servicios proyectables por profesionales.
- Cuales son solo contables o derivados.
- Si hay variantes por modalidad, duracion, cantidad de personas o seguimiento.
- Si la vigencia cambia la forma de seleccionar el servicio.

### 2. Motor ODS

Revisar el motor actual en `src/lib/ods/rules-engine/` y documentar:

- Que campos usa para elegir tarifa.
- Que campos infiere desde texto o payload.
- Que decisiones son fragiles o ambiguas.
- Que dato podria guardar una proyeccion para simplificar ODS futuro.
- Que servicios tienen buckets por cantidad de personas.
- Que servicios dependen de modalidad, duracion, visita fallida u otro criterio.

### 3. `payload_normalized` de formatos finalizados

Revisar muestras reales, acotadas y sin copiar datos sensibles completos, para:

- `presentacion`
- `evaluacion`
- `condiciones-vacante`
- `seleccion`
- `contratacion`
- `sensibilizacion`
- `induccion-organizacional`
- `induccion-operativa`
- `seguimientos`
- otros formatos que aparezcan vinculados a tarifas.

Preguntas por formulario:

- Llaves de empresa disponibles: NIT, nombre, id.
- Fecha operativa confiable.
- Profesional/autor.
- Modalidad o tipo de visita.
- Servicio/proceso que alimenta.
- Cantidad de personas, cuando aplique.
- Cargo/perfil, cuando aplique.
- Cedulas/personas, cuando aplique.
- Numero de seguimiento, cuando aplique.
- Duracion u horas, si existen.
- Links o referencias utiles.
- Campos derivables sin pedir mas trabajo al profesional.
- Gaps que limitan proyecciones, ODS o ciclo de vida.

### 4. Calendario/proyeccion futura

Disenar la proyeccion como entidad operativa, pero sin implementarla todavia.

Campos candidatos:

- `empresa_id`
- `profesional_id`
- `codigo_servicio`
- `nombre_operativo`
- `fecha_inicio`
- `fecha_fin` o `duracion_minutos`
- `cantidad_personas`
- `numero_seguimiento`
- `modalidad`
- `observaciones`
- `estado`
- `source`
- `created_at`
- `updated_at`

## Matriz Entregable

E3.4a debe producir una matriz con una fila por servicio operativo:

| Campo | Descripcion |
|---|---|
| `codigo_servicio` | Codigo de tarifa o marcador si no hay tarifa directa. |
| `nombre_operativo` | Nombre claro para el profesional. |
| `etapa_ciclo_vida` | Etapa relacionada del ciclo de vida. |
| `formulario_relacionado` | Formulario que normalmente confirma/finaliza el servicio. |
| `datos_para_proyeccion` | Campos que debe capturar el calendario. |
| `datos_derivables` | Empresa, profesional, fecha, tarifa vigente u otros. |
| `datos_en_payload_actual` | Rutas JSON confiables ya existentes. |
| `gaps_payload` | Datos ausentes o inconsistentes. |
| `facil_de_preguntar` | Datos que el profesional puede aportar sin carga excesiva. |
| `no_pedir_ahora` | Datos deseables pero no realistas para E3.4. |
| `conciliacion` | Como se podria cruzar proyeccion vs formato finalizado. |
| `impacto_ODS` | Como ayuda a codigo/tarifa/contabilidad futura. |
| `decision` | Incluir en E3.4b, diferir, o revisar con gerencia. |

## Servicios Esperados a Clasificar

La lista final debe salir de `tarifas`, pero el inventario debe cubrir al menos:

- Presentacion del programa.
- Reactivacion.
- Evaluacion de accesibilidad.
- Condiciones de la vacante / levantamiento de perfil.
- Seleccion incluyente.
- Contratacion incluyente.
- Sensibilizacion.
- Induccion organizacional.
- Induccion operativa.
- Seguimientos.
- Interprete LSC, si aparece como servicio transversal o tarifa asociada.
- Visita fallida, si afecta tarifa/proyeccion.

## Reglas de Diseno Aprobadas

- Una proyeccion no agrupa varios servicios.
- La empresa es obligatoria.
- La fecha/hora y duracion estimada son obligatorias para calendario.
- Cantidad de personas se pide solo cuando el servicio lo justifica.
- Numero de seguimiento se pide solo para seguimientos.
- Cedulas, perfiles y nombres de personas no son obligatorios en proyeccion inicial.
- Los datos que ya existan en `payload_normalized` deben aprovecharse antes de pedir trabajo extra.
- La matriz operativa puede convertirse en tabla Supabase versionada, pero no editable por gerencia hasta tener validaciones y auditoria.

## Metodo de Ejecucion

E3.4a debe usar consultas read-only, limitadas y con columnas minimas.

Consultas permitidas:

- conteos por nombre de formato o servicio;
- muestras limitadas por formulario;
- lectura acotada de `tarifas`;
- lectura de archivos de motor ODS y tests;
- lectura de docs de ciclo de vida existentes.

No se deben hacer:

- mutaciones SQL;
- migraciones;
- `select *` masivo;
- export de payloads completos a Markdown;
- cambios de comportamiento en formularios;
- cambios de ODS.

## Entregables

1. Inventario de `tarifas` y clasificacion de servicios proyectables.
2. Inventario de campos usados por el motor ODS.
3. Inventario de `payload_normalized` por formulario.
4. Matriz servicio/proyeccion/tarifa/formulario/campos.
5. Lista de mejoras futuras a `payload_normalized`, separadas por prioridad.
6. Recomendacion para E3.4b:
   - tabla de proyecciones;
   - tabla/config de servicios;
   - endpoints;
   - UI minima posterior.

## Criterios de Cierre

- La matriz cubre todos los servicios relevantes de Inclusion Laboral encontrados en `tarifas`.
- Cada servicio indica si entra o no entra a proyecciones iniciales.
- Cada servicio define que datos pide al profesional y que datos deriva el sistema.
- Cada formulario revisado tiene rutas JSON utiles o gaps documentados.
- Las decisiones futuras quedan separadas de la evidencia.
- No hay cambios funcionales ni de base de datos.

## Riesgos a Cuidar

- Mezclar calendario con contabilidad antes de tener reglas claras.
- Exponer codigos contables crudos al profesional.
- Pedir cedulas/personas/perfiles en proyeccion y crear carga operativa extra.
- Inferir tarifas de forma agresiva sin evidencia.
- Hacer cambios de `payload_normalized` durante el inventario.
- Descargar o documentar datos sensibles completos.

## Fases Posteriores Propuestas

### E3.4b - Modelo y API de Proyecciones

Crear migracion, dominio y endpoints server-side para guardar proyecciones semanales con base en la matriz aprobada.

### E3.4c - UI Calendario Profesional

Implementar `/hub/empresas/calendario` con vistas mensual, semanal y diaria, crear/editar/cancelar proyecciones y selector operativo de servicios.

### E3.4d - Conciliacion con Finalizados

Cruzar proyecciones contra `formatos_finalizados_il` para marcar cumplidas, no cumplidas o finalizadas sin proyeccion.

### E3.4e - Visibilidad Gerencial y Base Contable

Agregar vista de gerencia con carga semanal, cumplimiento y datos que preparen el modulo contable/ODS futuro.
