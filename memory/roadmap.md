---
name: Roadmap de implementación
description: Plan paso a paso de todo lo que queda por construir, en orden de dependencia
type: roadmap
updated: 2026-04-13
---

## Regla operativa

- Este archivo sigue siendo el **roadmap técnico y de dependencias** del proyecto.
- El backlog vivo, el QA abierto y las decisiones/iniciativas activas viven en Notion:
  - `20 — Pendientes priorizados`
  - `30 — QA y validación`
  - `40 — Iniciativas y decisiones`
- Cuando cambie el estado real de una fase, sincronizar roadmap + `memory/MEMORY.md` + la página canónica de Notion correspondiente.

---

## Fase 0 — Completada ✅

- [x] Setup Next.js 16 + TypeScript + Tailwind v4
- [x] Paleta de colores RECA (#81398A) en globals.css
- [x] Dependencias: Supabase JS, React Hook Form, Zod, lucide-react, shadcn utils
- [x] Página de login (`/`) — UI completa con validación Zod
- [x] Hub / menú principal (`/hub`) — 9 tarjetas de formularios
- [x] Estructura de carpetas del proyecto
- [x] Documentación: CLAUDE.md + archivos memory/
- [x] Reordenar Notion con capa canónica corta (`00` a `80`) para contexto rápido, backlog, QA y referencias

---

## Fase 1 — Autenticación con Supabase ✅ COMPLETA

- [x] `.env.local` con URL y publishable key (formato `sb_publishable_...`, NO anon JWT)
- [x] `src/lib/supabase/client.ts` — cliente browser con `@supabase/ssr`
- [x] `src/lib/supabase/server.ts` — cliente server con cookies
- [x] `src/proxy.ts` (≡ middleware) — protege `/hub` y `/formularios/*`, redirige si hay sesión en `/`
- [x] `src/hooks/useAuth.ts` — expone `user`, `session`, `loading`, `signOut()`
- [x] `LoginForm.tsx` — lookup `usuario_login` en tabla `profesionales`, luego `signInWithPassword()`
- [x] `HubMenu.tsx` — nombre de usuario desde sesión, logout funcional
- [x] Usuario de prueba: `aaron_vercel` / `Password1234`

---

## Fase 2 — Búsqueda de empresa (Section 1) ✅ COMPLETA

- [x] Input de búsqueda con debounce (300ms) en tabla `empresas` (1134 registros)
- [x] Lista de resultados con selección (nombre, NIT, ciudad, sede)
- [x] Al seleccionar: guarda empresa en Zustand store + `sessionStorage`
- [x] `src/lib/store/empresaStore.ts` — persiste en `sessionStorage`
- [x] Ruta dinámica `/formularios/[slug]` → renderiza `Section1Form`
- [x] Al seleccionar empresa → navega a `/formularios/[slug]/seccion-2`

---

## Fase 3 — Componentes UI base (shadcn/ui) ✅ COMPLETA

- [x] shadcn/ui inicializado con Tailwind v4
- [x] Button, Input, Textarea, Select, Checkbox, Label, Badge, Alert
- [x] `src/components/ui/FormField.tsx` — wrapper label+input+error+hint
- [x] `src/components/layout/FormWizard.tsx` — barra de progreso multi-paso

---

## Fase 4 — Formulario piloto: Presentación/Reactivación ✅ COMPLETA

- [x] Schema Zod: `src/lib/validations/presentacion.ts`
- [x] `PresentacionForm.tsx` migrado a documento largo de una sola página
- [x] Ruta canónica `/formularios/presentacion`
- [x] Ruta legacy `/formularios/presentacion/seccion-2` redirige preservando `draft`, `session` y `new`
- [x] Búsqueda y selección de empresa integradas dentro del mismo documento
- [x] Navegación lateral por secciones en desktop + navegación compacta en móvil
- [x] Textareas largos autoexpandibles como estándar para formularios largos
- [x] Flujo Google Sheets: copia template → escribe celdas → checkboxes → PDF → Drive
- [x] Guarda en `formatos_finalizados_il` en Supabase
- [x] Pantalla de éxito con links al Sheet y PDF

---

## Fase 4.1 — MVP piloto de Presentación/Reactivación ← FASE ACTUAL

- [x] Dejar comparativa legacy vs web en Notion para `Presentación/Reactivación`
- [x] Dejar matriz de mapping `maestro vs legacy vs web`
- [x] Cerrar decisión de mapping: el maestro vivo es la única fuente oficial de verdad
- [x] Cerrar decisión de validación: asistentes flexibles en `presentacion`
- [x] Crear checklist operativo del MVP piloto
- [x] Definir convención de trabajo por sesiones y fases en Notion
- [x] Implementar autoajuste de altura para filas modificadas en Google Sheets
- [x] Implementar Fase 1.5 de finalización: un solo spreadsheet por empresa en Drive
- [x] Reutilizar spreadsheet existente de la empresa cuando ya existe
- [x] Duplicar pestaña desde el maestro cuando la pestaña objetivo ya está ocupada
- [x] Ocultar pestañas no usadas antes de exportar PDF
- [x] Devolver link directo a la pestaña usada en el spreadsheet final
- [x] Validar `acuerdos_observaciones` largos en Sheet y PDF
- [x] Validar crecimiento de asistentes por encima del bloque base
- [x] Definir arquitectura de payloads: base común compartida + adaptador por formulario
- [x] Refactorizar `presentacion` y `sensibilizacion` para usar la base común de finalización
- [x] Agregar tests mínimos para helpers de Sheets y payloads
- [x] Validar reutilización real del spreadsheet de empresa en Drive
- [x] Validar que el PDF final ya no incluya pestañas no usadas
- [x] Ejecutar QA piloto de `Presentación/Reactivación`
- [ ] Abrir pruebas con usuarios

---

## Fase 4.2 — UX transversal de borradores + performance de finalización ✅ COMPLETA

- [x] Mover acción de guardado al panel de navegación de formularios largos
- [x] Mostrar estado separado de último cambio local y último cambio en la nube
- [x] Reutilizar `DraftPersistenceStatus` dentro del panel de navegación de formularios largos
- [x] Instrumentar tiempos del flujo de finalización en `presentacion` y `sensibilizacion`
- [x] Medir costo de: Drive folder lookup, spreadsheet lookup/create, tab resolution, writes, PDF export y persistencia final
- [x] Proponer y aplicar recorte de pasos no necesarios en web frente al legacy
- [x] Validar contra la tabla viva que `formatos_finalizados_il` acepta el insert mínimo útil
- [x] Mover `payload_raw` a Google Drive en `.reca_payloads` sin crear columnas nuevas
- [x] Guardar referencia `raw_payload_artifact` dentro de `payload_normalized.metadata`
- [x] Corregir acciones de pantalla final bloqueadas por pop-ups/navegación (`Abrir acta`, `Abrir PDF`, `Abrir acta y PDF`, `Volver al menú`)

---

## Fase 5 — Migrar los formularios restantes

**Orden sugerido** (de menor a mayor complejidad):

| # | Formulario | Slug | Estado |
|---|---|---|---|
| 1 | Sensibilización | `sensibilizacion` | ✅ Completo |
| 2 | Inducción Operativa | `induccion-operativa` | ⏳ Pendiente |
| 3 | Inducción Organizacional | `induccion-organizacional` | ⏳ Pendiente |
| 4 | Evaluación de Accesibilidad | `evaluacion` | ⏳ Pendiente |
| 5 | Contratación Incluyente | `contratacion` | ⏳ Pendiente |
| 6 | Selección Incluyente | `seleccion` | ⏳ Pendiente |
| 7 | Condiciones de la Vacante | `condiciones-vacante` | ⏳ Pendiente |
| 8 | Seguimientos | `seguimientos` | ⏳ Pendiente (lógica sub-registros) |

**Checklist de avance**

- [x] Sensibilización (`sensibilizacion`)
- [ ] Inducción Operativa (`induccion-operativa`)
- [ ] Inducción Organizacional (`induccion-organizacional`)
- [ ] Evaluación de Accesibilidad (`evaluacion`)
- [ ] Contratación Incluyente (`contratacion`)
- [ ] Selección Incluyente (`seleccion`)
- [ ] Condiciones de la Vacante (`condiciones-vacante`)
- [ ] Seguimientos (`seguimientos`)

**Para cada formulario:**
1. Leer `formularios/<nombre>/<nombre>.py` en el repo original
2. Extraer campos + validaciones → schema Zod
3. Extraer mapeo a columnas Sheets → API route
4. Construir `<Nombre>Form.tsx` usando los componentes reutilizables:
   - `useFormDraft` para autosave + borradores
   - `AsistentesSection` para la sección de asistentes
   - `DictationButton` para campos de texto largos
   - `FormWizard` o documento largo según convenga
5. Testear flujo completo (Sheets + Drive + Supabase)

---

## Fase 6 — Google Drive (subida de PDFs) ✅ COMPLETA

- [x] Generar PDF desde Google Sheet (exportar como PDF via Drive API)
- [x] Subir PDF a carpeta Drive de la empresa
- [x] Link al PDF en pantalla de éxito
- [x] Integrado en API route de Presentación como patrón estándar

---

## Fase 7 — Borradores y autosave ✅ COMPLETA

- [x] `useFormDraft` hook — autosave localStorage (debounce 800ms) + borradores Supabase
- [x] Tabla `form_drafts` en Supabase con RLS
- [x] `DraftBanner` — detecta borrador al entrar, ofrece Restaurar/Descartar
- [x] Botón "Borrador" en header del formulario
- [x] `clearDraft()` al finalizar el formulario
- [x] Optimización low-egress de borradores y catálogos — hub/count metadata-only + caché de `profesionales` y `asesores`
- [x] Hub persistente con drawer de borradores y deep link `?panel=drafts`
- [x] Apertura de formularios y borradores en nuevas pestañas desde el hub
- [x] Compatibilidad `/hub/borradores` → `/hub?panel=drafts`
- [x] Remoción de unicidad legacy en `form_drafts` para permitir múltiples actas del mismo formulario y empresa

---

## Fase 8 — Deploy en Vercel ✅ COMPLETA

- [x] Proyecto en Vercel conectado a GitHub (auto-deploy en push a `main`)
- [x] Variables de entorno configuradas en Vercel
- [x] MCP de Vercel configurado en Codex
- [x] MCP de Supabase configurado en Codex
- [x] URL producción: https://reca-inclusion-laboral-nuevo.vercel.app
- [ ] ⚠️ PENDIENTE: Verificar `GOOGLE_SERVICE_ACCOUNT_JSON` bien formateado en Vercel (re-pegar JSON completo sin saltos de línea extra)

---

## Fase 9 — Pulido y features adicionales

- [x] Dictado de voz con OpenAI `gpt-4o-mini-transcribe` via Supabase Edge Function `dictate-transcribe`
  - `DictationButton` componente reutilizable con MediaRecorder API
  - Integrado en formularios con textos largos
- [x] Hardening mínimo de auth y endpoints auxiliares (`/api/auth/lookup`, catálogos autenticados, login y búsqueda de empresas)
- [ ] Revisión ortográfica (migrar `text_review.py` → Edge Function)
- [ ] Notificaciones de formularios pendientes
- [ ] Vista de historial de actas por empresa
- [ ] Modo offline básico (service worker para borradores)
