import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { DashboardOverview } from '@/components/dashboard-overview';
import { PageHeader, Button } from '@/components/ui';

export default async function DashboardPage() {
  const t = await getTranslations('pages.dashboard');

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Link href="/persons">
            <Button>{t('addPerson')}</Button>
          </Link>
        }
      />

      <DashboardOverview />
    </div>
  );
}
