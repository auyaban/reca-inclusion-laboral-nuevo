---
name: Estándar productivo de formularios
description: Playbook reutilizable para migrar formularios al patrón productivo web sin reabrir bugs ya corregidos
type: guide
updated: 2026-04-14
---

## Propósito

Este archivo define cómo debe quedar un formulario para considerarse **listo para producción** dentro de RECA Inclusión Laboral.

No se centra solo en UI. También captura los aprendizajes operativos y técnicos que ya costó endurecer en `Presentación/Reactivación`, para que no se reabran en `Sensibilización` ni en los formularios que faltan por migrar.

## Decisión vigente

- El patrón productivo aprobado para formularios es **documento largo de una sola página**.
- `Presentación/Reactivación` es la **referencia canónica** del estándar productivo actual.
- `Sensibilización` ya convergió al shell largo productivo, cerró S1-S6 y queda aprobada como baseline operativa para las siguientes migraciones.
- Los siguientes formularios no deben nacer como wizard. Deben nacer sobre el estándar de documento largo y reutilizar el kit endurecido de `Presentación`.

## Política reusable de asistentes

- `AsistentesSection` ya no tiene una semántica única global; cada formulario debe declarar su `mode`.
- `Presentación/Reactivación` usa `Profesional RECA + Asesor Agencia`.
- `Sensibilización` usa `Profesional RECA + asistentes libres`.
- `Condiciones de la Vacante` queda alineado desde ya al modo `Profesional RECA + Asesor Agencia`.
- Ningún formulario nuevo debe asumir `Asesor Agencia` implícitamente en defaults, restore o finalización.

## Matriz de referencia

| Área | Presentación/Reactivación | Sensibilización actual | Target productivo |
|---|---|---|---|
| Patrón UX | Documento largo con secciones visibles, colapsables y navegación contextual | Documento largo simplificado con `Empresa`, `Datos de la visita`, `Observaciones` y `Asistentes` | Documento largo para todos los formularios |
| Navegación | Panel lateral de secciones con estado y salto contextual | Panel lateral reutilizable + scroll sync sobre el shell largo compartido | Navegación lateral reutilizable con estados `idle/active/completed/error` |
| Empresa | Integrada dentro del mismo documento | Integrada dentro del mismo documento con búsqueda o snapshot readonly | Integrada en el mismo documento, sin romper el contexto |
| Validación | Navega a la sección y campo inválido correctos | Ya navega por secciones con contrato endurecido y sin dependencia de `step` en la UI | Navegación robusta a error, incluida estructura compleja de RHF |
| Drafts | Ciclo endurecido con identidad lógica, takeover, cleanup y estado visible | Ya usa el mismo contrato, con precedencia explícita de restore y checkpoint validada en tests | Mismo contrato de drafts en todos los formularios |
| Submit inválido | Checkpoint en background, sin colgar UI | Ya adopta el patrón endurecido | Nunca bloquear UI ni duplicar drafts al invalidar |
| Pantalla final | Homogénea, con acciones de salida y apertura | Homogénea | Mantener un patrón único |
| Finalización server-side | Pipeline común Sheets + PDF + Drive + Supabase | Pipeline común Sheets + Supabase; este formulario no genera PDF | Reusar pipeline común; dejar por formulario solo el adaptador |
| Política de asistentes | `Profesional RECA + Asesor Agencia` | `Profesional RECA + asistentes libres` | Declarar modo explícito por formulario |
| Estado actual | Benchmark de producción | Primer caso cerrado de punta a punta del playbook | Base para siguientes migraciones |

## Qué debe reutilizar cada formulario nuevo

### 1. Shell de formulario productivo

El formulario debe montar un documento largo con:

- header consistente
- panel lateral de secciones
- tarjetas/secciones con estado visual
- CTA principal de `Finalizar`
- mensajes de error visibles sin romper el layout

Ese paso ya quedó cerrado: la baseline actual es `LongFormShell` + `LongFormSectionNav` + `LongFormSectionCard` + estados reutilizables (`LongFormLoadingState`, `LongFormDraftErrorState`, `LongFormSuccessState`, `LongFormFinalizeButton`).

### 2. Ciclo endurecido de borradores

Todo formulario debe usar el contrato completo de borradores:

- `useFormDraft`
- `useFormDraftLifecycle`
- estado visual con `DraftPersistenceStatus`
- manejo de borrador bloqueado con `DraftLockBanner`
- apertura por `draft` o `session`
- promoción `session -> draft`
- cleanup total local/remoto al finalizar o borrar

Ningún formulario debe implementar una variante propia de drafts por fuera de este contrato.

