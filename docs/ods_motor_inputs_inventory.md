# Inventario de inputs del motor ODS

Este documento inventaria que campos entrega cada fuente de input al motor ODS
para los tres codigos comparables definidos en F1: `codigo_servicio`,
`modalidad_servicio` y `valor_base`.

F2 es discovery puro. No modifica parsers, schemas, validadores, motor,
telemetria ni SQL. Los gaps se documentan con evidencia para F3/F4; no se
corrigen aqui.

## Alcance

Incluido:

- Formularios web que escriben `formatos_finalizados_il.payload_normalized`.
- `document_kind` import-only que llegan al motor desde PDF, Excel o Edge
  Function como `analysis`.
- Limitaciones entre lo capturado por formulario/parser y lo que consume el
  rules-engine.
- Cobertura de tests existente cuando ayuda a priorizar F4.

Fuera de alcance:

- Wizard manual ODS: construye la ODS final, pero no produce
  `payload_normalized`.
- Cambios a formularios, parsers, validators, motor, telemetry o comparador
  SQL.
- Datos reales de produccion y metricas de volumen.

Nota de lectura: la columna `Campos en payload_normalized` conserva el nombre
del brief. En filas `Import:` no existe `payload_normalized`; ahi se listan los
campos equivalentes que llegan al motor en `analysis`.

## Familias de fuentes

### Web finalizable

Los formularios finalizados escriben un wrapper
`{ schema_version, form_id, form_name, attachment, parsed_raw, metadata }`
(`src/lib/finalization/payloads.ts:194`,
`src/lib/finalization/payloads.ts:224`). El importador hace unwrap de
`parsed_raw`, conserva `metadata.acta_ref` y prefiere
`attachment.document_kind` como `document_kind` del analysis
(`src/lib/ods/import/pipeline.ts:198`,
`src/lib/ods/import/pipeline.ts:206`,
`src/lib/ods/import/pipeline.ts:217`,
`src/lib/ods/import/pipeline.ts:257`).

Los campos comunes que salen de `buildBaseParsedRaw` son `nit_empresa`,
`nombre_empresa`, `fecha_servicio`, `nombre_profesional`,
`modalidad_servicio`, `cargo_objetivo`, `total_vacantes`,
`numero_seguimiento`, `participantes`, `asistentes`, ciudad, sede, caja de
compensacion y asesor (`src/lib/finalization/payloads.ts:157`,
`src/lib/finalization/payloads.ts:179`,
`src/lib/finalization/payloads.ts:190`).

### Import-only document kinds

El importador tambien puede construir `analysis` desde PDF, Excel o Edge
Function sin registro en `formatos_finalizados_il`. `buildAnalysisFromParseResult`
expone al motor NIT, empresa, fecha, profesional, modalidad, cargo, vacantes,
numero de seguimiento, participantes, interpretes, horas, `is_fallido` y
`document_kind` (`src/lib/ods/import/pipeline.ts:256`,
`src/lib/ods/import/pipeline.ts:284`). Edge Function puede agregar
`process_hint` y `process_name_hint` (`src/lib/ods/import/pipeline.ts:289`,
`src/lib/ods/import/pipeline.ts:316`).

## Tabla principal

