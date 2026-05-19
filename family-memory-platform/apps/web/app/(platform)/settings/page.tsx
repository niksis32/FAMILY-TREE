import { PrivacyBadge } from '@/components/domain';
import { Button, Card, Input, PageHeader, Select } from '@/components/ui';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Настройки"
        description="Профиль, приватность, темы, будущие роли доступа и параметры self-hosted инсталляции."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Профиль</h2>
          <div className="mt-5 space-y-4">
            <Input defaultValue="Family Admin" />
            <Input defaultValue="demo@family.local" type="email" />
            <Button type="button">Сохранить</Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Приватность по умолчанию</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrivacyBadge level="public" />
            <PrivacyBadge level="family" />
            <PrivacyBadge level="private" />
          </div>
          <Select className="mt-5" defaultValue="family">
            <option value="public">Публично</option>
            <option value="family">Только семья</option>
            <option value="private">Приватно</option>
          </Select>
        </Card>
      </div>
    </div>
  );
}
