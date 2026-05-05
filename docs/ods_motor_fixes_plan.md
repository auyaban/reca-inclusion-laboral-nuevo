# Plan de fixes priorizados del motor ODS

Este documento cierra Tanda 3a discovery. Convierte los gaps de
`docs/ods_motor_gaps.md` en sub-issues incrementales ejecutables para el
motor de codigos ODS. No implementa cambios, no crea issues en GitHub y no
modifica codigo.

Regla de diseno transversal: ningun fix debe bloquear importacion,
finalizacion ni guardado de ODS si el nuevo branch falla o si llega payload
viejo. Los cambios de nombres se disenan como alias backwards-compatible, sin
migrar filas historicas ni romper payloads ya almacenados en
`formatos_finalizados_il`.

## Resumen ejecutivo

| Orden | Sub-issue propuesto | Gap | Prioridad | Estimacion | Dependencias |
|---:|---|---|---|---|---|
| 1 | `fix(ods): aceptar alias lsc_interpretation/interpreter_service en motor LSC` | G2 | Alta | 2-4h | Ninguna |
| 2 | `fix(ods): leer aliases backwards-compatible de horas LSC` | G3 | Alta | 2-4h | G2 mergeado |
| 3 | `fix(ods): usar modalidad_interprete para modalidad LSC` | G7 incremental | Alta | 1-2h | Ninguna |
| 4 | `fix(ods): aceptar alias evaluacion_accesibilidad/accessibility_assessment` | G1 | Alta | 2-4h | Ninguna |
| 5 | `fix(ods): ordenar tarifas por vigencia en import y terminar` | G4 | Media-alta | 1-2h | Ninguna |
| 6 | `fix(ods): evitar fallback today cuando fecha_servicio pueda parsearse antes` | G5 | Media | 2-6h | Ninguna |
| 7 | `fix(ods): mapear visita fallida web a is_fallido con fallback legacy` | G10 | Media | 1-2h | Ninguna |
| 8 | `fix(ods): mejorar inferencia de modalidad con senales existentes` | G6 incremental | Media | 4-6h | Ninguna |
| 9 | `fix(ods): reforzar participantes import-only para buckets seleccion/contratacion` | G11 | Media | 2-6h | Ninguna |

Backlog post-3a:

- G8 `tamano_empresa`: feature nueva; requiere captura/campo nuevo.
- G9 `cantidad_empresas`: feature nueva; requiere captura/campo nuevo.
- G6 parte feature: modalidad obligatoria/capturada en fuentes que no la exponen.
- G7 parte feature: modelo LSC 1:N; corresponde a #109.

## Fix 1 - Alias LSC `lsc_interpretation` / `interpreter_service`

**Titulo de sub-issue:** `fix(ods): aceptar alias lsc_interpretation/interpreter_service en motor LSC`

**Gap F3:** G2. Prioridad alta, incremental.

**Estimacion:** 2-4h.

**Problema:** las actas web de interprete LSC emiten
`document_kind = "lsc_interpretation"`, pero el motor solo activa la rama LSC
con `document_kind === "interpreter_service"`. Como el pipeline conserva el
`document_kind` del payload, el motor cae a fallback low.

**Evidencia:**

- Builder web LSC: `src/lib/finalization/interpreteLscPayload.ts:147`.
- Rama motor LSC: `src/lib/ods/rules-engine/rulesEngine.ts:404`.
- Pipeline prefiere `payload_normalized.document_kind`:
  `src/lib/ods/import/pipeline.ts:257` y
  `src/lib/ods/import/pipeline.ts:261`.
- Fallback low general: `src/lib/ods/rules-engine/rulesEngine.ts:627`.

**Diseno del fix:**

- Commit 1: agregar un helper de alias en el motor, por ejemplo
  `isInterpreterServiceKind(documentKind)`, que acepte
  `interpreter_service` y `lsc_interpretation`.
- Usar ese helper solo en la rama LSC. No cambiar ramas no relacionadas.
- Commit 2: cambiar el builder web LSC para emitir el nombre canonico
  `interpreter_service`.
