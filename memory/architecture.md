---
name: Arquitectura del proyecto
description: Decisiones durables del stack web y sus guardrails
type: architecture
updated: 2026-04-24
---

## Stack

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Formularios | React Hook Form + Zod |
| Auth y datos | Supabase |
| Integraciones externas | Google Sheets / Drive via API routes |
| Estado local | Zustand |
| Dictado | Supabase Edge Function + OpenAI transcribe |
| Deploy | Vercel |

## Decisiones durables

### Backend

- No hay backend separado; toda la logica server-side vive en `src/app/api/`.
- Supabase desde cliente se usa para auth y lecturas seguras; las escrituras criticas pasan por server-side.
- El schema Zod se comparte entre cliente y route para validar el mismo contrato.

### Formularios

- El patron por defecto es documento largo de una sola pagina.
- `Presentacion / Reactivacion` es la referencia canonica y `Sensibilizacion` el baseline reusable mas simple.
- `FormWizard` queda reservado a deuda legacy puntual; los formularios nuevos no nacen como wizard.

### Drafts

- El contrato shared combina autosave local + borrador remoto explicito.
- `activeDraftId` sigue siendo la identidad remota real del borrador.
- La URL nominal no debe exponer pseudo-sesiones `draft:<uuid>`.
- Abrir desde `?draft=` o desde `/hub` solo sirve como bootstrap; el editor luego vuelve al flujo nominal invisible.
- Durante finalizacion no deben correr checkpoints automaticos.
- El cleanup post-exito debe purgar artefactos locales y remotos sin dejar huerfanos.

### Finalizacion

- El pipeline comun es: validar -> preparar spreadsheet -> mutar Sheets -> export PDF si aplica -> persistir en Supabase.
- Lo especifico por formulario debe quedarse en payload builders, mappings y adaptadores.
- Templates, naming y control de prewarm deben salir de constantes/shared helpers; no de rutas ad hoc.

## Piezas shared que deben reusarse

- `LongFormShell`, `LongFormSectionNav`, `LongFormSectionCard`
- `AsistentesSection`, `RepeatedPeopleSection`, `DictationButton`
- `DraftPersistenceStatus`, `DraftLockBanner`, `FormSubmitConfirmDialog`, `FormCompletionActions`
- `useFormDraft`, `useFormDraftLifecycle`, `longFormHydration`

## Guardrails

- No fetch directo a Supabase sensible desde componentes.
- No dispersar nombres de tabs o templates de Google entre rutas y tests.
- La convencion del repo para proteccion es `src/proxy.ts`; no reintroducir `middleware.ts` sin migracion deliberada.
- Mantener alineadas las dependencias de framework y verificar con `npm run check:framework`.
- `/api/auth/lookup` falla en cerrado en `production` si falta o falla Upstash; no degradar silenciosamente a memoria.
