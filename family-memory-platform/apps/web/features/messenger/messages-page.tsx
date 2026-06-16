'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Paperclip, Plus, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { REALTIME_EVENTS, type ConversationSummary, type MessageSummary, type RealtimeEnvelope } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { useRealtime } from '@/features/collaboration/use-realtime';
import { useWorkspaceId } from '@/features/collaboration/use-workspace-id';
import { apiClient, formatApiError } from '@/lib/api-client';
import { uploadMessageAttachment } from './upload-message-attachment';

type WorkspaceMember = { userId: string; displayName: string | null; email: string; role: string };

export function MessagesPage() {
  const { session, isReady } = useAuth();
  const workspaceId = useWorkspaceId();
  const t = useTranslations('messages');
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('conversation'));
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await apiClient.messenger.listConversations(session.accessToken);
      setConversations(rows);
      if (!activeId && rows[0]) setActiveId(rows[0].id);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, activeId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await apiClient.messenger.listMessages(conversationId, session.accessToken);
      setMessages(res.items);
      await apiClient.messenger.markRead(conversationId, session.accessToken);
      void loadConversations();
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken, loadConversations]);

  const loadMembers = useCallback(async () => {
    if (!session?.accessToken || !workspaceId) return;
    setMembersLoading(true);
    try {
      const rows = await apiClient.commercial.members(workspaceId, session.accessToken);
      setMembers(
        rows
          .filter((m) => m.userId !== session.user.id)
          .map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            email: m.email,
            role: m.role,
          })),
      );
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setMembersLoading(false);
    }
  }, [session?.accessToken, session?.user.id, workspaceId]);

  useRealtime({
    token: session?.accessToken,
    workspaceId,
    enabled: Boolean(session?.accessToken && workspaceId),
    onEvent: (envelope: RealtimeEnvelope) => {
      if (envelope.event === REALTIME_EVENTS.MESSAGE_NEW) {
        const msg = envelope.payload as MessageSummary;
        if (msg.conversationId === activeId) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
        void loadConversations();
      }
      if (envelope.event === REALTIME_EVENTS.MESSAGE_READ) {
        void loadConversations();
      }
    },
  });

  useEffect(() => {
    if (!isReady) return;
    void loadConversations();
  }, [isReady, loadConversations]);

  useEffect(() => {
    if (!activeId || !session?.accessToken) return;
    void loadMessages(activeId);
  }, [activeId, session?.accessToken, loadMessages]);

  useEffect(() => {
    if (showNewChat) void loadMembers();
  }, [showNewChat, loadMembers]);

  async function sendMessage() {
    if (!session?.accessToken || !activeId || (!draft.trim() && pendingAttachments.length === 0)) return;
    try {
      const msg = await apiClient.messenger.sendMessage(
        activeId,
        { body: draft.trim() || t('attachmentOnly'), attachmentMediaIds: pendingAttachments },
        session.accessToken,
      );
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      setPendingAttachments([]);
      void loadConversations();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function startDirectChat(participantUserId: string) {
    if (!session?.accessToken) return;
    try {
      const conv = await apiClient.messenger.createDirect(participantUserId, session.accessToken);
      setShowNewChat(false);
      setActiveId(conv.id);
      void loadConversations();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function onPickFile(file: File | null) {
    if (!file || !session?.accessToken) return;
    setUploading(true);
    setError('');
    try {
      const mediaId = await uploadMessageAttachment(file, session.accessToken);
      setPendingAttachments((prev) => [...prev, mediaId]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setUploading(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <Button variant="secondary" onClick={() => setShowNewChat(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newChat')}
          </Button>
        }
      />
      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}

      {showNewChat ? (
        <div className="rounded-2xl border bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">{t('newDirectChat')}</h3>
            <button type="button" onClick={() => setShowNewChat(false)} aria-label={t('close')}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {membersLoading ? <p className="text-sm text-stone-500">{t('loading')}</p> : null}
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.userId}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-slate-800"
                  onClick={() => void startDirectChat(m.userId)}
                >
                  <span className="font-medium">{m.displayName ?? m.email}</span>
                  <span className="ml-2 text-xs text-stone-500">{m.role}</span>
                </button>
              </li>
            ))}
            {!membersLoading && members.length === 0 ? (
              <li className="text-sm text-stone-500">{t('noMembers')}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-2xl border bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-stone-400">{t('conversations')}</p>
          {loading ? <p className="px-2 text-sm text-stone-500">{t('loading')}</p> : null}
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ${activeId === c.id ? 'bg-family-primary text-white' : 'hover:bg-stone-100 dark:hover:bg-slate-800'}`}
                >
                  <span className="block font-medium">{c.title ?? c.participants.map((p) => p.displayName ?? p.email).join(', ')}</span>
                  {c.unreadCount > 0 ? <span className="text-xs opacity-80">{t('unread', { count: c.unreadCount })}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-[24rem] flex-col rounded-2xl border bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
          <header className="border-b px-4 py-3 dark:border-slate-800">
            <h2 className="font-medium">{active?.title ?? t('selectConversation')}</h2>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.senderId === session?.user.id ? 'ml-auto bg-family-primary text-white' : 'bg-stone-100 dark:bg-slate-800'}`}
              >
                <p className="text-xs opacity-70">{m.senderName ?? m.senderId}</p>
                <p>{m.body}</p>
                {m.attachments.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs opacity-90">
                    {m.attachments.map((a) => (
                      <li key={a.id}>📎 {a.fileName ?? a.mediaId}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
          <footer className="border-t p-3 dark:border-slate-800">
            {pendingAttachments.length > 0 ? (
              <p className="mb-2 text-xs text-stone-500">
                {t('attachmentsReady', { count: pendingAttachments.length })}
              </p>
            ) : null}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={uploading || !activeId}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('attach')}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                className="flex-1 rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('placeholder')}
                onKeyDown={(e) => e.key === 'Enter' && void sendMessage()}
              />
              <Button onClick={() => void sendMessage()} disabled={!activeId || uploading}>
                {t('send')}
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