- Mantener `lsc_interpretation` como alias indefinido durante la transicion;
  no migrar filas historicas.

**Archivos probables:**

- `src/lib/ods/rules-engine/rulesEngine.ts`
- `src/lib/ods/rules-engine/rulesEngine.test.ts`
- `src/lib/finalization/interpreteLscPayload.ts`
- `src/lib/finalization/interpreteLscPayload.test.ts`

**Fallback obligatorio:**

- Payload viejo con `lsc_interpretation` debe seguir activando la rama LSC.
- Payload nuevo con `interpreter_service` debe activar la misma rama.
- `document_kind` desconocido debe conservar el fallback low actual, sin throw y
  sin bloquear finalizacion.
- Coordinacion con G3: durante la ventana entre merge de este fix y merge de
  Fix 2, payloads web LSC entraran a la rama correcta pero pueden no resolver
  valor por horas si solo traen aliases web. Eso no rompe ODS ni importacion; es
  degradacion equivalente al fallback previo. Recomendacion operativa: desplegar
  Fix 1 y Fix 2 en sesiones consecutivas o aceptar conscientemente esa ventana.

**Test no-fantasma propuesto:**

- Caso principal: `analysis.document_kind = "lsc_interpretation"` con senales
  LSC validas y tarifa disponible debe retornar sugerencia con codigo LSC.
- Si se revierte el helper de alias, este test falla con fallback low o sin
  `codigo_servicio`.

**Test de fallback propuesto:**

- `analysis.document_kind = "interpreter_service"` sigue funcionando.
- `analysis.document_kind = "lsc_legacy_desconocido"` no lanza; retorna fallback
  low como hoy.

**Restricciones:**

- No borrar soporte para `lsc_interpretation`.
- No migrar `payload_normalized` historico.
- No tocar el modelo LSC 1:N de #109.

## Fix 2 - Aliases backwards-compatible de horas LSC

**Titulo de sub-issue:** `fix(ods): leer aliases backwards-compatible de horas LSC`

**Gap F3:** G3. Prioridad alta, incremental. Depende de Fix 1 mergeado.

**Estimacion:** 2-4h.

**Problema:** el builder web emite horas LSC como `sumatoria_horas` y
`sabana.horas`; el motor lee `sumatoria_horas_interpretes` o
`total_horas_interprete`. Con Fix 1 la rama LSC se activa, pero el valor base
por horas sigue incompleto si el motor no reconoce los nombres web.

**Evidencia:**

- Web emite `sumatoria_horas`: `src/lib/finalization/interpreteLscPayload.ts:132`.
- Web emite `sabana.horas`: `src/lib/finalization/interpreteLscPayload.ts:133`.
- Motor lee nombres import-only:
  `src/lib/ods/rules-engine/rulesEngine.ts:421`.

**Diseno del fix:**

- Centralizar la lectura de horas LSC en un helper pequeno, por ejemplo
  `readInterpreterHoursValue(analysis)`.
- Orden de preferencia:
  `sumatoria_horas_interpretes`, `total_horas_interprete`,
  `sumatoria_horas`, `sabana.horas`.
- Mantener la logica actual de `interpreterTarifaFromHours`; el helper solo
  decide que valor pasarle.
- No renombrar payload viejo ni cambiar el builder en este sub-issue salvo que
  sea necesario para tests.

**Archivos probables:**

- `src/lib/ods/rules-engine/rulesEngine.ts`
- `src/lib/ods/rules-engine/rulesEngine.test.ts`

**Fallback obligatorio:**

- Si ninguno de los aliases existe, usar el path actual de texto
  `interpreterTarifaFromText`.
- Si el valor existe pero tiene shape invalido, no lanzar; continuar con texto
  y fallback low si tampoco hay match.
- Si existen alias canonico y legacy, preferir el canonico.

**Test no-fantasma propuesto:**

- Con `document_kind = "interpreter_service"` y `sumatoria_horas = "4:00"`,
  el motor debe elegir tarifa LSC por horas.
- Si se revierte el helper de aliases, el test falla porque el motor no usa
  `sumatoria_horas`.

