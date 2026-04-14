---
name: Sensibilización — Handoff a S5
description: Estado técnico después de cerrar S4 y checklist de entrada para QA funcional y regresión final
type: handoff
updated: 2026-04-13
---

## Estado cerrado antes de S5

> Nota: este archivo conserva el punto de entrada a S5. El estado vigente después de aprobar QA y cerrar S6 quedó reflejado en `memory/roadmap.md`, `memory/forms_catalog.md` y `memory/form_production_standard.md`.

`Sensibilización` ya cerró S4 a nivel técnico.

Eso deja resuelto:

- shell largo reutilizable con cobertura automática mínima
- política explícita de asistentes por formulario
- `Sensibilización` usando `Profesional RECA + asistentes libres`
- defaults, restore y persistencia de asistentes centralizados en `src/lib/asistentes.ts`
- `Presentación/Reactivación` preservando `Profesional RECA + Asesor Agencia`

## Lo que quedó validado

- `npm run test` (`215/215`)
- `npm run lint`
- `npm run build`

Preview vigente para QA manual:

- App: [reca-inclusion-laboral-nuevo-7q9fv787c-auyabans-projects.vercel.app](https://reca-inclusion-laboral-nuevo-7q9fv787c-auyabans-projects.vercel.app)
- Inspector: [Vercel deployment](https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/CZEsj1fKSLmm9Estd86ZcoSYVWu5)

## Qué sigue abierto para S5/S6

- ejecutar QA funcional de `Sensibilización` sobre el preview actual
- correr QA de regresión de plataforma para el patrón reusable
- validar que `Presentación` siga estable con el modo explícito de asistentes
- cerrar documentación final y promover el playbook para `Inducción Operativa`

## Checklist mínimo sugerido para S5

1. `Sensibilización` muestra `Profesional RECA + asistentes libres`, sin fila fija de asesor.
2. Guardar/restaurar borrador de `Sensibilización` no reintroduce `Asesor Agencia`.
3. `Presentación` sigue mostrando la fila fija de `Asesor Agencia`.
4. Submit inválido y navegación de errores siguen sanos en ambos formularios.
5. Finalización de `Sensibilización` sigue escribiendo solo el Sheet.

## Referencias

- [AsistentesSection.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/shared/AsistentesSection.tsx)
- [asistentes.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/lib/asistentes.ts)
- [useLongFormSections.ts](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/hooks/useLongFormSections.ts)
- [SensibilizacionForm.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/SensibilizacionForm.tsx)
- [PresentacionForm.tsx](/C:/Users/aaron/Desktop/INCLUSION_LABORAL_NUEVO/src/components/forms/PresentacionForm.tsx)
