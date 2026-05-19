import { PlaceholderCard } from '@family/ui';

/** Dashboard — MVP landing; replace with stats and recent activity */
export default function HomePage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-family-primary">
          AI Family Memory Platform
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          Self-hosted платформа семейного древа, медиаархива и timeline. Скелет MVP — итеративная
          разработка модулей.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard title="Люди">Модуль persons — итерация 2</PlaceholderCard>
        <PlaceholderCard title="Древо">D3 / Cytoscape — итерация 3</PlaceholderCard>
        <PlaceholderCard title="Архив">MinIO media — итерация 4</PlaceholderCard>
      </div>
    </div>
  );
}
