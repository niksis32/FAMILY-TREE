'use client';

interface DocumentViewerProps {
  downloadUrl: string | null;
  mimeType: string;
  title: string;
  loading?: boolean;
  loadingLabel?: string;
}

/** Embedded document preview (PDF / images). Uses presigned MinIO URL. */
export function DocumentViewer({ downloadUrl, mimeType, title, loading, loadingLabel }: DocumentViewerProps) {
  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        {loadingLabel ?? '…'}
      </div>
    );
  }
  if (!downloadUrl) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        —
      </div>
    );
  }

  if (mimeType.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={downloadUrl} alt={title} className="max-h-[70vh] w-full rounded-2xl border object-contain" />
    );
  }

  if (mimeType === 'application/pdf') {
    return (
      <iframe
        title={title}
        src={downloadUrl}
        className="h-[70vh] w-full rounded-2xl border bg-stone-100 dark:bg-slate-900"
      />
    );
  }

  return (
    <p className="text-sm text-stone-600 dark:text-slate-400">
      <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-family-primary underline">
        Open file
      </a>
    </p>
  );
}
