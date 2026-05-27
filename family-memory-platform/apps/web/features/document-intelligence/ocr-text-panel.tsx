'use client';

function extractPlainText(ocr: unknown): string {
  if (!ocr || typeof ocr !== 'object') return '';
  const pages = (ocr as { pages?: Array<{ blocks?: Array<{ text?: string }> }> }).pages;
  if (!Array.isArray(pages)) return '';
  return pages
    .flatMap((p) => p.blocks ?? [])
    .map((b) => b.text ?? '')
    .join('\n\n');
}

interface OcrTextPanelProps {
  ocr: unknown;
}

export function OcrTextPanel({ ocr }: OcrTextPanelProps) {
  const text = extractPlainText(ocr);
  return (
    <div className="max-h-[55vh] overflow-auto rounded-2xl border bg-stone-50 p-4 text-sm leading-relaxed dark:bg-slate-950">
      <pre className="whitespace-pre-wrap font-sans text-stone-800 dark:text-slate-200">{text || '—'}</pre>
    </div>
  );
}
