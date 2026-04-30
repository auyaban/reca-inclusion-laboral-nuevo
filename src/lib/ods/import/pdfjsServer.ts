// Helper para parsear PDFs en Node.js serverless (Vercel).
//
// Historia:
// - pdfjs-dist@5.x (incluso legacy build) requiere DOMMatrix/Path2D/ImageData
//   del browser. Los polyfills cubren eso, pero el "fake worker" de pdfjs
//   intenta cargar `pdf.worker.mjs` dinámicamente y Next.js no lo bundlea
//   en el output serverless → "Cannot find module pdf.worker.mjs".
// - `unpdf` es un wrapper de pdfjs-dist diseñado para serverless. Trae
//   pdfjs-dist 4.x ya configurado sin worker (todo en main thread) y
//   exporta APIs idénticas a las que usábamos.
//
// Ambas APIs públicas devuelven un PDFDocumentProxy compatible con la
// interfaz de pdfjs-dist (numPages, getPage(i).getTextContent(), getMetadata()).

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  }>;
  getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
};

/**
 * Carga un PDF desde un ArrayBuffer/Uint8Array y devuelve un proxy
 * compatible con pdfjs-dist. Funciona en Node serverless (Vercel) sin
 * worker.
 */
export async function loadPdfDocument(
  data: ArrayBuffer | Uint8Array
): Promise<PdfDocumentProxy> {
  const { getDocumentProxy } = await import("unpdf");
  const u8 =
    data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  const doc = (await getDocumentProxy(u8)) as unknown as PdfDocumentProxy;
  return doc;
}

/**
 * Compatibilidad con el patrón previo `pdfjsLib.getDocument(...).promise`.
 * Los call-sites pueden seguir escribiendo:
 *
 *   const pdfjsLib = await loadPdfjs();
 *   const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
 */
export async function loadPdfjs(): Promise<{
  getDocument: (params: { data: ArrayBuffer | Uint8Array }) => {
    promise: Promise<PdfDocumentProxy>;
  };
}> {
  return {
    getDocument: ({ data }) => ({
      promise: loadPdfDocument(data),
    }),
  };
}
