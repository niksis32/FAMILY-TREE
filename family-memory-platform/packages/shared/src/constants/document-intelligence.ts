/** BullMQ queue for async document OCR after upload */
export const DOCUMENT_OCR_QUEUE = 'document-ocr';

export const OCR_ELIGIBLE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type OcrEligibleMimeType = (typeof OCR_ELIGIBLE_MIME_TYPES)[number];

export function isOcrEligibleMimeType(mimeType: string): mimeType is OcrEligibleMimeType {
  return (OCR_ELIGIBLE_MIME_TYPES as readonly string[]).includes(mimeType);
}
