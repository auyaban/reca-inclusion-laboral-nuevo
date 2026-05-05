# Matriz de gaps del motor ODS

Este documento cruza F1 (`ods_motor_codigos_inventory.md`) con F2
(`ods_motor_inputs_inventory.md`) para priorizar F4. Es discovery y sintesis:
no propone cambios de codigo, no modifica reglas y no toca telemetria.

Codigos comparables en scope:

- `codigo_servicio`
- `modalidad_servicio`
- `valor_base`

Categorias:

- Severidad `alta`: mismatch sistematico en produccion para una fuente.
- Severidad `media`: mismatch en escenarios identificables.
- Severidad `baja`: edge case raro o dificil de disparar.
- Tipo `incremental`: fix sin schema nuevo ni reestructuracion mayor.
- Tipo `feature-nueva`: requiere captura/campo nuevo, schema, o modelo nuevo.
- Tipo `mixto`: tiene una parte incremental y otra parte de feature.

## Matriz codigo x fuente

| Codigo | Fuente | Inputs requeridos | Inputs provistos | Resultado del cruce | Gap relacionado |
|---|---|---|---|---|---|
| `codigo_servicio` | Web: `presentacion` | `document_kind`, modalidad, gestion/cantidad de empresas, tarifas vigentes (`src/lib/ods/rules-engine/rulesEngine.ts:560`, `src/lib/ods/rules-engine/rulesEngine.ts:125`). | `program_presentation` o `program_reactivation`, modalidad comun, NIT base, `failed_visit_applied_at` (`src/lib/finalization/presentacionPayload.ts:76`, `src/lib/finalization/presentacionPayload.ts:92`). | Parcial: activa rama correcta, pero cantidad de empresas normalmente queda por default. | G9 |
| `codigo_servicio` | Web: `sensibilizacion` | `document_kind=sensibilizacion`, modalidad y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:459`). | `sensibilizacion`, modalidad comun, NIT y metadata base (`src/lib/finalization/sensibilizacionPayload.ts:63`, `src/lib/finalization/payloads.ts:179`). | OK si modalidad llega; cae a fallback si modalidad queda vacia. | G6 |
| `codigo_servicio` | Web: `seleccion` | `inclusive_selection`, modalidad, participantes para bucket y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:494`, `src/lib/ods/rules-engine/rulesEngine.ts:155`). | `inclusive_selection`, modalidad comun y participantes desde oferentes (`src/lib/finalization/seleccionPayload.ts:110`, `src/lib/finalization/seleccionPayload.ts:117`). | OK para bucket web; el caso 8+ queda sin tarifa si catalogo no lo cubre. | E3 |
| `codigo_servicio` | Web: `contratacion` | `inclusive_hiring`, modalidad, participantes para bucket y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:520`, `src/lib/ods/rules-engine/rulesEngine.ts:155`). | `inclusive_hiring`, modalidad comun y participantes desde vinculados (`src/lib/finalization/contratacionPayload.ts:93`, `src/lib/finalization/contratacionPayload.ts:100`). | OK para bucket web; el caso 8+ queda sin tarifa si catalogo no lo cubre. | E3 |
| `codigo_servicio` | Web: `condiciones-vacante` | `vacancy_review`, modalidad, cargo/vacantes y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:440`, `src/lib/ods/rules-engine/rulesEngine.ts:167`). | `vacancy_review`, modalidad comun, `cargo_objetivo`, `total_vacantes` (`src/lib/finalization/condicionesVacantePayload.ts:119`, `src/lib/finalization/condicionesVacantePayload.ts:126`). | OK; inputs clave alineados. | - |
| `codigo_servicio` | Web: `evaluacion` | `accessibility_assessment`, modalidad, tamano empresa y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:601`, `src/lib/ods/rules-engine/rulesEngine.ts:76`). | `evaluacion_accesibilidad`, modalidad comun y campos base (`src/lib/finalization/evaluacionPayload.ts:61`). | Gap sistematico: no entra a rama de accesibilidad y cae a fallback low. | G1, G8 |
| `codigo_servicio` | Web: `interprete-lsc` | `interpreter_service`, visita fallida/horas, modalidad de interprete y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:404`, `src/lib/ods/rules-engine/rulesEngine.ts:421`). | `lsc_interpretation`, `sumatoria_horas`, `sabana.horas`, `modalidad_profesional_reca` como modalidad base (`src/lib/finalization/interpreteLscPayload.ts:120`, `src/lib/finalization/interpreteLscPayload.ts:132`). | Gap sistematico: no entra a rama LSC; aunque entrara, horas y modalidad llegan con nombres/campo equivocados. | G2, G3, G7 |
| `codigo_servicio` | Web: `induccion-organizacional` | `organizational_induction`, modalidad y tarifa de induccion (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | `organizational_induction`, modalidad comun y participante (`src/lib/finalization/induccionOrganizacionalPayload.ts:101`, `src/lib/finalization/induccionOrganizacionalPayload.ts:108`). | OK si modalidad llega; no depende del participante para bucket. | G6 |
| `codigo_servicio` | Web: `induccion-operativa` | `operational_induction`, modalidad y tarifa de induccion (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | `operational_induction`, modalidad comun y participante (`src/lib/finalization/induccionOperativaPayload.ts:94`, `src/lib/finalization/induccionOperativaPayload.ts:101`). | OK si modalidad llega; no depende del participante para bucket. | G6 |
| `codigo_servicio` | Import: `program_presentation` | `program_presentation`, modalidad, gestion/cantidad de empresas, tarifas (`src/lib/ods/rules-engine/rulesEngine.ts:560`, `src/lib/ods/rules-engine/rulesEngine.ts:125`). | Perfil pide fecha, modalidad, empresa y asistente, pero no expone cantidad de empresas (`src/lib/ods/import/processProfiles.json:6`, `src/lib/ods/import/processProfiles.json:18`). | Parcial: si no hay cantidad de empresas/NITs multiples, cae a default 1. | G9 |
| `codigo_servicio` | Import: `program_reactivation` | `program_reactivation`, modalidad, gestion y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:545`, `src/lib/ods/rules-engine/rulesEngine.ts:64`). | Perfil pide fecha, empresa/asistente y prioriza profesional/modalidad (`src/lib/ods/import/processProfiles.json:36`, `src/lib/ods/import/processProfiles.json:59`). | Parcial: si gestion no se detecta, usa default RECA. | E3 |
| `codigo_servicio` | Import: `accessibility_assessment` | `accessibility_assessment`, modalidad, tamano empresa y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:601`, `src/lib/ods/rules-engine/rulesEngine.ts:76`). | Perfil de evaluacion, modalidad y bloques de accesibilidad, sin `tamano_empresa` (`src/lib/ods/import/processProfiles.json:64`, `src/lib/ods/import/processProfiles.json:83`). | Parcial: rama activa, pero tamano empresa cae a default `hasta_50`. | G8 |
| `codigo_servicio` | Import: `vacancy_review` | `vacancy_review`, modalidad, vacante/cargo y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:440`). | Perfil pide modalidad, nombre de vacante, numero de vacantes, empresa/NIT (`src/lib/ods/import/processProfiles.json:101`, `src/lib/ods/import/processProfiles.json:117`). | OK; inputs alineados. | - |
| `codigo_servicio` | Import: `inclusive_selection` | `inclusive_selection`, modalidad, participantes y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:494`, `src/lib/ods/rules-engine/rulesEngine.ts:155`). | Perfil pide participantes, cargo y modalidad (`src/lib/ods/import/processProfiles.json:143`, `src/lib/ods/import/processProfiles.json:173`). | Parcial: si parser/Edge no llena participantes, bucket cae a individual. | G11 |
| `codigo_servicio` | Import: `inclusive_hiring` | `inclusive_hiring`, modalidad, participantes y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:520`, `src/lib/ods/rules-engine/rulesEngine.ts:155`). | Perfil pide participantes, cargo y modalidad (`src/lib/ods/import/processProfiles.json:180`, `src/lib/ods/import/processProfiles.json:213`). | Parcial: si parser/Edge no llena participantes, bucket cae a individual. | G11 |
| `codigo_servicio` | Import: `organizational_induction` | `organizational_induction`, modalidad y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | Perfil pide modalidad y datos de vinculado/cargo (`src/lib/ods/import/processProfiles.json:220`, `src/lib/ods/import/processProfiles.json:239`). | OK si modalidad llega; si no, fallback low. | G6 |
| `codigo_servicio` | Import: `operational_induction` | `operational_induction`, modalidad y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | Perfil pide fecha/modalidad y datos generales (`src/lib/ods/import/processProfiles.json:251`, `src/lib/ods/import/processProfiles.json:277`). | OK si modalidad llega; si no, fallback low. | G6 |
| `codigo_servicio` | Import: `sensibilizacion` | `sensibilizacion`, modalidad y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:459`). | Perfil pide modalidad, asistentes y profesional (`src/lib/ods/import/processProfiles.json:281`, `src/lib/ods/import/processProfiles.json:302`). | OK si modalidad llega; si no, fallback low. | G6 |
| `codigo_servicio` | Import: `follow_up` | `follow_up`, modalidad, numero/tipo seguimiento y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:578`, `src/lib/ods/rules-engine/rulesEngine.ts:251`). | Perfil pide numero seguimiento, cargo y modalidad (`src/lib/ods/import/processProfiles.json:308`, `src/lib/ods/import/processProfiles.json:339`). | Parcial: si modalidad o numero no salen claros, puede caer a fallback/revision. | G6 |
| `codigo_servicio` | Import: `interpreter_service` | `interpreter_service`, horas/visita fallida/interprete y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:404`, `src/lib/ods/rules-engine/rulesEngine.ts:421`). | Perfil alinea `sumatoria_horas_interpretes`, `total_tiempo`, interprete, NIT y participantes (`src/lib/ods/import/processProfiles.json:345`, `src/lib/ods/import/processProfiles.json:376`). | OK para PDF legacy clasificado como `interpreter_service`; si la fuente es re-import de acta web con `payload_normalized.document_kind = lsc_interpretation`, aplica G2 porque el pipeline prefiere el kind del payload. | G2 |
| `modalidad_servicio` | Web: `presentacion` | Modalidad directa o inferible por asunto/ciudad (`src/lib/ods/rules-engine/rulesEngine.ts:635`, `src/lib/ods/rules-engine/rulesEngine.ts:641`). | Campo comun `modalidad_servicio` desde section1Data.modalidad (`src/lib/finalization/payloads.ts:179`). | OK si el formulario trae modalidad. | - |
| `modalidad_servicio` | Web: `sensibilizacion` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:459`). | Campo comun `modalidad_servicio` (`src/lib/finalization/payloads.ts:179`). | OK si el formulario trae modalidad. | - |
| `modalidad_servicio` | Web: `seleccion` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:494`). | Campo comun `modalidad_servicio` (`src/lib/finalization/payloads.ts:179`). | OK si el formulario trae modalidad. | - |
| `modalidad_servicio` | Web: `contratacion` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:520`). | Campo comun `modalidad_servicio` (`src/lib/finalization/payloads.ts:179`). | OK si el formulario trae modalidad. | - |
| `modalidad_servicio` | Web: `condiciones-vacante` | Modalidad directa para activar rama de vacante (`src/lib/ods/rules-engine/rulesEngine.ts:440`). | Campo comun `modalidad_servicio` (`src/lib/finalization/payloads.ts:179`). | OK si el formulario trae modalidad. | - |
| `modalidad_servicio` | Web: `evaluacion` | Modalidad directa y rama `accessibility_assessment` (`src/lib/ods/rules-engine/rulesEngine.ts:601`). | Campo comun `modalidad_servicio`, pero `document_kind` no activa rama (`src/lib/finalization/evaluacionPayload.ts:61`). | Parcial: puede devolver modalidad en fallback, pero no codigo/valor. | G1 |
| `modalidad_servicio` | Web: `interprete-lsc` | Modalidad del servicio LSC, idealmente interprete (`src/lib/ods/rules-engine/rulesEngine.ts:390`). | `modalidad_servicio` viene de `modalidad_profesional_reca`, no de `modalidad_interprete` (`src/lib/finalization/interpreteLscPayload.ts:120`, `src/lib/finalization/interpreteLscPayload.ts:126`). | Gap: modalidad puede ser del actor equivocado. | G7 |
| `modalidad_servicio` | Web: `induccion-organizacional` | Modalidad directa para activar induccion (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | Campo comun `modalidad_servicio` (`src/lib/finalization/payloads.ts:179`). | OK si modalidad llega. | - |
| `modalidad_servicio` | Web: `induccion-operativa` | Modalidad directa para activar induccion (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | Campo comun `modalidad_servicio` (`src/lib/finalization/payloads.ts:179`). | OK si modalidad llega. | - |
| `modalidad_servicio` | Import: `program_presentation` | Modalidad inferida/directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:560`). | Perfil prioriza `modalidad_servicio` (`src/lib/ods/import/processProfiles.json:32`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `program_reactivation` | Modalidad inferida/directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:545`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:59`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `accessibility_assessment` | Modalidad directa y tamano empresa (`src/lib/ods/rules-engine/rulesEngine.ts:601`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:97`). | OK para modalidad si se extrae. | - |
| `modalidad_servicio` | Import: `vacancy_review` | Modalidad directa (`src/lib/ods/rules-engine/rulesEngine.ts:440`). | Perfil incluye modalidad de trabajo (`src/lib/ods/import/processProfiles.json:117`). | OK si parser/Edge la extrae. | - |
| `modalidad_servicio` | Import: `inclusive_selection` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:494`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:173`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `inclusive_hiring` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:520`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:213`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `organizational_induction` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | Perfil incluye modalidad (`src/lib/ods/import/processProfiles.json:233`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `operational_induction` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:476`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:277`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `sensibilizacion` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:459`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:302`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `follow_up` | Modalidad directa para activar rama (`src/lib/ods/rules-engine/rulesEngine.ts:578`). | Perfil prioriza modalidad (`src/lib/ods/import/processProfiles.json:339`). | OK si parser/Edge la extrae; si no, fallback low. | G6 |
| `modalidad_servicio` | Import: `interpreter_service` | Modalidad de la tarifa LSC seleccionada (`src/lib/ods/rules-engine/rulesEngine.ts:390`). | Perfil no depende de campo web LSC; usa senales de interprete/horas y tarifas (`src/lib/ods/import/processProfiles.json:345`). | OK; modalidad sale de la tarifa seleccionada. | - |
| `valor_base` | Web: `presentacion` | Tarifa vigente para codigo sugerido y fecha de servicio (`src/lib/ods/rules-engine/rulesEngine.ts:391`, `src/app/api/ods/importar/route.ts:379`). | Fecha comun y tarifa cargada por import; cantidad empresas no explicita (`src/lib/finalization/payloads.ts:179`). | Parcial: mismo riesgo de default 1 empresa y vigencia. | G5, G9 |
| `valor_base` | Web: `sensibilizacion` | Tarifa vigente para rama/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:391`). | Fecha comun y modalidad (`src/lib/finalization/payloads.ts:179`). | OK si fecha preliminar y fecha final coinciden; si no, riesgo de vigencia. | G5 |
| `valor_base` | Web: `seleccion` | Tarifa vigente para bucket/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:497`, `src/lib/ods/rules-engine/rulesEngine.ts:391`). | Fecha, modalidad y participantes web (`src/lib/finalization/seleccionPayload.ts:117`). | OK para bucket web; riesgo de vigencia/orden tarifas. | G4, G5 |
| `valor_base` | Web: `contratacion` | Tarifa vigente para bucket/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:523`, `src/lib/ods/rules-engine/rulesEngine.ts:391`). | Fecha, modalidad y participantes web (`src/lib/finalization/contratacionPayload.ts:100`). | OK para bucket web; riesgo de vigencia/orden tarifas. | G4, G5 |
| `valor_base` | Web: `condiciones-vacante` | Tarifa vigente para vacante/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:441`, `src/lib/ods/rules-engine/rulesEngine.ts:391`). | Fecha, modalidad, cargo y vacantes (`src/lib/finalization/condicionesVacantePayload.ts:126`). | OK; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Web: `evaluacion` | Tarifa de accesibilidad por modalidad/tamano empresa (`src/lib/ods/rules-engine/rulesEngine.ts:604`). | No activa rama y no provee tamano empresa (`src/lib/finalization/evaluacionPayload.ts:61`). | Gap: no hay `valor_base` automatico. | G1, G8 |
| `valor_base` | Web: `interprete-lsc` | Tarifa LSC por visita fallida/horas/texto (`src/lib/ods/rules-engine/rulesEngine.ts:421`, `src/lib/ods/rules-engine/rulesEngine.ts:429`). | Horas con nombres no consumidos y rama no activada (`src/lib/finalization/interpreteLscPayload.ts:132`, `src/lib/finalization/interpreteLscPayload.ts:147`). | Gap: no hay `valor_base` automatico LSC. | G2, G3 |
| `valor_base` | Web: `induccion-organizacional` | Tarifa vigente de induccion/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:478`). | Fecha y modalidad comunes (`src/lib/finalization/induccionOrganizacionalPayload.ts:101`). | OK; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Web: `induccion-operativa` | Tarifa vigente de induccion/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:478`). | Fecha y modalidad comunes (`src/lib/finalization/induccionOperativaPayload.ts:94`). | OK; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `program_presentation` | Tarifa vigente de promocion por bucket/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:564`). | Modalidad/fecha y empresa, pero no cantidad empresas garantizada (`src/lib/ods/import/processProfiles.json:18`). | Parcial: default 1 empresa puede elegir valor incorrecto. | G5, G9 |
| `valor_base` | Import: `program_reactivation` | Tarifa vigente de reactivacion por gestion/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:547`). | Fecha, empresa y modalidad (`src/lib/ods/import/processProfiles.json:48`). | OK si gestion/modalidad se detectan; riesgo de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `accessibility_assessment` | Tarifa de accesibilidad por tamano/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:604`). | Perfil no provee tamano empresa (`src/lib/ods/import/processProfiles.json:83`). | Parcial: default `hasta_50` puede elegir valor incorrecto. | G8 |
| `valor_base` | Import: `vacancy_review` | Tarifa vigente de vacante/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:441`). | Fecha, modalidad, vacante y vacantes (`src/lib/ods/import/processProfiles.json:117`). | OK; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `inclusive_selection` | Tarifa vigente por bucket/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:497`). | Participantes esperados por perfil, pero dependientes de extraccion (`src/lib/ods/import/processProfiles.json:173`). | Parcial: participantes incompletos cambian bucket y valor. | G11 |
| `valor_base` | Import: `inclusive_hiring` | Tarifa vigente por bucket/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:523`). | Participantes esperados por perfil, pero dependientes de extraccion (`src/lib/ods/import/processProfiles.json:213`). | Parcial: participantes incompletos cambian bucket y valor. | G11 |
| `valor_base` | Import: `organizational_induction` | Tarifa vigente de induccion/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:478`). | Fecha y modalidad esperadas (`src/lib/ods/import/processProfiles.json:233`). | OK si modalidad llega; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `operational_induction` | Tarifa vigente de induccion/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:478`). | Fecha y modalidad esperadas (`src/lib/ods/import/processProfiles.json:267`). | OK si modalidad llega; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `sensibilizacion` | Tarifa vigente de sensibilizacion/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:460`). | Fecha y modalidad esperadas (`src/lib/ods/import/processProfiles.json:293`). | OK si modalidad llega; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `follow_up` | Tarifa vigente de seguimiento/modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:581`). | Fecha, numero seguimiento, cargo y modalidad esperadas (`src/lib/ods/import/processProfiles.json:320`). | OK si modalidad/numero salen; riesgo general de vigencia/orden. | G4, G5 |
| `valor_base` | Import: `interpreter_service` | Tarifa LSC por horas/texto/visita fallida (`src/lib/ods/rules-engine/rulesEngine.ts:421`, `src/lib/ods/rules-engine/rulesEngine.ts:429`). | Perfil alinea horas y contexto LSC (`src/lib/ods/import/processProfiles.json:357`). | OK; riesgo general de orden si varias tarifas LSC matchean. | G4 |

## Gaps detectados

| ID | Gap | Severidad | Tipo de fix | Evidencia y comportamiento |
|---|---|---|---|---|
| G1 | `evaluacion_accesibilidad` no activa `accessibility_assessment`. | Alta | Incremental | El builder web emite `evaluacion_accesibilidad` (`src/lib/finalization/evaluacionPayload.ts:61`), el pipeline prefiere el `document_kind` del payload y solo reclasifica si no existe kind (`src/lib/ods/import/pipeline.ts:257`, `src/lib/ods/import/pipeline.ts:261`), y el motor solo tiene rama `accessibility_assessment` (`src/lib/ods/rules-engine/rulesEngine.ts:601`). Resultado: fallback low sin `codigo_servicio` ni `valor_base` (`src/lib/ods/rules-engine/rulesEngine.ts:627`). |
| G2 | `lsc_interpretation` no activa `interpreter_service`. | Alta | Incremental | El builder web emite `lsc_interpretation` (`src/lib/finalization/interpreteLscPayload.ts:147`), pero la rama LSC exige `interpreter_service` (`src/lib/ods/rules-engine/rulesEngine.ts:404`). Como el pipeline conserva el kind del payload (`src/lib/ods/import/pipeline.ts:257`), la sugerencia cae a fallback low. |
| G3 | Horas LSC web usan nombres que el motor no consume. | Alta | Incremental | Web emite `sumatoria_horas` y `sabana.horas` (`src/lib/finalization/interpreteLscPayload.ts:132`, `src/lib/finalization/interpreteLscPayload.ts:133`); el motor lee `sumatoria_horas_interpretes` o `total_horas_interprete` (`src/lib/ods/rules-engine/rulesEngine.ts:421`). Incluso si G2 se corrige, el valor base LSC por horas seguiria incompleto. |
| G4 | Carga de tarifas en import sin orden deterministico. | Media | Incremental | La query de import en `route.ts:402` filtra `tarifas` sin `.order()`; la query de telemetria en `buildFinalValue.ts:40` si ordena por `vigente_desde desc`. El mismatch artificial vive en ese delta: `selectTarifa` toma la primera coincidencia recibida (`src/lib/ods/rules-engine/rulesEngine.ts:148`) y puede divergir de `final_value` si hay solape de vigencias. |
| G5 | `valor_base` puede calcularse con `fechaForVigencia = today`. | Media | Incremental | Si el parse preliminar no trae fecha, el import usa `new Date().toISOString().slice(0, 10)` (`src/app/api/ods/importar/route.ts:374`, `src/app/api/ods/importar/route.ts:379`). Luego `final_value` usa `ods.fecha_servicio` real (`src/lib/ods/telemetry/buildFinalValue.ts:38`). Hay mismatch si las vigencias difieren entre ambas fechas. |
| G6 | Modalidad no inferida desactiva 8 ramas. | Media | Mixto | Ocho ramas dependen de `modalidad.value`: sensibilizacion, inducciones, seleccion, contratacion, reactivacion, presentacion y follow-up (`src/lib/ods/rules-engine/rulesEngine.ts:459`, `src/lib/ods/rules-engine/rulesEngine.ts:476`, `src/lib/ods/rules-engine/rulesEngine.ts:494`, `src/lib/ods/rules-engine/rulesEngine.ts:520`, `src/lib/ods/rules-engine/rulesEngine.ts:545`, `src/lib/ods/rules-engine/rulesEngine.ts:560`, `src/lib/ods/rules-engine/rulesEngine.ts:578`). Incremental: mejorar inferencia/defaults usando senales ya existentes por `document_kind`, asunto o ciudad. Feature-nueva: hacer modalidad obligatoria/capturada en todas las fuentes que hoy no la exponen. |
| G7 | Modalidad LSC web proviene de `modalidad_profesional_reca`. | Media | Mixto | `buildBaseParsedRaw` recibe `modalidad: section1Data.modalidad_profesional_reca` (`src/lib/finalization/interpreteLscPayload.ts:120`) aunque el payload tambien conserva `modalidad_interprete` (`src/lib/finalization/interpreteLscPayload.ts:126`). Incremental: usar el campo existente `modalidad_interprete` para la modalidad del servicio. Feature-nueva: resolver el modelo completo LSC 1:N de #109 cuando haya varios interpretes/modalidades en una misma acta. |
| G8 | `tamano_empresa` no se captura ni llega al motor. | Media | Feature-nueva | `companySizeBucket` consume `tamano_empresa`, `tamano_empresa_servicio`, `size_bucket` o total de trabajadores (`src/lib/ods/rules-engine/rulesEngine.ts:76`, `src/lib/ods/rules-engine/rulesEngine.ts:85`) y si falta usa default `hasta_50` (`src/lib/ods/rules-engine/rulesEngine.ts:93`). La busqueda local no encontro campos de captura `tamano_empresa`/trabajadores en formularios o validaciones; el perfil de accesibilidad lista bloques de evaluacion, no tamano (`src/lib/ods/import/processProfiles.json:64`, `src/lib/ods/import/processProfiles.json:83`). |
| G9 | `cantidad_empresas` para presentacion/promocion no se captura. | Media | Feature-nueva | `promotionCompanyCount` consume `cantidad_empresas`, `numero_empresas`, `company_count` o NITs multiples (`src/lib/ods/rules-engine/rulesEngine.ts:125`, `src/lib/ods/rules-engine/rulesEngine.ts:133`) y si falta usa 1 (`src/lib/ods/rules-engine/rulesEngine.ts:136`). `presentacionSchema` captura tipo, fecha, modalidad, NIT, motivacion, acuerdos y asistentes, sin cantidad de empresas (`src/lib/validations/presentacion.ts:64`, `src/lib/validations/presentacion.ts:86`), el payload no agrega ese campo (`src/lib/finalization/presentacionPayload.ts:86`, `src/lib/finalization/presentacionPayload.ts:95`) y el perfil import de `program_presentation` tampoco lo expone entre sus campos requeridos (`src/lib/ods/import/processProfiles.json:6`, `src/lib/ods/import/processProfiles.json:18`). |
| G10 | Visita fallida se preserva como auditoria, no como `is_fallido`. | Media | Incremental | Los builders web agregan `failed_visit_applied_at` (por ejemplo `src/lib/finalization/presentacionPayload.ts:92`, `src/lib/finalization/interpreteLscPayload.ts:123`), pero la rama LSC detecta visita fallida por `analysis.is_fallido` o texto con "fallido" (`src/lib/ods/rules-engine/rulesEngine.ts:405`). El marker de UI no cambia hoy la seleccion de tarifa. |
| G11 | Buckets de seleccion/contratacion import-only dependen de participantes extraidos. | Media | Incremental | Web seleccion/contratacion ya construye participantes (`src/lib/finalization/seleccionPayload.ts:58`, `src/lib/finalization/contratacionPayload.ts:48`). El gap queda para import-only: el motor calcula bucket solo con `participants.length` (`src/lib/ods/rules-engine/rulesEngine.ts:155`, `src/lib/ods/rules-engine/rulesEngine.ts:372`), y los perfiles esperan participantes desde las tablas de oferente/vinculado (`src/lib/ods/import/processProfiles.json:173`, `src/lib/ods/import/processProfiles.json:213`). Si el parser no los arma, cae a individual. |

## Hallazgos de determinismo

1. **Orden de tarifas en import.** Confirmado como G4. La fuente del
   no-determinismo es externa al rules-engine: Supabase puede devolver filas
   vigentes en orden no contractual porque la query de import no ordena
   (`src/app/api/ods/importar/route.ts:402`), mientras la query de telemetria
   si ordena por `vigente_desde desc`
   (`src/lib/ods/telemetry/buildFinalValue.ts:40`). El motor elige la primera
   fila (`src/lib/ods/rules-engine/rulesEngine.ts:148`).
2. **Alternativas amplifican el mismo riesgo.** `generateAlternativeSuggestions`
   vuelve a ejecutar `suggestServiceFromAnalysis` con modalidades mutadas y
   `process_hint` (`src/lib/ods/import/pipeline.ts:331`,
   `src/lib/ods/import/pipeline.ts:346`,
   `src/lib/ods/import/pipeline.ts:361`). Si una alternativa ranquea arriba,
   puede heredar una tarifa elegida por orden no deterministico.
3. **Fecha local de vigencia.** Confirmado como G5. `new Date()` decide el
   catalogo si falta fecha preliminar (`src/app/api/ods/importar/route.ts:379`);
   la telemetria final compara con `ods.fecha_servicio`
   (`src/lib/ods/telemetry/buildFinalValue.ts:38`).
4. **Auditoria negativa.** No se encontro otro uso de randomness, timezone o
   locale que afecte directamente la eleccion de `codigo_servicio`,
   `modalidad_servicio` o `valor_base` en el path del motor. Los usos de
   `Date.now()` en pipeline son medicion de duracion (`src/lib/ods/import/pipeline.ts:426`)
   y el ranking ordena por score calculado, no por azar
   (`src/lib/ods/import/rankedSuggestions.ts:23`).

## Edge cases compartidos

- **Fallback low sin campos comparables.** Si una rama no se activa o no hay
  tarifa, el motor conserva observaciones/rationale pero puede no escribir
  `codigo_servicio` ni `valor_base` (`src/lib/ods/rules-engine/rulesEngine.ts:627`).
- **`document_kind` del payload domina al classifier.** Esto vuelve sistemicos
  los gaps de naming: el import no rescata `evaluacion_accesibilidad` ni
  `lsc_interpretation` reclasificando por texto cuando el payload ya trae kind
  (`src/lib/ods/import/pipeline.ts:257`, `src/lib/ods/import/pipeline.ts:261`).
- **Defaults esconden incertidumbre.** Empresa default RECA, tamano default
  `hasta_50`, cantidad default 1 y bucket individual evitan crash, pero pueden
  sugerir codigo/valor validos para la categoria equivocada
  (`src/lib/ods/rules-engine/rulesEngine.ts:72`,
  `src/lib/ods/rules-engine/rulesEngine.ts:93`,
  `src/lib/ods/rules-engine/rulesEngine.ts:136`,
  `src/lib/ods/rules-engine/rulesEngine.ts:157`).
- **`attendance_support` no es mismatch.** La rama retorna `confidence: "low"`
  sin campos comparables por diseno (`src/lib/ods/rules-engine/rulesEngine.ts:400`);
  debe separarse de gaps reales cuando se lea cobertura de telemetria.
- **Visita fallida es transversal pero no uniforme.** Los formularios web
  preservan `failed_visit_applied_at`; el motor solo tiene comportamiento
  especifico de visita fallida en LSC (`src/lib/ods/rules-engine/rulesEngine.ts:405`).

## Distribucion para F4

| Severidad | Incremental | Mixto | Feature-nueva |
|---|---:|---:|---:|
| Alta | 3 | 0 | 0 |
| Media | 4 | 2 | 2 |
| Baja | 0 | 0 | 0 |

Gaps incremental directos para priorizacion F4: G1, G2, G3, G4, G5, G10 y G11.
Gaps mixtos para partir antes de decidir alcance: G6 y G7. Gaps de feature
nueva para backlog post-Tanda 3a o epics separados: G8 y G9.
