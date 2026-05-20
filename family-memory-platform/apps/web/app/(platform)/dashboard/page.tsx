import Link from 'next/link';
import { DashboardOverview } from '@/components/dashboard-overview';
import { PageHeader, Button } from '@/components/ui';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Панель семейной памяти"
        description="Единая точка управления семейным древом, медиаархивом, документами, timeline и будущими AI-модулями."
        action={
          <Link href="/persons">
            <Button>Добавить персону</Button>
          </Link>
        }
      />

      <DashboardOverview />
    </div>
  );
}
