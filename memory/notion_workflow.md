---
name: Flujo de trabajo en Notion
description: Estructura canónica de Notion para contexto corto, backlog, QA y documentación de migración
type: workflow
updated: 2026-04-12
---

## Página principal y orden de lectura

- Página raíz de trabajo: [Inclusión Laboral Migración](https://www.notion.so/2ce40b9ccfd9805483f8f683d9d98449)
- `00 — Start Here`: [Start Here](https://www.notion.so/34140b9ccfd98164a18fd0955593f5b2)
- `10 — Estado actual`: [Estado actual](https://www.notion.so/34140b9ccfd981aaad8ed0377eedb080)
- `20 — Pendientes priorizados`: [Pendientes priorizados](https://www.notion.so/34140b9ccfd981c8ac3bc614fde165be)
- `30 — QA y validación`: [QA y validación](https://www.notion.so/34140b9ccfd981fbb8d2c41f8fa81b5e)
- `40 — Iniciativas y decisiones`: [Iniciativas y decisiones](https://www.notion.so/34140b9ccfd9819ea122f59fc8cc8140)
- `50 — Formularios y migración`: [Formularios y migración](https://www.notion.so/34140b9ccfd9811a929bfd14f33b2664)
- `60 — Sesiones de trabajo`: [Sesiones de trabajo](https://www.notion.so/34040b9ccfd981daa7f3e9832c9db518)
- `70 — Legacy y referencias`: [Legacy y referencias](https://www.notion.so/34140b9ccfd981aeaa50c7b7e2bd39a2)
- `80 — Operación GitHub`: [Operación GitHub](https://www.notion.so/34040b9ccfd9806ca109f4890cdc887a)

## Regla principal

- La lectura por defecto ya no empieza por sesiones ni por páginas largas.
- Para recuperar contexto rápido, leer en este orden:
  1. `10 — Estado actual`
  2. `20 — Pendientes priorizados`
  3. `30 — QA y validación`
  4. `50 — Formularios y migración`
- `60 — Sesiones de trabajo` queda como bitácora cronológica.
- `70 — Legacy y referencias` solo se usa para contrastes, drift o migración de formularios nuevos.

## Presupuesto de lectura

- No leer más de 4 páginas de Notion por defecto.
- No hacer búsquedas amplias para “entender todo el proyecto”.
- Leer `30 — QA y validación` solo si la tarea toca QA, release, preview o validación.
- Leer `40 — Iniciativas y decisiones` solo si la tarea toca una decisión, fase o dirección de producto.
- Leer `50 — Formularios y migración` solo si la tarea toca formularios o migración.
- Abrir `60 — Sesiones de trabajo` solo si el contexto corto no alcanza para ejecutar.
- Abrir `70 — Legacy y referencias` solo si hace falta contrastar con el repo Tkinter o resolver drift.

## Convención obligatoria

- Crear una página por sesión con formato `YYYY-MM-DD — nombre de la sesión`
- Cada sesión debe documentar:
  - contexto
  - decisiones cerradas
  - fases de trabajo
  - hallazgos relevantes
  - siguiente paso recomendado
- Si una sesión abre una comparativa o una matriz nueva, enlazarla desde la sesión
- Si una sesión deja un checklist de QA o MVP, enlazarlo desde la sesión y desde la comparativa correspondiente

## Fuente de verdad

- El maestro vivo de Google Sheets es la única fuente oficial de verdad para mapping y layout operativo
- El runtime legacy solo se usa como apoyo temporal para entender reglas dinámicas durante construcción
- `docs/cell_maps/*` y notas auxiliares no son fuente primaria; si contradicen al maestro, se marcan como obsoletos

## Estructura actual en Notion

- `00 — Start Here`: capa de entrada corta para humanos y LLMs
- `10 — Estado actual`: estado canónico, fase vigente y siguiente paso recomendado
- `20 — Pendientes priorizados`: backlog vivo; no usar para historial cerrado
- `Pendientes — histórico`: archivo del backlog viejo y tareas ya cerradas
- `30 — QA y validación`: punto de entrada para checklist, resultados y previews relevantes
- `40 — Iniciativas y decisiones`: iniciativas activas y decisiones de producto/arquitectura ya cerradas
- `50 — Formularios y migración`: estado por formulario y patrón de trabajo para el siguiente
- `60 — Sesiones de trabajo`: detalle cronológico
- `70 — Legacy y referencias`: snapshot del repo Tkinter y reglas de contraste
- `80 — Operación GitHub`: instrucciones operativas de PR, preview y producción

## Presupuesto de escritura

- Actualizar primero una página canónica (`10`, `20`, `30`, `40` o `50`).
- Agregar una sola página de soporte adicional si hace falta detalle.
- Cada actualización debe responder solo:
  - qué quedó hecho
  - qué sigue pendiente
  - siguiente paso recomendado
  - estado `local`, `preview` o `producción`
- No duplicar en Notion contenido que ya vive mejor en código, tests, commits o `memory/roadmap.md`.
- No registrar exploración larga o intentos fallidos sin valor de reanudación.

## Regla de documentación

- Después de cualquier cambio funcional relevante, decisión de arquitectura, hallazgo de QA o definición de fase:
  - actualizar primero la página canónica más cercana (`10`, `20`, `30`, `40` o `50`)
  - actualizar la sesión de trabajo activa
  - actualizar la comparativa o matriz relacionada si aplica
  - dejar explícito qué quedó hecho, qué sigue pendiente y cuál es el siguiente paso
- Si el cambio mueve el backlog o el estado QA, no dejar la verdad repartida entre varias páginas largas
- Si el cambio todavía es local y no está desplegado, anotarlo explícitamente como pendiente de validación o despliegue
- Escribir solo lo mínimo necesario para recuperar contexto rápido; evitar explicaciones largas si no agregan valor operativo
- Si una página vieja ya no aplica y no conviene borrarla o Notion no deja reemplazarla limpio, marcar el título con `Deprecated` y enlazar qué página o ruta la sustituye

## Mapeo rápido de actualización

- Cambio de fase o estado global: `10 — Estado actual`
- Backlog vivo o siguiente trabajo: `20 — Pendientes priorizados`
- QA, previews, checklist o hallazgo: `30 — QA y validación`
- Decisión cerrada o iniciativa: `40 — Iniciativas y decisiones`
- Estado de formulario, comparativa o migración: `50 — Formularios y migración`

## Método para próximos formularios

1. Crear o reutilizar una sesión de trabajo
2. Hacer comparativa legacy vs web
3. Hacer matriz maestro vs runtime vs web
4. Cerrar decisiones de mapping y validación
5. Definir fases de trabajo del formulario
6. Ejecutar implementación y QA

## Referencias actuales

- [Estado actual](https://www.notion.so/34140b9ccfd981aaad8ed0377eedb080)
- [Pendientes priorizados](https://www.notion.so/34140b9ccfd981c8ac3bc614fde165be)
- [QA y validación](https://www.notion.so/34140b9ccfd981fbb8d2c41f8fa81b5e)
- [Iniciativas y decisiones](https://www.notion.so/34140b9ccfd9819ea122f59fc8cc8140)
- [Formularios y migración](https://www.notion.so/34140b9ccfd9811a929bfd14f33b2664)
- [Comparativa de migración — Presentación/Reactivación (legacy vs web)](https://www.notion.so/33f40b9ccfd981688af3f6f6d8c8a9eb)
- [Matriz de mapping — Presentación/Reactivación (maestro vs legacy)](https://www.notion.so/33f40b9ccfd981efa28dee69e3627e77)
- [Checklist MVP — Presentación/Reactivación](https://www.notion.so/34040b9ccfd9815ca4ebddd6916d72d9)
- [2026-04-11 — MVP Presentación/Reactivación y orden de trabajo](https://www.notion.so/34040b9ccfd981649ad7ca7600b46e8f)
- [Revisión de agentes — repo legado RECA Inclusión Laboral](https://www.notion.so/33f40b9ccfd9817cbab0c9c99df63ba5)