**Test de fallback propuesto:**

- Con `sabana: { horas: "4:00" }` tambien debe elegir tarifa por horas.
- Con `sumatoria_horas = {}` no debe lanzar; debe usar texto o fallback low.

**Restricciones:**

- No modificar schema de `payload_normalized`.
- No tocar #109 ni modelar multiples interpretes.
- No eliminar soporte para nombres import-only actuales.

## Fix 3 - Modalidad LSC desde `modalidad_interprete`

**Titulo de sub-issue:** `fix(ods): usar modalidad_interprete para modalidad LSC`

**Gap F3:** G7 parte incremental. Prioridad alta, incremental.

**Estimacion:** 1-2h.

**Problema:** el payload web LSC usa `modalidad_profesional_reca` como
`modalidad_servicio`, aunque tambien conserva `modalidad_interprete`. Si ambas
difieren, el motor compara/sugiere la modalidad del actor equivocado.
Este fix incremental cambia el campo usado por el builder web. Es independiente
del modelo LSC 1:N de #109; cuando #109 se ejecute, este fix puede quedar
obsoleto, pero aporta valor mientras los actos LSC actuales sigan modelados como
1 proceso por acta.

**Evidencia:**

- `buildBaseParsedRaw` recibe `section1Data.modalidad_profesional_reca`:
  `src/lib/finalization/interpreteLscPayload.ts:120`.
- El payload conserva `modalidad_interprete`:
  `src/lib/finalization/interpreteLscPayload.ts:126`.
- El motor usa la modalidad de la tarifa/servicio LSC:
  `src/lib/ods/rules-engine/rulesEngine.ts:390`.

**Diseno del fix:**

- Cambiar el builder LSC para que la modalidad base del servicio use
  `section1Data.modalidad_interprete` cuando exista.
- Conservar `modalidad_profesional_reca` como metadata adicional.
- No cambiar formularios, validaciones ni UI.

**Archivos probables:**

- `src/lib/finalization/interpreteLscPayload.ts`
- `src/lib/finalization/interpreteLscPayload.test.ts`

**Fallback obligatorio:**

- Si `modalidad_interprete` esta vacia o ausente en payload viejo, usar
  `modalidad_profesional_reca` como fallback para preservar flujo actual.
- Si ambas faltan, mantener el comportamiento actual de modalidad vacia y no
  bloquear finalizacion.

**Test no-fantasma propuesto:**

- Cuando `modalidad_interprete = "Virtual"` y
  `modalidad_profesional_reca = "Presencial"`, el payload normalizado debe
  exponer modalidad de servicio `"Virtual"`.
- Si se revierte el cambio, el test falla con `"Presencial"`.

**Test de fallback propuesto:**

- Payload legacy sin `modalidad_interprete` pero con
  `modalidad_profesional_reca` debe seguir produciendo modalidad, sin throw.

**Restricciones:**

- #109 modelo LSC 1:N queda fuera de scope.
- Este fix puede quedar obsoleto cuando #109 reescriba el modelo, pero aporta
  valor mientras el flujo actual sea 1 proceso por acta.

## Fix 4 - Alias evaluacion `evaluacion_accesibilidad` / `accessibility_assessment`

**Titulo de sub-issue:** `fix(ods): aceptar alias evaluacion_accesibilidad/accessibility_assessment`

**Gap F3:** G1. Prioridad alta, incremental.

**Estimacion:** 2-4h.

**Problema:** el builder web de evaluacion emite `evaluacion_accesibilidad`,
pero el motor solo tiene rama `accessibility_assessment`. El pipeline conserva
el kind del payload, por lo que las evaluaciones web finalizadas caen a
fallback low.

**Evidencia:**

- Builder evaluacion: `src/lib/finalization/evaluacionPayload.ts:61`.
- Pipeline conserva el kind del payload:
  `src/lib/ods/import/pipeline.ts:257` y
  `src/lib/ods/import/pipeline.ts:261`.
- Rama motor: `src/lib/ods/rules-engine/rulesEngine.ts:601`.
- Fallback general: `src/lib/ods/rules-engine/rulesEngine.ts:627`.

