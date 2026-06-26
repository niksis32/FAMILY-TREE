'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-stone-100 px-1 dark:bg-slate-800">$1</code>');
  out = out.replace(
    /\[\[([^\]]+)\]\]/g,
    '<a href="/wiki/$1" class="text-amber-800 underline dark:text-amber-200">$1</a>',
  );
  out = out.replace(
    /@person:([a-z0-9]+)/gi,
    '<a href="/persons/$1" class="text-emerald-800 underline dark:text-emerald-200">@person:$1</a>',
  );
  return out;
}

export function WikiMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-3 list-disc space-y-1 pl-6">
        {listItems.map((item, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
      continue;
    }
    flushList();

    if (!line.trim()) {
      blocks.push(<div key={`sp-${blocks.length}`} className="h-2" />);
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="mt-4 text-lg font-semibold">
          {line.slice(4)}
        </h3>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-5 text-xl font-semibold">
          {line.slice(3)}
        </h2>,
      );
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="mt-6 text-2xl font-bold">
          {line.slice(2)}
        </h1>,
      );
      continue;
    }

    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className="leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }}
      />,
    );
  }
  flushList();

  return (
    <article className="prose max-w-none dark:prose-invert">
      {blocks.length ? blocks : <p className="text-stone-500">{content}</p>}
      <p className="mt-6 text-xs text-stone-500">
        <Link href="/wiki" className="underline">
          Wiki
        </Link>
      </p>
    </article>
  );
}
