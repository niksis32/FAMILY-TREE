type OcrPagesShape = {
  pages?: Array<{ blocks?: Array<{ text?: string }> }>;
};

/** Flatten OCR pages/blocks into plain text for Document.ocrText and search indexing. */
export function extractPlainTextFromOcr(ocr: unknown): string {
  if (!ocr || typeof ocr !== 'object') return '';
  const pages = (ocr as OcrPagesShape).pages;
  if (!Array.isArray(pages)) return '';
  return pages
    .flatMap((page) => page.blocks ?? [])
    .map((block) => block.text ?? '')
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
