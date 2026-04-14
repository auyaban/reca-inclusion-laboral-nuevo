---
name: Sensibilización — Handoff a S3
description: Estado validado después de cerrar S1/S2 y checklist de entrada para endurecimiento técnico
type: handoff
updated: 2026-04-13
---

## Estado cerrado antes de S3

`Sensibilización` ya cerró S1 y S2.

> Nota: este archivo conserva el punto de partida de S3. El estado vigente después de implementar esa fase quedó en `memory/sensibilizacion_s4_handoff.md`.

Esto significa que el formulario:

- ya no usa wizard
- ya vive en `/formularios/sensibilizacion`
- ya usa el shell largo reutilizable extraído desde `Presentación/Reactivación`
- ya pasó QA manual del refactor principal

El siguiente frente activo ya no es de estructura ni de contenido. Es de endurecimiento técnico y regresión.

## Lo que ya está cerrado

- Shell largo compartido con navegación lateral, tarjetas colapsables y sincronización por scroll.
- Ruta canónica en `/formularios/sensibilizacion`.
- Redirect de compatibilidad desde `/formularios/sensibilizacion/seccion-2` preservando `draft`, `session` y `new`.
- Empresa integrada dentro del mismo documento.
- Contenido útil acotado a `Empresa`, `Datos de la visita`, `Observaciones` y `Asistentes`.
- `Temas` y `Registro fotográfico` retirados de la web.
- Finalización restringida a Google Sheets; este formulario no genera PDF.
- Guardado de borradores funcionando dentro del layout final.
- Bug de `take over` entre pestañas corregido.
- Pantalla final estable después de finalizar, sin remontar el formulario.

## QA manual aprobada

Checks reportados como exitosos por QA manual:

1. El formulario abre sin empresa y muestra la sección para agregarla.
2. La navegación lateral funciona.
3. El guardado funciona correctamente.
4. El takeover entre pestañas quedó estable.
5. La finalización funciona.
6. La pantalla final ya no desaparece ni devuelve al mismo formulario.

## Estado técnico validado

- `npm run lint`
- `npm run test`
- `npm run build`

Último preview validado:

- App: [reca-inclusion-laboral-nuevo-7o7r1w9be-auyabans-projects.vercel.app](https://reca-inclusion-laboral-nuevo-7o7r1w9be-auyabans-projects.vercel.app)
- Inspector: [Vercel deployment](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/3nksB71NUewkH8hveYjtxVeHGLdm)

## Qué sí queda abierto para S3

- Endurecer la navegación de validación contra el layout final ya simplificado.
- Revalidar restore, reload y submit inválido usando solo las secciones activas del formulario.
- Cerrar la decisión funcional de `cargo` obligatorio en asistentes.
- Verificar si hace falta ampliar cobertura de tests alrededor de locking o navegación.

## Primera lista sugerida para S3

1. Decidir la regla de negocio de `cargo` obligatorio en asistentes.
2. Revisar `getSensibilizacionValidationTarget()` contra la estructura final (`visit`, `observations`, `attendees`).
3. Probar submit inválido en `Datos de la visita`, `Observaciones` y `Asistentes`.
4. Reprobar restore y reload de drafts sobre el layout final.
5. Evaluar si el bug de takeover requiere tests adicionales sobre locking/lifecycle.

## Referencias

- [SensibilizacionForm.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/SensibilizacionForm.tsx)
- [useFormDraftCheckpoint.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/formDraft/useFormDraftCheckpoint.ts)
- [useFormDraftLock.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/formDraft/useFormDraftLock.ts)
- [sensibilizacionSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/sensibilizacionSections.ts)
- [sensibilizacionValidationNavigation.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/sensibilizacionValidationNavigation.ts)
