---
name: Integración con Google Sheets y Drive
description: Cómo escribir actas en Google Sheets y subir PDFs a Drive desde Next.js API Routes
type: integration
updated: 2026-04-04
---

## Setup

### Variable de entorno
```bash
# El JSON completo del service account, stringificado en una línea
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GOOGLE_SHEETS_MASTER_ID=1Gom7jSNE5TJkGBQ1wQrjPbcgyc6Pv8EwavythP9f4kU
```

**Dónde está el service account:**
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\service-account.json`

Para stringificarlo: `JSON.stringify(require('./service-account.json'))`

### Dependencias a instalar (Fase 4)
```bash
npm install googleapis
```

---

## Cliente de Google Sheets

**Archivo:** `src/lib/google/sheets.ts`

```typescript
import { google } from 'googleapis'

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export async function getSheetsClient() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

// Duplicar tab plantilla y escribir datos
export async function createActaTab(
  templateTabName: string,
  newTabName: string,
  data: Record<string, string>  // { "B5": "valor", "C8": "otro valor" }
) {
  const sheets = await getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_MASTER_ID!

  // 1. Obtener ID del tab plantilla
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const templateSheet = meta.data.sheets?.find(
    s => s.properties?.title === templateTabName
  )
  if (!templateSheet) throw new Error(`Tab plantilla "${templateTabName}" no encontrado`)

  // 2. Duplicar el tab
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        duplicateSheet: {
          sourceSheetId: templateSheet.properties!.sheetId,
          newSheetName: newTabName,
        }
      }]
    }
  })

  // 3. Escribir datos en celdas específicas
  const values = Object.entries(data).map(([range, value]) => ({
    range: `'${newTabName}'!${range}`,
    values: [[value]]
  }))

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: values,
    }
  })

  return newTabName
}
```

---

## Patrón de API Route para Sheets

**Ejemplo:** `src/app/api/sheets/sensibilizacion/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createActaTab } from '@/lib/google/sheets'
import { sensibilizacionSchema } from '@/lib/validations/sensibilizacion'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = sensibilizacionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data } = parsed
    const tabName = `Sens_${data.empresa_nit}_${data.fecha.replace(/-/g, '')}`

    // Mapeo de campos a celdas (extraído del .py original)
    const cellData = {
      'B5': data.empresa_nombre,
      'B6': data.empresa_nit,
      'B8': data.fecha,
      // ... resto del mapeo
    }

    await createActaTab('PLANTILLA_SENSIBILIZACION', tabName, cellData)

    return NextResponse.json({ success: true, tab: tabName })
  } catch (error) {
    console.error('Error escribiendo en Sheets:', error)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
```

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
const meta = await sheets.spreadsheets.get({ spreadsheetId: MASTER_ID })
const tabs = meta.data.sheets?.map(s => s.properties?.title)
```

---

## Google Drive (Fase 6 — pendiente)

**Archivo a crear:** `src/lib/google/drive.ts`

**Patrón:** Similar al cliente de Sheets, usando `googleapis` con el mismo service account.

**Scopes necesarios:**
```typescript
scopes: [
  'https://www.googleapis.com/auth/drive.file',  // subir archivos
]
```

**Referencia en Tkinter:**
`C:\Users\aaron\Desktop\RECA_INCLUSION_LABORAL\drive_upload.py`
Función clave: `_perform_drive_upload_attempt` (línea ~1286)
