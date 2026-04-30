export async function tryReadRecaMetadata(fileBuffer: ArrayBuffer): Promise<Record<string, unknown> | null> {
  try {
    // Legacy build compatible con Node.js serverless (Vercel).
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    const metadata = await pdfDoc.getMetadata();
    const info = metadata?.info as Record<string, unknown> | undefined;
    if (info && info["/RECA_Data"]) {
      const raw = info["/RECA_Data"];
      if (typeof raw === "string") {
        return JSON.parse(raw) as Record<string, unknown>;
      }
    }
  } catch {
    // PDF no tiene metadata RECA o pdfjs-dist no esta disponible
  }
  return null;
}