**Diseno del fix:**

- Agregar helper de alias, por ejemplo `isAccessibilityAssessmentKind`.
- Motor acepta `accessibility_assessment` y `evaluacion_accesibilidad`.
- Cambiar builder web a emitir `accessibility_assessment` solo despues de que
  el motor acepte ambos.
- Mantener soporte indefinido para payload viejo.

**Archivos probables:**

- `src/lib/ods/rules-engine/rulesEngine.ts`
- `src/lib/ods/rules-engine/rulesEngine.test.ts`
- `src/lib/finalization/evaluacionPayload.ts`
- `src/lib/finalization/evaluacionPayload.test.ts`

**Fallback obligatorio:**

- Payload viejo `evaluacion_accesibilidad` debe activar la rama.
- Payload nuevo `accessibility_assessment` debe activar la rama.
- Kind desconocido mantiene fallback low sin bloquear.

**Test no-fantasma propuesto:**

- `analysis.document_kind = "evaluacion_accesibilidad"` con tarifa de
  accesibilidad debe retornar codigo/valor de accesibilidad.
- Si se revierte el alias, cae a fallback low y el test falla.

**Test de fallback propuesto:**

- `accessibility_assessment` sigue funcionando.
- Evaluacion sin `tamano_empresa` sigue usando el default actual `hasta_50`
  hasta que G8 tenga feature propia.

**Restricciones:**

- No agregar campo `tamano_empresa` en este sub-issue.
- No migrar payloads historicos.

## Fix 5 - Orden deterministico de tarifas en import y terminar

**Titulo de sub-issue:** `fix(ods): ordenar tarifas por vigencia en import y terminar`

**Gap F3:** G4. Prioridad media-alta, incremental.

**Estimacion:** 1-2h.

**Problema:** import y terminar cargan catalogos de tarifas sin orden
contractual. El motor toma la primera coincidencia recibida; `final_value`
ordena por `vigente_desde desc`. Con vigencias solapadas, la sugerencia y la
telemetria pueden divergir artificialmente.

**Evidencia:**

- Import carga tarifas sin `.order()`:
  `src/app/api/ods/importar/route.ts:402` a
  `src/app/api/ods/importar/route.ts:406`.
- Terminar manual carga tarifas sin `.order()`:
  `src/lib/ods/telemetry/terminarSnapshot.ts:146` a
  `src/lib/ods/telemetry/terminarSnapshot.ts:150`.
- `final_value` si ordena:
  `src/lib/ods/telemetry/buildFinalValue.ts:40`.
- Motor usa primera coincidencia:
  `src/lib/ods/rules-engine/rulesEngine.ts:148`.

**Diseno del fix:**

- Agregar `.order("vigente_desde", { ascending: false, nullsFirst: false })`
  en la query de tarifas del importador.
- Agregar el mismo orden en `loadManualCatalogs` de terminar.
- Mantener filtros de vigencia y limites actuales.
- No cambiar `selectTarifa`; el contrato sera que los catalogos llegan
  ordenados.

**Archivos probables:**

- `src/app/api/ods/importar/route.ts`
- `src/app/api/ods/importar/route.test.ts`
- `src/lib/ods/telemetry/terminarSnapshot.ts`
- `src/lib/ods/telemetry/terminarSnapshot.test.ts`

**Fallback obligatorio:**

- Si Supabase retorna error, conservar `data || []` / catalogo vacio y la
  telemetria de fallos de #75.
- Tarifas con `vigente_desde null` quedan al final, igual que
  `buildFinalValue`.
- Si no hay tarifas, el motor conserva fallback low actual.

**Test no-fantasma propuesto:**

- Mock con dos tarifas vigentes para el mismo codigo/modalidad debe elegir la
  de `vigente_desde` mas reciente en import y terminar.
- Si se elimina `.order()`, el test falla porque el mock devuelve primero la
  tarifa vieja.

**Test de fallback propuesto:**

- Error de la query de tarifas mantiene respuesta no bloqueante y catalogo
  vacio.
