---
name: Integracion con Google Sheets y Drive
description: Como autenticar, escribir actas en Google Sheets y exportar a Drive desde Next.js y scripts locales
type: integration
updated: 2026-04-14
---

## Setup

### Runtime normal
```bash
# JSON completo del service account en una sola linea
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GOOGLE_SHEETS_MASTER_ID=1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU
```

### Runtime local alterno para validacion
El repo soporta una ruta local a la service account para no pegar el JSON inline cada vez:

```bash
# .env.google.local
GOOGLE_SERVICE_ACCOUNT_FILE=local-secrets/google-master-mapping-service-account.json
GOOGLE_SHEETS_MASTER_ID=1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU
```

Reglas:
- `.env.google.local` esta cubierto por `.gitignore`
- `local-secrets/` esta cubierto por `.gitignore`
- `src/lib/google/auth.ts` acepta `GOOGLE_SERVICE_ACCOUNT_JSON` o `GOOGLE_SERVICE_ACCOUNT_FILE`
- `next.config.ts` carga `.env.local` y `.env.google.local` al iniciar `next dev` o `next build`
- `scripts/verify-master-mapping.mjs` carga esos mismos archivos antes de autenticarse

Archivo de ejemplo versionado:
- `.env.google.local.example`

Ruta sugerida para la credencial local:
- `local-secrets/google-master-mapping-service-account.json`

## Verificacion local de mapping

Para inspeccionar la hoja maestra real sin tocar el runtime desplegado:

1. Copiar el JSON del service account a `local-secrets/google-master-mapping-service-account.json`
2. Crear `.env.google.local` a partir de `.env.google.local.example`
3. Ejecutar:

```bash
npm run verify:mapping -- --list-sheets
npm run verify:mapping -- --sheet-name "8. SENSIBILIZACION"
```

El script:
- usa `GOOGLE_SERVICE_ACCOUNT_JSON` si ya existe
- si no, usa `GOOGLE_SERVICE_ACCOUNT_FILE`
- acepta `--credentials <ruta>` para sobreescribir la credencial local
- acepta `--spreadsheet-id <id>` para apuntar a otro maestro

Este flujo sirve para contraste y verificacion de templates y mappings reales. No reemplaza la configuracion de Vercel.

## Vercel

- En Vercel, `GOOGLE_SERVICE_ACCOUNT_JSON` debe pegarse como JSON completo en una sola linea, sin comillas externas.
- Si Vercel rechaza el valor, volver a pegar el contenido crudo del `.json` original.
- Cualquier cambio de esta variable requiere redeploy.

## Cliente de Google

Archivo canonico:
- `src/lib/google/auth.ts`

Contrato:
- `getGoogleAuth()` autentica usando JSON inline o archivo local
- `getDriveClient()` retorna `google.drive`
- `getSheetsClient()` retorna `google.sheets`

Scopes compartidos:
```ts
[
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
]
```

## Hoja maestra

ID actual:
- `1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU`

Tabs plantilla esperados:
- `PLANTILLA_SENSIBILIZACION`
- `PLANTILLA_EVALUACION`
- `PLANTILLA_CONDICIONES`
- `PLANTILLA_SELECCION`
- `PLANTILLA_CONTRATACION`
- `PLANTILLA_INDUCCION_ORG`
- `PLANTILLA_INDUCCION_OP`
- `PLANTILLA_SEGUIMIENTO`

Para listar tabs exactos:
```bash
npm run verify:mapping -- --list-sheets
```

## Google Drive

Patron:
- usar `googleapis` con la misma service account
- separar lookup de folder, export PDF y upload
- centralizar auth en `src/lib/google/auth.ts`

Referencia legacy:
- `C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\drive_upload.py`

## Rotacion operativa de la clave

### Cuando rotar
- Si la clave actual se expuso o hay sospecha de filtracion
- Si Google revoca la clave
- Si se hace rotacion preventiva operativa

### Pasos
1. Crear nueva clave del service account en Google Cloud Console
2. Descargar el nuevo JSON y validar que corresponde al service account correcto
3. Reemplazar `GOOGLE_SERVICE_ACCOUNT_JSON` en Vercel y, si aplica, el archivo local apuntado por `GOOGLE_SERVICE_ACCOUNT_FILE`
4. Redeployar la app
5. Ejecutar una validacion minima de Sheets y Drive
6. Revocar la clave anterior cuando la nueva quede validada

### Revalidacion posterior
- Confirmar que `src/lib/google/auth.ts` parsea la credencial sin error
- Confirmar al menos un flujo de escritura en Sheets
- Confirmar al menos un flujo de Drive si ese formulario lo requiere
- Si la rotacion quedo solo local y no se desplego, dejarlo documentado como pendiente