### 3. Normalización y defaults explícitos

Cada formulario debe tener:

- `getDefault<Form>Values()`
- `normalize<Form>Values()`
- `src/lib/<slug>Sections.ts` para IDs, labels, completitud y compatibilidad de drafts
- `src/lib/<slug>Hydration.ts` para restore/redirect del editor, apoyado en `src/lib/longFormHydration.ts` cuando aplique
- tests para defaults y restauración de borradores

El objetivo es que reload, restore y submit siempre operen sobre datos estables.

### 4. Navegación de validación endurecida

Cada formulario debe tener:

- helper `get<Form>ValidationTarget(...)`
- tests que cubran errores planos y errores anidados
- fallback seguro para arrays dispersos como `asistentes`

El usuario no debe quedar adivinando dónde falló el submit.

### 5. Bloques compartidos

Antes de crear UI nueva, revisar si aplica alguno de estos entrypoints:

- `AsistentesSection`
- `RepeatedPeopleSection`
- `DictationButton`
- `DraftPersistenceStatus`
- `DraftLockBanner`
- `FormSubmitConfirmDialog`
- `FormCompletionActions`

Si alguno ya resolvió un bug o edge case, debe reutilizarse.

En el caso de `AsistentesSection`, la reutilización correcta incluye declarar el modo del formulario en vez de heredar un último renglón fijo de asesor.

### 6. Pipeline común de finalización

La finalización de cada formulario debe apoyarse en el pipeline compartido:

- validación server-side con Zod
- `prepareCompanySpreadsheet`
- mutación de Sheets
- exportación PDF
- persistencia del payload raw
- inserción final en `formatos_finalizados_il`

La parte específica de cada formulario debe limitarse al mapping y al payload adapter.

## Definition of Done de un formulario productivo

Un formulario solo se considera listo para producción si cumple todo esto:

- sigue el patrón de documento largo
- integra empresa, contenido y asistentes en una sola experiencia
- usa el stack endurecido de borradores sin desviaciones
- tiene defaults y normalización explícitos
- tiene helper de navegación de errores con tests
- finaliza sobre el pipeline común de Google + Supabase
- muestra confirmación previa a publicar
- muestra pantalla final homogénea
- pasa QA específico del formulario
- pasa QA de regresión de plataforma

## QA de regresión obligatorio

Todo formulario migrado debe probar al menos estos casos, aunque el contenido del acta sea distinto:

1. Reload con cambios locales pendientes.
2. Recuperación del mismo draft tras refresh.
3. Guardado manual sin colgar la UI.
4. Submit inválido sin freeze ni runtime error.
5. Navegación al campo inválido correcto.
6. Apertura de draft bloqueado en modo lectura y takeover posterior.
7. Ausencia de drafts duplicados para el mismo trabajo lógico.
8. Contador del hub consistente con la lista visible.
9. Limpieza completa del draft al finalizar con éxito.
10. Acciones finales (`abrir acta`, `abrir PDF`, `volver al menú`) funcionando.

## Orden recomendado para cada migración

1. Comparar el formulario nuevo contra el legado y el maestro vivo.
2. Definir schema Zod, defaults y normalización.
3. Montarlo directamente como documento largo.
4. Reusar bloques endurecidos antes de escribir UI nueva.
5. Implementar adapter de finalización sobre el pipeline común.
6. Añadir tests mínimos de normalización y navegación de errores.
7. Ejecutar QA funcional del formulario.
8. Ejecutar QA de regresión del kit productivo.

## Uso inmediato con Sensibilización

`Sensibilización` ya validó este playbook como primer caso de convergencia real.

Lo que ya quedó probado:

- reemplazo completo del wizard por documento largo
- adopción del shell compartido con navegación lateral y tarjetas colapsables
- retiro de `Temas` y `Registro fotográfico` para dejar solo los bloques útiles del acta
- finalización restringida a Google Sheets cuando el formulario no necesita PDF
- QA manual aprobada para apertura, guardado, takeover entre pestañas y pantalla final
- S3 técnico cerrado para asistentes significativos, navegación de errores y restore/checkpoint
- S4 técnico cerrado para política explícita de asistentes, helpers compartidos por modo y cobertura automática del shell largo

Lo que ya quedó cerrado para tomarla como baseline productivo definitivo:

- S5: QA de regresión de plataforma aprobada
- S6: promoción del playbook para la siguiente migración

## Fases de trabajo para llevar Sensibilización a producción

### Fase S0 — Alineación funcional y delimitación del documento

