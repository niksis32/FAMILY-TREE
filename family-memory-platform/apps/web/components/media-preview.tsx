'use client';

import { FileText, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  mimeType: string;
  downloadUrl?: string | null;
  title?: string | null;
  className?: string;
}

export function MediaPreview({ mimeType, downloadUrl, title, className }: MediaPreviewProps) {
  if (!downloadUrl) {
    return (
      <div className={cn('flex h-full items-center justify-center text-stone-400', className)}>
        <FileText className="h-10 w-10 opacity-40" />
      </div>
    );
  }

  if (mimeType.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={downloadUrl}
        alt={title ?? 'media'}
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  if (mimeType === 'application/pdf') {
    return (
      <iframe
        title={title ?? 'PDF preview'}
        src={downloadUrl}
        className={cn('h-full w-full border-0 bg-white', className)}
      />
    );
  }

  if (mimeType.startsWith('video/')) {
    return (
      <video src={downloadUrl} controls className={cn('h-full w-full object-contain bg-black', className)} />
    );
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center gap-4 bg-stone-900 p-6', className)}>
        <Music className="h-12 w-12 text-family-accent" />
        <audio src={downloadUrl} controls className="w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-2 text-stone-500', className)}>
      <Film className="h-10 w-10 opacity-50" />
      <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-family-primary underline">
        {title ?? 'Open file'}
      </a>
    </div>
  );
}
