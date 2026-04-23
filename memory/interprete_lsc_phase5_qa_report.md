# Intérprete LSC — Fase 5 QA y Readiness

Fecha: `2026-04-23`

## Previews

- Preview principal: `https://reca-inclusion-laboral-nuevo-33337hnpf-auyabans-projects.vercel.app`
- Inspector principal: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/6aXYopXRLRxd1GJkzLcN6dcgPsnB`
- Preview rehearsal prewarm: `https://reca-inclusion-laboral-nuevo-n0131wxp1-auyabans-projects.vercel.app`
- Inspector rehearsal: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/Fi5Uq7yDgoFVX5Cmk7y4f1CCsJwQ`

## Validacion local

- `npm test -- src/lib/google/draftSpreadsheet.test.ts src/app/api/formularios/prewarm-google/route.test.ts src/app/api/formularios/interprete-lsc/route.test.ts src/lib/finalization/finalizedRecord.test.ts`
- `npm run build`
- `npm run spellcheck`

## Validacion remota

- Finalizacion real OK en preview principal para:
  - base `1/1/2` -> `actaRef U2Z3GTPT`, `registroId 835a85f7-b75f-4a08-a21a-2e4df3f92bd9`
  - overflow `8/2/3` -> `actaRef UKTN28SJ`, `registroId fdef33ad-a38e-4e8a-8b38-e58108f63922`
- `formatos_finalizados_il` confirma:
  - `payload_raw` no nulo
  - `payload_source = form_web`
  - `payload_normalized.parsed_raw.tipo_acta = interprete_lsc`
- Google Sheets confirma:
  - archivos finales con solo `Maestro` visible
  - rehearsal prewarm base y overflow con solo `Maestro` visible
  - mapping correcto en base y overflow (`Sabana`, `sumatoria`, asistentes y overflow de oferentes/intérpretes`)
- Rehearsal de prewarm OK con plantilla LSC dedicada:
  - base -> spreadsheet `1UPqx4puokxhdKqfD8jHxC3KAFyrSEZV2IjziMuRkGY8`
  - overflow -> spreadsheet `1d_9eAR9dKxt2L8jugNFDlUS6O-66buCRmFR75lPBYlQ`
  - firmas estructurales correctas por overflow real

## Contrato PDF

- `pdfLink` se persiste y queda enlazado en `formatos_finalizados_il`.
- El link no es anónimo: redirige a login de Google.
- La service account no puede leer metadata del archivo por Drive API desde esta sesión.
- Estado operativo: contrato privado/protegido, no sharing público. Si QA producto necesita auditar nombre o contenido sin login, eso requiere follow-up aparte de política de sharing.

## Decision

- `Interprete LSC` queda listo para activar prewarm por `env`.
- Se mantiene fuera de `DEFAULT_PREWARM_PILOT_SLUGS` hasta que haya decisión explícita de rollout.

## Siguiente paso recomendado

1. Decidir si `interprete-lsc` entra al piloto vía `NEXT_PUBLIC_RECA_PREWARM_PILOT_SLUGS`.
2. Si hace falta auditoría manual del PDF sin login, abrir follow-up de sharing de Drive.
3. Retomar QA shared de prewarm o el preview pendiente de `Seguimientos`.
