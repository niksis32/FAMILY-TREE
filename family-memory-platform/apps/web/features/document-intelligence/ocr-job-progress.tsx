'use client';

interface OcrJobProgressProps {
  status: string | null;
  error?: string | null;
  onRetry?: () => void;
}

export function OcrJobProgress({ status, error, onRetry }: OcrJobProgressProps) {
  if (!status) return null;

  const label =
    status === 'QUEUED'
      ? 'В очереди…'
      : status === 'PROCESSING'
        ? 'Распознавание…'
        : status === 'COMPLETED'
          ? 'OCR завершён'
          : status === 'FAILED'
            ? `Ошибка: ${error ?? 'OCR failed'}`
            : status === 'SKIPPED'
              ? `Пропущено: ${error ?? 'AI/Redis unavailable'}`
              : status;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2 text-sm">
      <span>{label}</span>
      {(status === 'FAILED' || status === 'SKIPPED') && onRetry ? (
        <button type="button" className="text-primary underline" onClick={onRetry}>
          Повторить OCR
        </button>
      ) : null}
    </div>
  );
}
