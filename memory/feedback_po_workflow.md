---
name: PO workflow con checkpoints del Dev
description: Cuando actuo como PO y el Dev responde con un checkpoint, desplegar QA code + QA arquitectura en paralelo antes de guiar al Dev.
type: feedback
---

Cuando el usuario me pide actuar como PO de un Lead Dev y el Dev responde con un checkpoint o entrega de fase, NO aprobar/vetar directo. El flujo correcto es:

1. Desplegar dos agentes en paralelo (mismo mensaje, dos tool uses):
   - **QA de codigo** (`feature-dev:code-reviewer`): bugs, seguridad, calidad, convenciones del repo.
   - **QA de arquitectura** (`general-purpose` con prompt de arquitectura, o `feature-dev:code-explorer`): consistencia con patrones existentes, side effects, integracion con modulos vecinos, deuda tecnica introducida.
2. Recolectar ambos reportes.
3. Como PO, sintetizar y darle al Dev una sola guia: que aprobar tal cual, que ajustar, que vetar.

**Why:** El usuario establecio explicitamente este flujo PO → Dev → QA dual → PO. Aprobar checkpoints sin QA dual omite verificacion independiente y deja pasar errores que el Dev no detecto en self-review.

**How to apply:** Solo aplica cuando estoy actuando como PO de otro agente/dev en una sesion estructurada. Si el usuario solo pide review puntual, usar un solo agente. Si despliega multiples checkpoints en una sesion, repetir el patron en cada checkpoint.
