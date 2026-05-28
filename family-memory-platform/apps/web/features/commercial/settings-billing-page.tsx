'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionPlanSummary } from '@family/shared';
import { PageHeader, Card, Button, Select, Input } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from './use-workspace-commercial';

export function SettingsBillingPage() {
  const { token, workspaceId, overview, error, loading, reload } = useWorkspaceCommercial();
  const [plans, setPlans] = useState<SubscriptionPlanSummary[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('FREE');
  const [billingEmail, setBillingEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void api.commercial.plans().then(setPlans).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (overview?.plan.code) setSelectedPlan(overview.plan.code);
    if (overview?.billingEmail) setBillingEmail(overview.billingEmail);
  }, [overview]);

  async function applyPlan() {
    if (!token || !workspaceId) return;
    setStatus(null);
    try {
      await api.commercial.changePlan(workspaceId, selectedPlan, token);
      setStatus('Тариф обновлён (без платёжного шлюза — только архитектура).');
      await reload();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function saveBillingEmail() {
    if (!token || !workspaceId) return;
    setStatus(null);
    try {
      await api.commercial.updateBillingEmail(workspaceId, billingEmail, token);
      setStatus('Billing email сохранён.');
      await reload();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Загрузка…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Биллинг и тариф"
        description="Подписка привязана к workspace. Платёжная система не подключена — только billing-ready сущности."
      />
      <Card>
        <h2 className="text-lg font-semibold">Текущий план</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
          {overview?.plan.name} — {overview?.subscriptionStatus}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {overview?.usage.map((u) => (
            <div key={u.metric} className="rounded-lg border border-stone-200 p-3 dark:border-slate-700">
              <div className="text-xs uppercase text-stone-500">{u.metric}</div>
              <div className="mt-1 font-medium">
                {u.used} / {u.limit} ({u.percentUsed}%)
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Сменить тариф (sandbox)</h2>
        <Select className="mt-4" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button className="mt-4" type="button" onClick={() => void applyPlan()}>
          Применить план
        </Button>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Billing account</h2>
        <Input
          className="mt-4"
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
          placeholder="billing@example.com"
        />
        <Button className="mt-4" type="button" onClick={() => void saveBillingEmail()}>
          Сохранить email
        </Button>
      </Card>
      {status ? <p className="text-sm text-stone-600">{status}</p> : null}
    </div>
  );
}