- Tarifa sin `vigente_desde` no desplaza a una tarifa vigente fechada mas
  reciente.

**Restricciones:**

- No tocar tabla `tarifas` ni indices.
- No cambiar reglas de seleccion de tarifa dentro del motor.

## Fix 6 - Fecha de vigencia sin fallback prematuro a today

**Titulo de sub-issue:** `fix(ods): evitar fallback today cuando fecha_servicio pueda parsearse antes`

**Gap F3:** G5. Prioridad media, incremental.

**Estimacion:** 2-3h para el fix minimo. Si la fecha solo aparece despues de
crear dependencias del pipeline y no puede extraerse antes sin reordenar
parse/catalogos, pausar y recategorizar antes de expandir el scope.

**Problema:** si el parse preliminar no trae fecha, el importador carga
tarifas con `today`. Mas tarde el pipeline puede extraer `fecha_servicio`
real, y `buildFinalValue` compara contra esa fecha. Si las vigencias difieren,
aparece mismatch artificial de `valor_base`.

**Evidencia:**

- Fecha preliminar detectada: `src/app/api/ods/importar/route.ts:374`.
- Fallback a today: `src/app/api/ods/importar/route.ts:379`.
- `final_value` usa `ods.fecha_servicio`:
  `src/lib/ods/telemetry/buildFinalValue.ts:38`.
- Parser PDF puede producir `fecha_servicio`:
  `src/lib/ods/import/parsers/index.ts:181`.

**Diseno del fix:**

- Reordenar el flujo para obtener una fecha de servicio parseada antes de
  cargar tarifas cuando el input lo permita.
- Mantener `today` solo como ultimo fallback explicito cuando no hay fecha
  extraible.
- No cambiar el contrato del endpoint ni el shape de `analysis`.
- Registrar claramente en tests que la fecha del documento gana sobre today.

**Archivos probables:**

- `src/app/api/ods/importar/route.ts`
- `src/app/api/ods/importar/route.test.ts`
- `src/lib/ods/import/pipeline.test.ts` solo si el parse temprano se valida ahi.

**Fallback obligatorio:**

- Si el parser no puede extraer fecha o falla, seguir usando today como ahora.
- Si la fecha extraida es invalida, descartarla y usar today sin bloquear.
- Si la carga de tarifas falla, conservar catalogo vacio y respuesta actual.

**Test no-fantasma propuesto:**

- Con fecha real del documento distinta de today y tarifas con vigencias
  distintas, la query debe usar la fecha real.
- Si se revierte el parse temprano, el test falla porque la query usa today.

**Test de fallback propuesto:**

- Documento sin fecha valida sigue usando today y no rompe importacion.

**Restricciones:**

- No crear parser nuevo.
- No cambiar schema de `payload_normalized`.
- Si requiere reestructurar el pipeline mas alla del orden de carga, recategorizar
  antes de implementar.

## Fix 7 - Visita fallida web como `is_fallido`

**Titulo de sub-issue:** `fix(ods): mapear visita fallida web a is_fallido con fallback legacy`

**Gap F3:** G10. Prioridad media, incremental.

**Estimacion:** 1-2h.

**Problema:** los builders web preservan visita fallida como
`failed_visit_applied_at`, pero el motor solo reconoce visita fallida por
`analysis.is_fallido` o texto con "fallido". En LSC, esto impide seleccionar la
tarifa de visita fallida desde actas web.

**Evidencia:**

- Builder presentacion marca `failed_visit_applied_at`:
  `src/lib/finalization/presentacionPayload.ts:92`.
- Builder LSC marca `failed_visit_applied_at`:
  `src/lib/finalization/interpreteLscPayload.ts:123`.
- Motor LSC lee `is_fallido` o texto:
  `src/lib/ods/rules-engine/rulesEngine.ts:405`.

**Diseno del fix:**

- En el path que normaliza analysis para motor, mapear
  `failed_visit_applied_at` truthy a `is_fallido = true`.
- Limitar el uso a decision del motor; conservar `failed_visit_applied_at` como
  auditoria.