Objetivo: cerrar qué entra en el documento largo y cómo se agrupan sus secciones antes de tocar UI.

- validar el contraste `legacy vs web vs maestro vivo`
- definir la estructura final de secciones del documento largo
- decidir qué bloques quedan informativos y cuáles editables
- confirmar que no falta ningún campo, texto fijo o reserva operativa del template

Salida esperada:

- estructura final del documento de `Sensibilización`
- lista cerrada de secciones y orden
- gaps conocidos frente al wizard actual

### Fase S1 — Convergencia del shell a documento largo

Objetivo: reemplazar el wizard por la misma experiencia base de formulario largo usada en `Presentación/Reactivación`.

- remover dependencia principal de `FormWizard`
- integrar header, CTA y layout de documento largo
- incorporar panel lateral de secciones
- montar tarjetas/secciones con estado visual
- dejar navegación por scroll y selección de sección

Salida esperada:

- `Sensibilización` ya no funciona como wizard
- el contenido completo vive en una sola página
- existe navegación lateral con estados

### Fase S2 — Cierre del contenido útil dentro del patrón canónico

Objetivo: dejar solo los bloques funcionalmente necesarios dentro del shell nuevo y retirar residuos del legacy que ya no aportan valor.

- integrar empresa dentro del documento
- conservar `Datos de la visita`, `Observaciones` y `Asistentes` como contenido real del acta
- retirar `Temas` y `Registro fotográfico` de la experiencia web
- conservar `DictationButton` y `AsistentesSection`

Salida esperada:

- todas las secciones útiles viven dentro del documento largo
- no queda contenido residual que agregue peso sin uso real

### Fase S3 — Endurecimiento de navegación, validación y borradores

Objetivo: cerrar los bugs de plataforma que ya costó resolver en `Presentación/Reactivación`.

- mapear validaciones a secciones en vez de pasos
- endurecer helper de navegación de errores para el nuevo layout
- mantener el ciclo completo de drafts dentro del shell nuevo
- validar que save manual, restore, takeover y cleanup sigan estables después del refactor
- asegurar que submit inválido siga haciendo checkpoint en background sin colgar UI

Salida esperada:

- navegación correcta al campo inválido dentro de la sección adecuada
- borradores funcionando con el mismo contrato de `Presentación/Reactivación`
- sin regresiones en recarga, refresh, takeover ni deduplicación

### Fase S4 — Pruebas de contrato y endurecimiento técnico ✅

Objetivo: dejar cubiertos los puntos que deben repetirse en los siguientes formularios.

- tests de `normalizeSensibilizacionValues()`
- tests de `getSensibilizacionValidationTarget()`
- pruebas de componentes/helpers si el refactor extrae shell o utilidades nuevas
- revisión de rutas, estados vacíos y estados de error

Salida esperada:

- cobertura mínima del contrato productivo de `Sensibilización`
- base reutilizable para siguientes formularios

### Fase S5 — QA funcional y QA de regresión de plataforma ✅

Objetivo: validar que el formulario no solo se vea bien sino que se comporte como formulario productivo real.

- ejecutar QA funcional completo de `Sensibilización`
- ejecutar checklist de regresión del estándar productivo
- validar borradores, finalización, pantalla final y retorno al hub
- validar preview si hace falta antes de merge/push

Salida esperada:

- `Sensibilización` aprobada como formulario listo para producción
- checklist reutilizable afinado para próximas migraciones

### Fase S6 — Cierre y promoción del playbook ✅

Objetivo: convertir el caso de `Sensibilización` en la plantilla operativa para `Inducción Operativa` y el resto.

- documentar qué partes ya quedaron reutilizables
- registrar qué faltó extraer todavía
- actualizar roadmap, memoria y Notion con el nuevo estado real
- usar este cierre como baseline para el siguiente formulario

Salida esperada:

- `Sensibilización` cerrada como formulario productivo
- kit y fases validados para el resto de migraciones

## Estado actual del playbook

- S0 cerrado: estructura del documento contrastada contra `legacy` y maestro vivo.
- S1 cerrado: `Sensibilización` convergió al shell largo reutilizable y a la ruta canónica.
- S2 cerrado: se dejaron solo los bloques útiles del formulario y la finalización quedó solo a Google Sheets.
- S3 cerrado a nivel técnico: asistentes significativos, navegación de validación y saneamiento de finalización endurecidos.
- QA manual de S1/S2 aprobada: apertura, guardado, takeover y pantalla final validados.
- Playbook cerrado sobre `Presentación/Reactivación` + `Sensibilización`.
- Siguiente frente recomendado: `Inducción Operativa`.