| Formulario | Campos en payload_normalized | Codigos consumidores | Limitaciones / inputs faltantes |
|---|---|---|---|
| Web: `presentacion` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `program_presentation` o `program_reactivation` segun `tipo_visita` (`src/lib/finalization/presentacionPayload.ts:71`, `src/lib/finalization/presentacionPayload.ts:76`). Agrega `failed_visit_applied_at` en `parsed_raw` (`src/lib/finalization/presentacionPayload.ts:92`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a ramas `program_presentation` o `program_reactivation` (`src/lib/ods/rules-engine/rulesEngine.ts:545`, `src/lib/ods/rules-engine/rulesEngine.ts:560`). | Para promocion, el motor infiere cantidad de empresas desde `cantidad_empresas`, `numero_empresas`, `company_count` o multiples NITs (`src/lib/ods/rules-engine/rulesEngine.ts:125`). El payload web solo trae el NIT de la empresa base por el builder comun (`src/lib/finalization/payloads.ts:175`), asi que normalmente cae a 1 empresa. `visita fallida` queda como auditoria en `failed_visit_applied_at`, pero el rules-engine no consume ese campo. |
| Web: `sensibilizacion` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `sensibilizacion` (`src/lib/finalization/sensibilizacionPayload.ts:63`, `src/lib/finalization/sensibilizacionPayload.ts:68`). Agrega `failed_visit_applied_at` (`src/lib/finalization/sensibilizacionPayload.ts:75`, `src/lib/finalization/sensibilizacionPayload.ts:76`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `sensibilizacion` (`src/lib/ods/rules-engine/rulesEngine.ts:459`). | La rama no usa participantes como bucket; solo modalidad y tarifa (`src/lib/ods/rules-engine/rulesEngine.ts:459`). `visita fallida` se preserva como metadata operativa, pero no cambia la sugerencia del motor porque no produce `is_fallido`. |
| Web: `seleccion` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `inclusive_selection`; `participantes` sale de `oferentes`; `cargo_objetivo` sale de cargo unico de oferentes (`src/lib/finalization/seleccionPayload.ts:105`, `src/lib/finalization/seleccionPayload.ts:110`, `src/lib/finalization/seleccionPayload.ts:117`, `src/lib/finalization/seleccionPayload.ts:118`). Agrega `failed_visit_applied_at` (`src/lib/finalization/seleccionPayload.ts:119`, `src/lib/finalization/seleccionPayload.ts:120`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `inclusive_selection`, que usa cantidad de participantes como bucket (`src/lib/ods/rules-engine/rulesEngine.ts:494`). | Si hay 8 o mas participantes, el motor documenta que no existe tarifa de seleccion incluyente para ese rango y cae a baja confianza si no hay match (`src/lib/ods/rules-engine/rulesEngine.ts:512`). `visita fallida` no se transforma en `is_fallido`, por lo que no afecta la rama. Tests cubren payload y document kind (`src/lib/finalization/seleccionPayload.test.ts:44`, `src/lib/finalization/seleccionPayload.test.ts:47`). |
| Web: `contratacion` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `inclusive_hiring`; `participantes` sale de `vinculados`; `cargo_objetivo` usa el primer `cargo_servicio` (`src/lib/finalization/contratacionPayload.ts:88`, `src/lib/finalization/contratacionPayload.ts:93`, `src/lib/finalization/contratacionPayload.ts:100`, `src/lib/finalization/contratacionPayload.ts:101`). Agrega `failed_visit_applied_at` (`src/lib/finalization/contratacionPayload.ts:102`, `src/lib/finalization/contratacionPayload.ts:103`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `inclusive_hiring`, que usa cantidad de participantes como bucket (`src/lib/ods/rules-engine/rulesEngine.ts:520`). | Mismo limite de bucket 8+ que seleccion: sin tarifa para ese rango, la sugerencia queda sin codigo (`src/lib/ods/rules-engine/rulesEngine.ts:538`). `visita fallida` queda auditada, no consumida por el motor. Tests cubren payload y document kind (`src/lib/finalization/contratacionPayload.test.ts:134`, `src/lib/finalization/contratacionPayload.test.ts:137`). |
| Web: `condiciones-vacante` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `vacancy_review`; `cargo_objetivo` sale de `nombre_vacante`; `total_vacantes` sale de `numero_vacantes` (`src/lib/finalization/condicionesVacantePayload.ts:114`, `src/lib/finalization/condicionesVacantePayload.ts:119`, `src/lib/finalization/condicionesVacantePayload.ts:126`, `src/lib/finalization/condicionesVacantePayload.ts:127`). Agrega `failed_visit_applied_at` (`src/lib/finalization/condicionesVacantePayload.ts:128`, `src/lib/finalization/condicionesVacantePayload.ts:129`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `vacancy_review` (`src/lib/ods/rules-engine/rulesEngine.ts:440`). | Campo fuerte: provee cargo y vacantes, que tambien alimentan observaciones automaticas (`src/lib/ods/rules-engine/rulesEngine.ts:126`, `src/lib/ods/rules-engine/rulesEngine.ts:229`). `total_empresas` no aplica aqui; el perfil lo prohibe y el motor no lo consume para esta rama (`src/lib/ods/import/processProfiles.json:139`). `visita fallida` no cambia sugerencia. |
| Web: `evaluacion` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `evaluacion_accesibilidad` (`src/lib/finalization/evaluacionPayload.ts:56`, `src/lib/finalization/evaluacionPayload.ts:61`). Agrega `failed_visit_applied_at` (`src/lib/finalization/evaluacionPayload.ts:68`, `src/lib/finalization/evaluacionPayload.ts:69`). | Esperado por negocio: `codigo_servicio`, `modalidad_servicio`, `valor_base`. Comportamiento real: solo puede devolver `modalidad_servicio` en fallback low, porque la rama de codigo exige `accessibility_assessment` (`src/lib/ods/rules-engine/rulesEngine.ts:601`, `src/lib/ods/rules-engine/rulesEngine.ts:627`). | Gap de naming: `payload_normalized` trae `evaluacion_accesibilidad` y el pipeline lo prefiere sobre reclasificar (`src/lib/ods/import/pipeline.ts:257`, `src/lib/ods/import/pipeline.ts:263`). Por eso no entra a `accessibility_assessment`; no crashea, cae silenciosamente a sugerencia `low` sin `codigo_servicio` ni `valor_base` (`src/lib/ods/rules-engine/rulesEngine.ts:627`). Tests cubren payload, pero no el cruce con rules-engine (`src/lib/finalization/evaluacionPayload.test.ts:82`). |
| Web: `interprete-lsc` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `lsc_interpretation`; agrega `modalidad_interprete`, `modalidad_profesional_reca`, `interpretes`, `sumatoria_horas` y `sabana.horas` (`src/lib/finalization/interpreteLscPayload.ts:123`, `src/lib/finalization/interpreteLscPayload.ts:126`, `src/lib/finalization/interpreteLscPayload.ts:132`, `src/lib/finalization/interpreteLscPayload.ts:133`, `src/lib/finalization/interpreteLscPayload.ts:147`). | Esperado por negocio: `codigo_servicio`, `modalidad_servicio`, `valor_base`. Comportamiento real: solo modalidad en fallback low si llega modalidad; la rama LSC exige `interpreter_service` (`src/lib/ods/rules-engine/rulesEngine.ts:404`, `src/lib/ods/rules-engine/rulesEngine.ts:627`). | Gap triple: `document_kind` no coincide con `interpreter_service`, asi que se saltan reglas de horas/visita fallida; el motor busca `sumatoria_horas_interpretes` o `total_horas_interprete`, no `sumatoria_horas` ni `sabana.horas` (`src/lib/ods/rules-engine/rulesEngine.ts:421`); y `modalidad_servicio` sale de `modalidad_profesional_reca`, no de `modalidad_interprete` (`src/lib/finalization/interpreteLscPayload.ts:120`). No crashea: cae a `low` sin codigo. Tests cubren el payload LSC, incluyendo `lsc_interpretation` y `sumatoria_horas` (`src/lib/finalization/interpreteLscPayload.test.ts:122`, `src/lib/finalization/interpreteLscPayload.test.ts:163`). |
| Web: `induccion-organizacional` | Wrapper finalizable con campos comunes; `attachment.document_kind` es el kind de induccion organizacional; agrega un participante desde `vinculado` y `cargo_objetivo` desde `cargo_oferente` (`src/lib/finalization/induccionOrganizacionalPayload.ts:88`, `src/lib/finalization/induccionOrganizacionalPayload.ts:101`, `src/lib/finalization/induccionOrganizacionalPayload.ts:108`, `src/lib/finalization/induccionOrganizacionalPayload.ts:109`). Agrega `failed_visit_applied_at` (`src/lib/finalization/induccionOrganizacionalPayload.ts:110`, `src/lib/finalization/induccionOrganizacionalPayload.ts:111`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `organizational_induction` (`src/lib/ods/rules-engine/rulesEngine.ts:477`). | La rama no usa bucket de participantes; usa keyword organizacional y modalidad (`src/lib/ods/rules-engine/rulesEngine.ts:477`). `cargo_objetivo` se preserva para contexto, pero no decide codigo. `visita fallida` no cambia sugerencia. Test cubre payload, document kind y participantes (`src/lib/finalization/induccionOrganizacionalPayload.test.ts:38`, `src/lib/finalization/induccionOrganizacionalPayload.test.ts:41`). |
| Web: `induccion-operativa` | Wrapper finalizable con campos comunes; `attachment.document_kind` es `operational_induction`; agrega un participante desde `vinculado` y `cargo_objetivo` desde `cargo_oferente` (`src/lib/finalization/induccionOperativaPayload.ts:89`, `src/lib/finalization/induccionOperativaPayload.ts:94`, `src/lib/finalization/induccionOperativaPayload.ts:101`, `src/lib/finalization/induccionOperativaPayload.ts:102`). Agrega `failed_visit_applied_at` y `document_kind` tambien en `parsed_raw` (`src/lib/finalization/induccionOperativaPayload.ts:103`, `src/lib/finalization/induccionOperativaPayload.ts:105`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `operational_induction` (`src/lib/ods/rules-engine/rulesEngine.ts:477`). | La rama no consume `fecha_primer_seguimiento`, ajustes o observaciones; solo familia operativa + modalidad. `visita fallida` no cambia sugerencia. Test cubre payload, document kind y participantes (`src/lib/finalization/induccionOperativaPayload.test.ts:91`, `src/lib/finalization/induccionOperativaPayload.test.ts:94`). |
| Import: `program_presentation` | No hay `payload_normalized`; el perfil solicita fecha, modalidad, empresa y asistente, y prioriza `nombre_profesional` y `modalidad_servicio` (`src/lib/ods/import/processProfiles.json:6`, `src/lib/ods/import/processProfiles.json:18`, `src/lib/ods/import/processProfiles.json:32`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `program_presentation` (`src/lib/ods/rules-engine/rulesEngine.ts:560`). | La regla de promocion necesita gestion y cantidad de empresas; si faltan, usa default RECA y 1 empresa con menor confianza (`src/lib/ods/rules-engine/rulesEngine.ts:64`, `src/lib/ods/rules-engine/rulesEngine.ts:125`, `src/lib/ods/rules-engine/rulesEngine.ts:560`). |
| Import: `program_reactivation` | Perfil con fecha, empresa, asistente y prioridad de profesional/modalidad (`src/lib/ods/import/processProfiles.json:36`, `src/lib/ods/import/processProfiles.json:48`, `src/lib/ods/import/processProfiles.json:59`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `program_reactivation` (`src/lib/ods/rules-engine/rulesEngine.ts:545`). | La regla necesita gestion; si no detecta `compensar` o `reca`, usa default RECA y baja confianza (`src/lib/ods/rules-engine/rulesEngine.ts:64`, `src/lib/ods/rules-engine/rulesEngine.ts:545`). |
| Import: `accessibility_assessment` | Perfil de evaluacion con fecha, bloques de accesibilidad/ajustes, asistentes y prioridad de profesional/modalidad (`src/lib/ods/import/processProfiles.json:64`, `src/lib/ods/import/processProfiles.json:83`, `src/lib/ods/import/processProfiles.json:97`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `accessibility_assessment` (`src/lib/ods/rules-engine/rulesEngine.ts:601`). | `tamano_empresa` no aparece como field del perfil; si llega ausente, el motor no falla y usa default `hasta_50` con rationale de default (`src/lib/ods/rules-engine/rulesEngine.ts:76`, `src/lib/ods/rules-engine/rulesEngine.ts:93`). Esto puede sugerir tarifa de hasta 50 cuando la empresa real sea de 51+. |
| Import: `vacancy_review` | Perfil con fecha, modalidad, nombre de vacante, numero de vacantes, empresa/NIT, cargo y vacantes en prioridad; prohibe `numero_seguimiento` y `total_empresas` (`src/lib/ods/import/processProfiles.json:101`, `src/lib/ods/import/processProfiles.json:117`, `src/lib/ods/import/processProfiles.json:130`, `src/lib/ods/import/processProfiles.json:139`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `vacancy_review` (`src/lib/ods/rules-engine/rulesEngine.ts:440`). | Input alineado con la regla: `cargo_objetivo` y `total_vacantes` alimentan observaciones, pero el codigo depende de descripcion de tarifa y modalidad, no del numero de vacantes (`src/lib/ods/rules-engine/rulesEngine.ts:126`, `src/lib/ods/rules-engine/rulesEngine.ts:440`). |
| Import: `inclusive_selection` | Perfil con fecha, modalidad, oferente, cedula, discapacidad, cargo, asistentes; prioridad de cargo, participantes y modalidad (`src/lib/ods/import/processProfiles.json:143`, `src/lib/ods/import/processProfiles.json:158`, `src/lib/ods/import/processProfiles.json:173`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `inclusive_selection` (`src/lib/ods/rules-engine/rulesEngine.ts:494`). | Si el parser/Edge no arma `participantes`, el bucket cae a 1 por lista vacia y puede sugerir individual aunque el acta tenga mas oferentes. La regla solo mira el largo de `analysis.participantes` (`src/lib/ods/rules-engine/rulesEngine.ts:367`, `src/lib/ods/rules-engine/rulesEngine.ts:494`). |
| Import: `inclusive_hiring` | Perfil con fecha, modalidad, vinculado, cedula, discapacidad, cargo, fecha de firma y asistentes; prioridad de cargo, participantes y modalidad (`src/lib/ods/import/processProfiles.json:180`, `src/lib/ods/import/processProfiles.json:197`, `src/lib/ods/import/processProfiles.json:213`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `inclusive_hiring` (`src/lib/ods/rules-engine/rulesEngine.ts:520`). | Mismo riesgo de bucket que seleccion: si `participantes` llega incompleto, la regla clasifica por conteo incorrecto (`src/lib/ods/rules-engine/rulesEngine.ts:367`, `src/lib/ods/rules-engine/rulesEngine.ts:520`). |
| Import: `organizational_induction` | Perfil con fecha, modalidad, asistentes y fuentes de vinculado/cedula/cargo desde contratacion (`src/lib/ods/import/processProfiles.json:220`, `src/lib/ods/import/processProfiles.json:233`, `src/lib/ods/import/processProfiles.json:239`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `organizational_induction` (`src/lib/ods/rules-engine/rulesEngine.ts:477`). | No consume cargo ni participante para decidir codigo; si modalidad queda vacia, la rama no devuelve tarifa y cae a fallback low (`src/lib/ods/rules-engine/rulesEngine.ts:476`, `src/lib/ods/rules-engine/rulesEngine.ts:627`). |
| Import: `operational_induction` | Perfil con fecha, modalidad y datos generales; prioridad de profesional/modalidad (`src/lib/ods/import/processProfiles.json:251`, `src/lib/ods/import/processProfiles.json:267`, `src/lib/ods/import/processProfiles.json:277`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `operational_induction` (`src/lib/ods/rules-engine/rulesEngine.ts:477`). | Ignora secciones operativas extensas y asistentes por perfil (`src/lib/ods/import/processProfiles.json:251`), lo cual es suficiente para codigo actual porque la regla solo necesita familia y modalidad. |
| Import: `sensibilizacion` | Perfil con fecha, modalidad, asistentes y prioridad de profesional/modalidad (`src/lib/ods/import/processProfiles.json:281`, `src/lib/ods/import/processProfiles.json:293`, `src/lib/ods/import/processProfiles.json:302`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`. Entra a rama `sensibilizacion` (`src/lib/ods/rules-engine/rulesEngine.ts:459`). | No usa cantidad de asistentes ni temas; si modalidad no se extrae, cae a fallback low (`src/lib/ods/rules-engine/rulesEngine.ts:459`, `src/lib/ods/rules-engine/rulesEngine.ts:627`). |
| Import: `follow_up` | Perfil con fecha, modalidad, cargo ocupado y fechas de seguimiento; prioridad de `numero_seguimiento`, `cargo_objetivo` y modalidad (`src/lib/ods/import/processProfiles.json:308`, `src/lib/ods/import/processProfiles.json:320`, `src/lib/ods/import/processProfiles.json:339`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`; tambien llena `seguimiento_servicio` desde `numero_seguimiento` o filename (`src/lib/ods/rules-engine/rulesEngine.ts:251`, `src/lib/ods/rules-engine/rulesEngine.ts:578`). | Este soporte existe para PDF/import. No significa que la UI Seguimientos produzca `payload_normalized`; esa UI tiene runtime propio. Si no hay numero claro, el perfil instruye dejarlo vacio y marcar revision (`src/lib/ods/import/processProfiles.ts:257`, `src/lib/ods/import/processProfiles.ts:261`). |
| Import: `interpreter_service` | Perfil con fecha, empresa, NIT, interprete, oferente, cedula, `sumatoria_horas_interpretes` y `total_tiempo`; prioridad de interprete, horas, empresa, NIT, fecha y participantes (`src/lib/ods/import/processProfiles.json:345`, `src/lib/ods/import/processProfiles.json:357`, `src/lib/ods/import/processProfiles.json:376`). | `codigo_servicio`, `modalidad_servicio`, `valor_base`; observaciones automaticas si hay interprete y horas (`src/lib/ods/rules-engine/rulesEngine.ts:214`, `src/lib/ods/rules-engine/rulesEngine.ts:244`, `src/lib/ods/rules-engine/rulesEngine.ts:404`). | Input alineado con regla LSC. La rama tambien detecta visita fallida si llega `is_fallido` o texto con "fallido" (`src/lib/ods/rules-engine/rulesEngine.ts:405`). Este path contrasta con web `interprete-lsc`, que no usa el mismo `document_kind` ni nombres de horas. |

## Bugs detectados durante inventario

1. **Evaluacion web no activa la rama de accesibilidad.** El builder web marca
   `attachment.document_kind = "evaluacion_accesibilidad"`
   (`src/lib/finalization/evaluacionPayload.ts:61`), pero el motor solo tiene
   rama `accessibility_assessment`
   (`src/lib/ods/rules-engine/rulesEngine.ts:601`). Como el pipeline prefiere
   `payload_normalized.document_kind`, no reclasifica por heuristica
   (`src/lib/ods/import/pipeline.ts:257`). Resultado esperado desde codigo:
   sugerencia `low`, posiblemente con `modalidad_servicio`, sin
   `codigo_servicio` ni `valor_base` (`src/lib/ods/rules-engine/rulesEngine.ts:627`).

2. **Interprete LSC web no activa la rama LSC.** El builder web marca
   `lsc_interpretation` (`src/lib/finalization/interpreteLscPayload.ts:147`),
   pero la rama del motor exige `interpreter_service`
   (`src/lib/ods/rules-engine/rulesEngine.ts:404`). Ademas, el payload web
   emite `sumatoria_horas` y `sabana.horas`
   (`src/lib/finalization/interpreteLscPayload.ts:132`,
   `src/lib/finalization/interpreteLscPayload.ts:133`), mientras el motor lee
   `sumatoria_horas_interpretes` o `total_horas_interprete`
   (`src/lib/ods/rules-engine/rulesEngine.ts:421`). Resultado esperado desde
   codigo: sugerencia `low`, sin codigo LSC ni valor base automatico.

3. **Modalidad no inferida desactiva varias ramas.** Ocho ramas de codigo
   dependen de `modalidad.value` para ejecutar: `sensibilizacion`,
   `organizational_induction`, `operational_induction`, `inclusive_selection`,
   `inclusive_hiring`, `program_reactivation`, `program_presentation` y
   `follow_up` (`src/lib/ods/rules-engine/rulesEngine.ts:459`,
   `src/lib/ods/rules-engine/rulesEngine.ts:476`,
   `src/lib/ods/rules-engine/rulesEngine.ts:494`,
   `src/lib/ods/rules-engine/rulesEngine.ts:520`,
   `src/lib/ods/rules-engine/rulesEngine.ts:545`,
   `src/lib/ods/rules-engine/rulesEngine.ts:560`,
   `src/lib/ods/rules-engine/rulesEngine.ts:578`). Si el parser/formulario no
   entrega modalidad y `inferModalidad` tampoco la deduce, esas ramas se saltan
   silenciosamente y el motor cae al fallback `low` sin codigo
   (`src/lib/ods/rules-engine/rulesEngine.ts:627`). Esto puede ser un gap de
   cobertura transversal, no solo un problema de un formulario.

4. **Modalidad LSC viene del campo equivocado.** En `interprete-lsc`,
   `buildBaseParsedRaw` recibe `modalidad: section1Data.modalidad_profesional_reca`
   (`src/lib/finalization/interpreteLscPayload.ts:120`). Eso significa que el
   `modalidad_servicio` que llega al motor viene de la modalidad del profesional
   RECA, no de la modalidad del interprete del servicio. Si ambos campos difieren
   en el acta, el motor inferiria modalidad desde el campo equivocado. Este gap
   es independiente del mismatch `lsc_interpretation`/`interpreter_service`.

5. **Tamano de empresa no provisto.** `companySizeBucket` consume
   `tamano_empresa`, `tamano_empresa_servicio`, `size_bucket` o totales de
   trabajadores (`src/lib/ods/rules-engine/rulesEngine.ts:76`,
   `src/lib/ods/rules-engine/rulesEngine.ts:85`). Los payload builders web y el
   perfil import de accesibilidad no producen ese campo. No crashea: el motor
   usa default `hasta_50` (`src/lib/ods/rules-engine/rulesEngine.ts:93`).

## Out of scope hoy

- **Seguimientos UI.** El motor reconoce PDFs `follow_up`
  (`src/lib/ods/import/documentClassifier.ts:115`) y tiene perfil/rama para
  seguimiento (`src/lib/ods/import/processProfiles.json:308`,
  `src/lib/ods/rules-engine/rulesEngine.ts:578`). Pero la UI de Seguimientos
  usa runtime propio: guarda en Google Sheets y exporta PDF/links
  (`src/lib/seguimientosCase.ts:2815`,
  `src/lib/seguimientosCase.ts:3131`,
  `src/app/api/seguimientos/case/[caseId]/pdf/export/route.ts:36`), sin insertar
  `formatos_finalizados_il.payload_normalized`.
- **`attendance_support`.** Es clasificacion de soporte, no ODS candidate
  (`src/lib/ods/import/documentClassifier.ts:47`,
  `src/lib/ods/import/documentClassifier.ts:245`). El motor retorna
  `confidence: "low"` sin campos comparables
  (`src/lib/ods/rules-engine/rulesEngine.ts:400`).
- **`process_match` y `needs_review`.** Son clasificaciones de fallback del
  classifier (`src/lib/ods/import/documentClassifier.ts:205`,
  `src/lib/ods/import/documentClassifier.ts:217`). No son formularios ni
  perfiles con `payload_normalized`.

## Cobertura de tests existente

- Payload wrapper/base: `src/lib/finalization/payloads.test.ts:32`.
- Payloads web: seleccion, contratacion, evaluacion, inducciones e interprete
  LSC tienen tests directos de builder o ruta
  (`src/lib/finalization/seleccionPayload.test.ts:27`,
  `src/lib/finalization/contratacionPayload.test.ts:4`,
  `src/lib/finalization/evaluacionPayload.test.ts:9`,
  `src/lib/finalization/induccionOrganizacionalPayload.test.ts:24`,
  `src/lib/finalization/induccionOperativaPayload.test.ts:77`,
  `src/lib/finalization/interpreteLscPayload.test.ts:31`).
- Visita fallida se prueba como marca de auditoria en payloads finalizados
  (`src/lib/finalization/failedVisitAuditPayloads.test.ts:57`,
  `src/lib/finalization/failedVisitAuditPayloads.test.ts:224`).
- Clasificador y perfiles import tienen cobertura por `document_kind`
  (`src/lib/ods/import/documentClassifier.test.ts:5`,
  `src/lib/ods/import/processProfiles.test.ts:18`,
  `src/lib/ods/import/processProfiles.test.ts:66`).
- Pipeline Nivel 2 prueba unwrap de `payload_normalized` y precedencia de
  `parsed_raw.document_kind` sobre `attachment.document_kind`
  (`src/lib/ods/import/pipeline.test.ts:458`,
  `src/lib/ods/import/pipeline.test.ts:486`).
- Rules-engine cubre las familias principales, incluyendo LSC, seguimiento y
  accesibilidad (`src/lib/ods/rules-engine/rulesEngine.test.ts:56`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:163`,
  `src/lib/ods/rules-engine/rulesEngine.test.ts:248`).
