---
name: Perfil del usuario
description: Solo developer en fundación sin ánimo de lucro, usa Claude Code como equipo completo
type: user
---

## Perfil

- **Rol:** Desarrollador único en fundación sin ánimo de lucro (RECA — Red Empleo con Apoyo, Bogotá, Colombia)
- **Herramienta principal:** Claude Code (Claude Pro) — es su equipo de desarrollo completo
- **Lenguaje nativo:** Python. No es desarrollador frontend profesional, aprende React en el proceso
- **Presupuesto de infraestructura:** $0 — todo debe correr en free tiers
- **Servicios actuales:** Supabase free, Google Workspace (non-profit grant), Claude Pro (único pago)

## Cómo trabajar con este usuario

- **Explicar decisiones técnicas** — no asumir conocimiento de React/TypeScript avanzado
- **Preferir soluciones simples** sobre elegantes cuando el resultado es el mismo
- **No sugerir servicios pagos** a menos que sea absolutamente necesario y el free tier no alcance
- **Contexto mínimo por sesión** — estructurar código en archivos pequeños para no quemar tokens
- **Confirmar antes de cambios grandes** — es el único mantenedor, un bug en prod es crítico
- **Español en toda la UI** — la app es para usuarios colombianos
- **Comentarios en código en español** cuando son orientados al usuario/negocio
- **Cuando haya commit o preview deploy de una fase activa**, incluir también los cambios locales pendientes del usuario si son compatibles con el objetivo actual; si hay conflicto, señalarlo antes de publicar
- **Notion debe ser operativo, no exhaustivo** — escribir lo mínimo útil para reanudar trabajo rápido y marcar como `Deprecated` lo que quede obsoleto pero no se borre

## App original de referencia

La app que se está migrando es un ejecutable Python/Tkinter de ~20k líneas en:
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL`

Está en producción y no se toca mientras se construye la versión web.
