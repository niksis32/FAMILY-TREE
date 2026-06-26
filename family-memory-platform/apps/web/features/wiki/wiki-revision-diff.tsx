'use client';

type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

function buildLineDiff(before: string, after: string): DiffLine[] {
  const left = before.split('\n');
  const right = after.split('\n');
  const max = Math.max(left.length, right.length);
  const out: DiffLine[] = [];

  for (let i = 0; i < max; i += 1) {
    const l = left[i];
    const r = right[i];
    if (l === r) {
      if (l !== undefined) out.push({ type: 'same', text: l });
      continue;
    }
    if (l !== undefined) out.push({ type: 'remove', text: l });
    if (r !== undefined) out.push({ type: 'add', text: r });
  }
  return out;
}

export function WikiRevisionDiff({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const lines = buildLineDiff(before, after);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-700">
      <div className="flex border-b border-stone-200 text-xs dark:border-slate-700">
        <span className="flex-1 px-3 py-2 text-stone-500">{beforeLabel}</span>
        <span className="flex-1 border-l border-stone-200 px-3 py-2 text-stone-500 dark:border-slate-700">
          {afterLabel}
        </span>
      </div>
      <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={
              line.type === 'add'
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : line.type === 'remove'
                  ? 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100'
                  : 'text-stone-700 dark:text-slate-300'
            }
          >
            {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