- No cambiar UI ni significado del marcador.

**Archivos probables:**

- `src/lib/ods/import/pipeline.ts`
- `src/lib/ods/import/pipeline.test.ts`
- `src/lib/ods/rules-engine/rulesEngine.test.ts` si se prueba directo.

**Fallback obligatorio:**

- Payload viejo con `is_fallido` sigue funcionando.
- Payload con solo `failed_visit_applied_at` ahora funciona.
- Payload sin ninguno conserva comportamiento actual.

**Test no-fantasma propuesto:**

- Analysis LSC con `failed_visit_applied_at` y sin `is_fallido` debe elegir la
  tarifa de visita fallida.
- Si se revierte el mapping, el test falla porque no entra a ese branch.

**Test de fallback propuesto:**

- Analysis con `is_fallido = true` sigue el path actual.
- `failed_visit_applied_at` con valor invalido/falsy no debe forzar visita
  fallida.

**Restricciones:**

- No aplicar semantica de visita fallida a formularios donde el motor no tenga
  regla especifica.
- No borrar `failed_visit_applied_at`.

## Fix 8 - Inferencia incremental de modalidad

**Titulo de sub-issue:** `fix(ods): mejorar inferencia de modalidad con senales existentes`

**Gap F3:** G6 parte incremental. Prioridad media, mixto con scope acotado.

**Estimacion:** 4-6h.

**Problema:** ocho ramas requieren `modalidad.value`. Si no se infiere, caen a
fallback low aunque el `document_kind` sea correcto. La parte incremental es
usar mejor senales que ya existen; la parte feature queda fuera.
Si durante la implementacion se requieren heuristicas nuevas para mas de 3-4
ramas, no expandir este sub-issue: recategorizar esa parte como feature-nueva y
moverla al backlog post-3a.

**Evidencia:**

- Ramas afectadas: `src/lib/ods/rules-engine/rulesEngine.ts:459`,
  `src/lib/ods/rules-engine/rulesEngine.ts:476`,
  `src/lib/ods/rules-engine/rulesEngine.ts:494`,
  `src/lib/ods/rules-engine/rulesEngine.ts:520`,
  `src/lib/ods/rules-engine/rulesEngine.ts:545`,
  `src/lib/ods/rules-engine/rulesEngine.ts:560`,
  `src/lib/ods/rules-engine/rulesEngine.ts:578`.
- Inferencia actual por modalidad/asunto/ciudad:
  `src/lib/ods/rules-engine/rulesEngine.ts:630` a
  `src/lib/ods/rules-engine/rulesEngine.ts:668`.

**Diseno del fix:**

- Ampliar inferencia con senales existentes: `document_kind`, `process_hint`,
  `asunto`, `ciudad`, `modalidad_servicio` y texto normalizado.
- Definir defaults solo cuando el `document_kind` tenga una convencion clara y
  documentada; no inventar modalidad si no hay evidencia.
- Mantener fallback low cuando la modalidad siga ambigua.

**Archivos probables:**

- `src/lib/ods/rules-engine/rulesEngine.ts`
- `src/lib/ods/rules-engine/rulesEngine.test.ts`
- `src/lib/ods/import/pipeline.test.ts` si el caso depende de analysis import.

**Fallback obligatorio:**

- Si las senales son contradictorias, conservar fallback low en vez de elegir al
  azar.
- Payload viejo sin modalidad ni senales suficientes no debe bloquear.
- Los casos con modalidad explicita deben seguir ganando sobre inferencia.

**Test no-fantasma propuesto:**

- Un `document_kind` afectado con senal existente clara pero sin
  `modalidad_servicio` debe activar la rama y sugerir codigo.
- Si se revierte la inferencia incremental, cae a fallback low y el test falla.

**Test de fallback propuesto:**

- Senales contradictorias, por ejemplo texto virtual y ciudad presencial, deben
  conservar fallback/low o modalidad explicita si existe.

**Restricciones:**

- No hacer modalidad required en formularios.
- No crear UI/campos nuevos.
- Si el fix requiere decisiones producto por formulario, recategorizar esa
  parte como feature-nueva.

