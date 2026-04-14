---
name: Cierre de hardening post-QA
description: Resumen local de las 4 fases ejecutadas sobre el reporte QA original
type: summary
updated: 2026-04-14
---

## Alcance

Se ejecutaron 4 frentes sobre el reporte QA original:

1. Auth server-side en Supabase
2. Hardening de integración con Google
3. Serialización de checkpoints de drafts
4. Consistencia de modalidad + limpieza de código huérfano

## Qué quedó hecho

- Auth API: `getSession()` fue reemplazado por `getUser()` en las rutas server-side afectadas y `proxy.ts` pasó a validar claims server-side.
- Google auth: `GOOGLE_SERVICE_ACCOUNT_JSON` ahora falla con mensaje descriptivo si el JSON está mal formado.
- Google Drive: `getOrCreateFolder()` converge en una carpeta canónica aun bajo concurrencia.
- Drafts: el checkpoint remoto ahora serializa guardados automáticos y manuales sobre la misma identidad lógica y conserva el `draftId` efectivo durante timeouts visibles.
- Modalidad: `Mixta` quedó como valor canónico en formularios largos y el restore sigue aceptando payloads legacy con `Mixto`.
- Limpieza: se retiraron `src/components/layout/FormWizard.tsx`, `src/components/forms/presentacion/PresentacionSectionCard.tsx`, `src/components/forms/presentacion/PresentacionSectionNav.tsx` y `src/hooks/useDraftsCount.ts`.

## Qué no se hizo

- No se agregó preview deployment.
- No se hizo deploy.
- No se tocó `PresentacionForm.tsx` fuera del ruido preexistente que hoy rompe `npm run lint`.
- No se convirtió el hallazgo de modalidad en una migración destructiva de datos; quedó como compatibilidad progresiva.

## QA manual pendiente

- Revalidar `Presentación` creando un borrador nuevo y confirmando que la modalidad visible es `Mixta`.
- Restaurar un borrador o payload viejo con `Mixto` y confirmar que el formulario lo rehidrata como `Mixta`.
- En `Presentación`, disparar un checkpoint automático y luego un guardado manual para confirmar que no se cruzan ni duplican identidad.
- En `Sensibilización`, repetir guardado manual y restauración de draft para validar que la modalidad canónica sigue estable.
- Confirmar que la app no depende ya de `FormWizard` ni de los componentes `PresentacionSection*` eliminados.

## Estado

- Estado actual: local
- Verificación automática más reciente: `npm run test` OK (`232/232`)
- Bloqueo actual de lint: errores preexistentes en `src/components/forms/PresentacionForm.tsx`
