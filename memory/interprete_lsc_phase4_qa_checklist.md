# Interprete LSC - Fase 4 QA Checklist

Estado del corte: `preview`
Estado de prewarm: `mantener fuera del piloto hasta fixes`

## Preview

- Preview principal: `https://reca-inclusion-laboral-nuevo-jqco1so75-auyabans-projects.vercel.app`
- Inspector principal: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/pWCctW9ejcV1SKPPQ3LJZnHKpksW`
- Preview rehearsal prewarm: `https://reca-inclusion-laboral-nuevo-gm41nwd2q-auyabans-projects.vercel.app`
- Inspector rehearsal prewarm: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/2C8teuEksaHcaM5t9G3yLLwnjHku`
- Branch: `codex/MigracionLSC`
- Fecha de validacion: `2026-04-23`

## Automaticas

- [x] `npm test -- src/app/api/formularios/interprete-lsc/route.test.ts src/app/api/interpretes/route.test.ts src/components/layout/HubMenu.test.tsx src/lib/forms.test.ts`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run spellcheck`
- [x] Smoke UI minimo de `interprete-lsc`

## QA funcional del editor

- [x] Apertura desde `/hub` y acceso por tarjeta visible
- [x] Gate de empresa antes de editar
- [x] Render inicial con `1` oferente, `1` interprete y `2` asistentes
- [x] Primera fila de asistentes con `Profesional RECA`
- [ ] Guardado local/remoto de draft
- [ ] Restauracion por reload y reapertura desde borradores
- [ ] Takeover / solo lectura entre dos pestanas
- [ ] Creacion de interprete desde catalogo
- [ ] Uso de nombre libre de interprete sin crearlo en catalogo
- [ ] Validacion de tiempos por fila y `sumatoria_horas`
- [ ] `Sabana` activa / inactiva desde UI
- [ ] Overflow de oferentes `7 -> 8` desde UI
- [ ] Overflow de interpretes `1 -> 2` desde UI
- [ ] Overflow de asistentes `2 -> 3` desde UI
- [ ] Validacion de maximos `10 / 5 / 10`
- [ ] Submit invalido con navegacion al primer error
- [ ] Finalizacion exitosa desde UI con pantalla final y links `sheetLink + pdfLink`

Nota:
- Los checks del bloque superior cubren navegacion y shell via Playwright local.
- La finalizacion real de Fase 4 se valido en preview por API autenticada y contra salidas reales de Google Sheets / PDF / Supabase.

## Validacion de salidas reales

### Caso base `1 / 1 / 2`

- [x] Finalizacion backend real en preview
- [x] `sheetLink` y `pdfLink` devueltos por la route
- [x] Empresa / fecha / modalidades en posicion correcta en `Maestro`
- [x] Interprete, `Sabana`, `sumatoria_horas` y asistentes en posiciones correctas
- [x] Registro en `formatos_finalizados_il`
- [x] `payload_normalized.parsed_raw.tipo_acta = "interprete_lsc"`
- [ ] Sin hojas extra visibles
- [ ] `payload_raw` persistido
- [ ] PDF validado de extremo a extremo (nombre + contenido)

Evidencia:
- `actaRef`: `BDXXZM38`
- `registroId`: `2294ea4d-a95d-4d95-a7ab-e1429c4d9a83`
- Sheet: `https://docs.google.com/spreadsheets/d/1st-sh8Oqy9d7evYtmAfWftPPDqpGWsN0vquLhPWA_1g/edit#gid=1562069061`
- PDF: `https://drive.google.com/file/d/1UjUUS8l4dZ-bSxGpzXZP__T4C8ixkLe5/view?usp=drivesdk`

Hallazgos:
- El spreadsheet final deja visible `__RECA_TEMPLATE__ Maestro` ademas de `Maestro`.
- `payload_raw` quedo `null` en `formatos_finalizados_il`.
- El link de PDF existe, pero no se pudo validar nombre/contenido porque el archivo no quedo legible desde la sesion de QA usada para esta fase.

### Caso overflow minimo `8 / 2 / 3`

- [x] Finalizacion backend real en preview
- [x] `sheetLink` y `pdfLink` devueltos por la route
- [x] Corrimiento correcto de oferentes `7 -> 8`
- [x] Corrimiento correcto de interpretes `1 -> 2`
- [x] Corrimiento correcto de `Sabana`
- [x] Corrimiento correcto de `sumatoria_horas`
- [x] Corrimiento correcto de asistentes `2 -> 3`
- [x] Registro en `formatos_finalizados_il`
- [x] `payload_normalized.parsed_raw.tipo_acta = "interprete_lsc"`
- [ ] Sin hojas extra visibles
- [ ] `payload_raw` persistido
- [ ] PDF validado de extremo a extremo (nombre + contenido)

Evidencia:
- `actaRef`: `Q296F825`
- `registroId`: `190ebb5f-43e9-40a9-823a-3222d8bba523`
- Sheet: `https://docs.google.com/spreadsheets/d/1nkD3NTNriMDdF5iIdL_4xRHKr7XQLScVWpKhhXyXNjU/edit#gid=1562069061`
- PDF: `https://drive.google.com/file/d/1PAYQD3V8iBCs5ZZlaXJeGLjnJvcjU3wl/view?usp=drivesdk`

Hallazgos:
- El spreadsheet final vuelve a dejar visible `__RECA_TEMPLATE__ Maestro`.
- `payload_raw` quedo `null` en `formatos_finalizados_il`.
- El link de PDF existe, pero no se pudo validar nombre/contenido porque el archivo no quedo legible desde la sesion de QA usada para esta fase.

## Readiness de prewarm

- [x] Sin `NEXT_PUBLIC_RECA_PREWARM_ENABLED=true`, `interprete-lsc` no entra al rollout
- [x] `DEFAULT_PREWARM_PILOT_SLUGS` sigue sin incluir `interprete-lsc`
- [x] Rehearsal separado con `NEXT_PUBLIC_RECA_PREWARM_ENABLED=true`
- [x] Rehearsal separado con `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS=interprete-lsc`
- [x] La firma estructural responde a overflow real (`0/0/0` vs `1/1/1`)
- [ ] Prewarm listo para reuse / rebuild funcional
- [ ] Bundles / hojas correctas en prewarm

Hallazgos:
- En rollout default el endpoint responde `Prewarm deshabilitado.`, que es correcto.
- Con piloto activado por `env`, el endpoint deja de responder `disabled` y entra al flujo real.
- El rehearsal falla de forma determinista para base y overflow con `No existe la hoja "Maestro" en el archivo maestro.`.
- La causa operativa observada es consistente con un prewarm que sigue usando `GOOGLE_SHEETS_MASTER_ID` en vez de la plantilla LSC dedicada que si usa la finalizacion normal.

## Resultado

- Recomendacion prewarm: `mantener fuera del piloto hasta fixes`

- Hallazgos abiertos para Fase 5:
  - corregir prewarm de `interprete-lsc` para usar la plantilla LSC correcta y validar reuse / rebuild real
  - ocultar `__RECA_TEMPLATE__ Maestro` en el spreadsheet final
  - revisar por que `payload_raw` queda `null` en `formatos_finalizados_il`
  - validar sharing / accesibilidad del PDF final para poder auditar nombre y contenido