## Fix 9 - Participantes import-only para buckets seleccion/contratacion

**Titulo de sub-issue:** `fix(ods): reforzar participantes import-only para buckets seleccion/contratacion`

**Gap F3:** G11. Prioridad media, incremental si se limita a parsers existentes.

**Estimacion:** 2-6h.

**Problema:** web seleccion/contratacion ya provee participantes, pero import
depende de que el parser/Edge arme `participants`. Si no hay participantes, el
motor calcula bucket individual y puede sugerir codigo/valor incorrectos.

**Evidencia:**

- Web seleccion construye participantes:
  `src/lib/finalization/seleccionPayload.ts:58`.
- Web contratacion construye participantes:
  `src/lib/finalization/contratacionPayload.ts:48`.
- Motor calcula bucket con `participants.length`:
  `src/lib/ods/rules-engine/rulesEngine.ts:155` y
  `src/lib/ods/rules-engine/rulesEngine.ts:372`.
- Perfiles import esperan participantes:
  `src/lib/ods/import/processProfiles.json:173` y
  `src/lib/ods/import/processProfiles.json:213`.

**Diseno del fix:**

- Auditar y reforzar los parsers existentes de seleccion y contratacion para
  poblar `participants` cuando el documento trae tablas de oferentes/vinculados.
- Agregar fallback defensivo para contar participantes desde estructuras
  existentes del analysis si `participants` falta pero hay filas parseadas.
- No crear modelo nuevo de participantes.

**Archivos probables:**

- `src/lib/ods/import/parsers/index.ts`
- `src/lib/ods/import/parsers/generalPdfParser.ts`
- `src/lib/ods/import/pipeline.test.ts`
- `src/lib/ods/rules-engine/rulesEngine.test.ts`

**Fallback obligatorio:**

- Si no se pueden extraer participantes, mantener bucket individual actual y
  rationale explicito; no bloquear importacion.
- Si se extraen participantes duplicados, deduplicar por cedula cuando exista.
- Web seleccion/contratacion no debe cambiar.

**Test no-fantasma propuesto:**

- Documento/analysis import-only con 3 participantes debe elegir bucket 2-4.
- Si se revierte el refuerzo, cae a bucket individual y el test falla.

**Test de fallback propuesto:**

- Documento sin tabla de participantes conserva bucket individual y no lanza.
- Participantes duplicados por cedula no inflan el bucket.

**Restricciones:**

- No tocar formularios web.
- No crear schema nuevo.
- Si la solucion requiere extractor nuevo complejo o cambios de Edge Function,
  recategorizar antes de implementar.

## Backlog post-3a

### G8 - `tamano_empresa`

Feature nueva. El motor tiene default `hasta_50`, pero la auditoria no encontro
captura UI ni validacion para `tamano_empresa`. Requiere decision de producto,
campo nuevo y persistencia en payload.

### G9 - `cantidad_empresas`

Feature nueva. Presentacion/promocion cae a default 1 empresa porque el dato no
se captura. Requiere campo o modelo de multiples empresas antes de corregir el
motor.

### G6 feature - modalidad obligatoria o capturada

La parte incremental mejora inferencia con senales existentes. La parte feature
es exigir/capturar modalidad en fuentes donde hoy no existe o no es confiable.

### G7 feature - LSC 1:N (#109)

La parte incremental corrige la modalidad del flujo actual. El modelo completo
para multiples interpretes/procesos pertenece a #109 y puede reemplazar este
fix cuando se ejecute.

## Politica para sub-issues derivados

- Cada sub-issue debe arrancar con brief PO, plan v1, veto/aprobacion,
  implementacion, checkpoint y QA dual.
- Todo fix debe incluir test no-fantasma y test de fallback.
- Ningun fix debe bloquear ODS si el nuevo branch no puede resolver el dato.
- Renames se hacen por alias y transicion, no por ruptura destructiva.
- Si durante implementacion un fix incremental necesita schema, UI nueva o
  reestructuracion amplia, se pausa y se recategoriza antes de seguir.
