/** BullMQ queue for async photo AI analysis */
export const PHOTO_ANALYSIS_QUEUE = 'photo-analysis';

export const IMAGE_MEDIA_MIME_PREFIX = 'image/';

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith(IMAGE_MEDIA_MIME_PREFIX);
}
