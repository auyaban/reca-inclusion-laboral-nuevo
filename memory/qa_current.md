# QA actual

- Fecha: `2026-04-14`
- Frente: identificación visual de borradores (`C9.4`)
- Preview: `https://reca-inclusion-laboral-nuevo-pgz8k5zxw-auyabans-projects.vercel.app`
- Inspector: `https://vercel.com/auyabans-projects/reca-inclusion-laboral-nuevo/A3BNEuLkUDkyo889xxj8hrhYbotV`

## Verificar

- Crear dos drafts de `condiciones-vacante` para la misma empresa con distinto `nombre_vacante`; el drawer debe mostrar ambos claramente separados.
- Si dos drafts comparten empresa + formulario + título visible, el drawer debe agregar badge `Similar x/n`.
- Abrir, guardar y duplicar borradores desde el hub sin regresión en autosave, locks o takeover.

## Baseline técnico

- `npm run lint`
- `npm run test` → `258/258`
- `npm run build`
