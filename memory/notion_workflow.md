---
name: Flujo de trabajo en Notion
description: Convención para organizar sesiones, fases y documentación de migración en Notion
type: workflow
updated: 2026-04-12
---

## Página principal

- Página raíz de trabajo: [Inclusión Laboral Migración](https://www.notion.so/2ce40b9ccfd9805483f8f683d9d98449)
- Índice de sesiones: [Sesiones de trabajo](https://www.notion.so/34040b9ccfd981daa7f3e9832c9db518)

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

## Estructura recomendada en Notion

- Página raíz: organización general del proyecto
- `Sesiones de trabajo`: bitácora cronológica de trabajo
- `Revisión de agentes — repo legado RECA Inclusión Laboral`: snapshot del legacy
- Comparativas por formulario: legacy vs web
- Matrices de mapping: maestro vs runtime vs web
- Checklists: QA, MVP o cierre de fase

## Regla de documentación

- Después de cualquier cambio funcional relevante, decisión de arquitectura, hallazgo de QA o definición de fase:
  - actualizar la sesión de trabajo activa
  - actualizar la comparativa o matriz relacionada si aplica
  - dejar explícito qué quedó hecho, qué sigue pendiente y cuál es el siguiente paso
- Si el cambio todavía es local y no está desplegado, anotarlo explícitamente como pendiente de validación o despliegue
- Escribir solo lo mínimo necesario para recuperar contexto rápido; evitar explicaciones largas si no agregan valor operativo
- Si una página vieja ya no aplica y no conviene borrarla o Notion no deja reemplazarla limpio, marcar el título con `Deprecated` y enlazar qué página o ruta la sustituye

## Método para próximos formularios

1. Crear o reutilizar una sesión de trabajo
2. Hacer comparativa legacy vs web
3. Hacer matriz maestro vs runtime vs web
4. Cerrar decisiones de mapping y validación
5. Definir fases de trabajo del formulario
6. Ejecutar implementación y QA

## Referencias actuales

- [Comparativa de migración — Presentación/Reactivación (legacy vs web)](https://www.notion.so/33f40b9ccfd981688af3f6f6d8c8a9eb)
- [Matriz de mapping — Presentación/Reactivación (maestro vs legacy)](https://www.notion.so/33f40b9ccfd981efa28dee69e3627e77)
- [Checklist MVP — Presentación/Reactivación](https://www.notion.so/34040b9ccfd9815ca4ebddd6916d72d9)
- [2026-04-11 — MVP Presentación/Reactivación y orden de trabajo](https://www.notion.so/34040b9ccfd981649ad7ca7600b46e8f)
