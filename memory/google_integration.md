---
name: Integracion con Google Sheets y Drive
description: Como escribir actas en Google Sheets y subir PDFs a Drive desde Next.js API Routes
type: integration
updated: 2026-04-12
---

## Setup

### Variable de entorno
```bash
# El JSON completo del service account, stringificado en una linea
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GOOGLE_SHEETS_MASTER_ID=1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU
```

**Donde esta el service account:**
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\service-account.json`

Para stringificarlo: `JSON.stringify(require('./service-account.json'))`

### Verificación local de mapping en el repo

Para inspección local del maestro sin tocar el runtime normal del proyecto:

- copiar la credencial JSON a `local-secrets/google-master-mapping-service-account.json`
- esa carpeta está ignorada por git
- usar `npm run verify:mapping -- --list-sheets` para listar pestañas
- usar `npm run verify:mapping -- --sheet-name "8. SENSIBILIZACIÓN"` para imprimir filas no vacías y revisar el mapping

Este flujo es solo para contraste y verificación de templates. No reemplaza `GOOGLE_SERVICE_ACCOUNT_JSON` del runtime.

### Vercel
- En Vercel, `GOOGLE_SERVICE_ACCOUNT_JSON` debe pegarse como JSON completo en una sola linea, sin comillas externas.
- Si Vercel rechaza el valor, volver a pegar el contenido crudo del `.json` original en lugar de una cadena escapada manualmente.
- Cualquier cambio de esta variable requiere redeploy para que las API routes tomen la nueva credencial.

### Dependencias a instalar
```bash
npm install googleapis
```

---

## Cliente de Google Sheets

**Archivo:** `src/lib/google/sheets.ts`

```typescript
import { google } from "googleapis";

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}
```

---

## Patron de API Route para Sheets

**Regla:** validar request con Zod, resolver cliente autenticado, escribir en Sheets y devolver siempre `NextResponse.json()`.

**Flujo esperado**
1. Parsear request.
2. Validar con schema Zod.
3. Resolver cliente de Sheets y, si aplica, de Drive.
4. Escribir cambios en la tab objetivo.
5. Devolver respuesta JSON consistente.

---

## Referencia: hoja maestra

**ID:** `1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU`

**Tabs plantilla esperados** (nombres a confirmar revisando la hoja):
- `PLANTILLA_SENSIBILIZACION`
- `PLANTILLA_EVALUACION`
- `PLANTILLA_CONDICIONES`
- `PLANTILLA_SELECCION`
- `PLANTILLA_CONTRATACION`
- `PLANTILLA_INDUCCION_ORG`
- `PLANTILLA_INDUCCION_OP`
- `PLANTILLA_SEGUIMIENTO`

**Para ver los nombres exactos:**
```typescript
const meta = await sheets.spreadsheets.get({ spreadsheetId: MASTER_ID });
const tabs = meta.data.sheets?.map((s) => s.properties?.title);
```

---

## Google Drive

**Archivo actual:** `src/lib/google/drive.ts`

**Patron:** usar `googleapis` con el mismo service account y separar helpers de folder lookup, export PDF y upload.

**Scopes necesarios:**
```typescript
scopes: [
  "https://www.googleapis.com/auth/drive.file",
]
```

**Referencia en Tkinter:**
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\drive_upload.py`

Funcion clave: `_perform_drive_upload_attempt` (linea ~1286)

---

## Rotacion operativa de la clave

### Cuando rotar
- Si la clave actual se expuso o hay sospecha de filtracion.
- Si Google revoca la clave o deja de aceptar autenticacion con la credencial actual.
- Si se hace rotacion preventiva operativa.

### Pasos de rotacion
1. Crear una nueva clave del service account en Google Cloud Console.
2. Descargar el nuevo JSON y verificar que corresponde al service account usado por la app.
3. Reemplazar `GOOGLE_SERVICE_ACCOUNT_JSON` en `.env.local` y en Vercel pegando el JSON completo en una sola linea.
4. Redeployar la app.
5. Ejecutar una validacion operativa minima del flujo de Google Sheets y Google Drive.
6. Revocar o eliminar la clave anterior cuando la nueva quede validada.

### Revalidacion posterior
- Confirmar que `src/lib/google/auth.ts` puede parsear la variable sin error.
- Confirmar al menos un flujo de escritura en Sheets y uno de exportacion/subida a Drive.
- Si la rotacion quedo solo local y no se desplego, documentarlo explicitamente como pendiente.

### Nota operativa
- La rotacion es manual.
- La rotacion no cambia el codigo ni el esquema, pero si requiere redeploy y revalidacion.
