---
name: Estandar productivo de formularios
description: Playbook minimo para migrar o endurecer formularios sin reabrir bugs ya cerrados
type: guide
updated: 2026-04-24
---

## Regla base

- El patron productivo aprobado es documento largo de una sola pagina.
- `Presentacion / Reactivacion` es la referencia canonica.
- `Sensibilizacion` es el baseline reusable mas simple.
- Los formularios nuevos no deben nacer como wizard.

## Lo minimo que debe reusar cada formulario

### Shell y navegacion

- `LongFormShell`, `LongFormSectionNav`, `LongFormSectionCard`
- Header consistente, CTA final y errores visibles sin romper layout
- Helper de navegacion de validacion con tests

### Drafts

- `useFormDraft` y `useFormDraftLifecycle`
- `DraftPersistenceStatus` y `DraftLockBanner`
- Restore por `draft` o `session` solo como bootstrap
- La URL nominal no debe exponer `draft:<uuid>`
- Durante finalizacion no deben correr checkpoints automaticos
- El cleanup final debe borrar copia local y remota del mismo trabajo

### Datos y validacion

- Schema Zod compartido entre cliente y route
- `getDefault<Form>Values()` y `normalize<Form>Values()`
- `src/lib/<slug>Sections.ts` y `src/lib/<slug>Hydration.ts`
- Tests para defaults, restore y navegacion al primer error

### Bloques shared

- `AsistentesSection` con `mode` explicito
- `RepeatedPeopleSection` cuando haya personas repetibles
- `DictationButton` en narrativas largas
- `FormSubmitConfirmDialog` y `FormCompletionActions`

### Finalizacion

- Validacion server-side con Zod
- `prepareCompanySpreadsheet` o helper shared equivalente
- Payload builder y sheet mutation especificos por formulario
- PDF solo si el formulario realmente lo necesita
- Registro final en `formatos_finalizados_il`

## Politica reusable de asistentes

- `AsistentesSection` no tiene semantica global unica; cada formulario debe declarar su `mode`.
- `Presentacion / Reactivacion` usa `reca_plus_agency_advisor`.
- `Sensibilizacion` usa `reca_plus_generic_attendees`.
- Ningun formulario nuevo debe asumir `Asesor Agencia` por default en defaults, restore o finalizacion.

## Definition of Done

Un formulario solo cuenta como listo si:

- sigue el patron de documento largo o justifica explicitamente por que no
- usa el contrato shared de drafts sin variantes paralelas
- tiene defaults y normalizacion explicitos
- navega al campo invalido correcto
- finaliza sobre el pipeline comun
- muestra confirmacion previa y pantalla final coherente
- pasa QA funcional y QA de regresion de plataforma

## QA de regresion minima

1. Reload con cambios locales pendientes
2. Restore del mismo draft tras refresh
3. Guardado manual sin colgar UI
4. Submit invalido sin freeze
5. Navegacion al campo invalido correcto
6. Draft bloqueado en lectura + takeover posterior
7. Limpieza completa del draft al finalizar
8. Acciones finales funcionando

## Regla documental

- El estado vivo por formulario va en `forms_catalog.md`.
- El frente activo va en `roadmap.md`.
- No crear documentos separados por fase, preview o checklist de QA cerrada.
