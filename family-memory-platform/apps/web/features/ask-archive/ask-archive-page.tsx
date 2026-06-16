'use client';

import { useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { AskArchiveAnswerDto } from '@family/shared';

export function AskArchivePage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskArchiveAnswerDto | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Ask the Archive" description="Answers with citations and privacy guardrails." />
      <Card className="space-y-3">
        <textarea
          className="min-h-[120px] w-full rounded-xl border p-3 text-sm"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="When was Ivan born? What does the metric book say?"
        />
        <Button
          type="button"
          disabled={!token || !question.trim() || busy}
          onClick={async () => {
            if (!token) return;
            setBusy(true);
            try {
              const res = await apiClient.askArchive.ask({ question, language: 'ru' }, token);
              setAnswer(res);
            } finally {
              setBusy(false);
            }
          }}
        >
          Ask
        </Button>
      </Card>
      {answer ? (
        <Card className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{answer.answer}</p>
          <p className="text-xs text-amber-700">Uncertainty: {(answer.uncertaintyScore * 100).toFixed(0)}%</p>
          {answer.assumptions.map((a) => (
            <p key={a} className="text-xs text-stone-500">{a}</p>
          ))}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Sources</p>
            {answer.citations.map((c) => (
              <div key={`${c.sourceType}-${c.entityId}`} className="rounded-lg border p-2 text-xs">
                <p className="font-medium">{c.title}</p>
                <p className="text-stone-500">{c.excerpt}</p>
                <a href={c.deepLink} className="text-primary underline">{c.deepLink}</a>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
