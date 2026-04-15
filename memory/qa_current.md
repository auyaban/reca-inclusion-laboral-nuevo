# QA actual

- Fecha: `2026-04-15`
- Frente: `F5` — QA de `Contratacion` + `Seleccion`
- Branch: `codex/f5-qa-contratacion-seleccion`
- Preview: `https://reca-inclusion-laboral-nuevo-1yovu360y-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/AyqYxiuE8FbTMj6WPtaf7gxPLj6v`
- Estado: preview listo y baseline validado; pendiente QA manual de Arquitectura, Dev y funcional

## Verificar

- `Contratacion` individual: 1 vinculado, `desarrollo_actividad` unico, asistentes minimos, finalizacion con Sheet + PDF.
- `Contratacion` grupal: 2 o mas vinculados, bloques repetibles correctos, corrimiento de secciones posteriores y salida final consistente.
- `Seleccion` individual: 1 oferente, `ajustes_recomendaciones` + `nota`, `desarrollo_actividad` unico y finalizacion con Sheet + PDF.
- `Seleccion` grupal: 2 o mas oferentes, bloques repetibles correctos, corrimiento de secciones posteriores y salida final consistente.
- En ambos formularios: redirect desde `/formularios/[slug]/seccion-2`, guardado manual, autosave, recarga, restore, takeover y salto al primer error correcto.
- En ambos formularios: add/remove/collapse del bloque repetible y reinicio de la ultima persona visible en vez de dejar el array en cero.

## Baseline validado

- `npm run spellcheck` OK
- `npm run lint` OK
- `npm run test` OK (`388/388`)
- `npm run build` OK
