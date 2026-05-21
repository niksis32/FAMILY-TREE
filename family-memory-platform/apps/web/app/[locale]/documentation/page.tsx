'use client';

import { useState } from 'react';

type CommandBlockProps = {
  title: string;
  language: string;
  code: string;
  note?: string;
};

type DocSection = {
  title: string;
  summary: string;
  source: string;
  body: string[];
  commands: CommandBlockProps[];
};

const projectRoot = 'cd "/mnt/d/CURSOR/FAMILY TREE/family-memory-platform"';

const docSections: DocSection[] = [
  {
    title: '1. Локальная архитектура запуска',
    summary: 'Что работает в Docker, что запускается в Ubuntu/WSL и какие URL проверять.',
    source: 'docs/DOCKER_LOCAL_WINDOWS_VARIANT_A_INFRA_HOST_APPS.md',
    body: [
      'Текущий рекомендуемый режим разработки: Variant A.',
      'Docker держит инфраструктуру: PostgreSQL, Redis, MinIO и Meilisearch.',
      'Приложения Web и API запускаются из Ubuntu/WSL, поэтому изменения кода видны без пересборки Docker-образов.',
      'Главные адреса: Web http://localhost:3000, Swagger http://localhost:4000/docs, MinIO http://localhost:9001/login, Meilisearch http://localhost:7700.',
    ],
    commands: [
      {
        title: 'Проверить, что Docker виден из Ubuntu',
        language: 'bash',
        code: ['docker --version', 'docker compose version', 'docker ps'].join('\n'),
        note: 'Если Docker Desktop не запущен или не включена WSL Integration, docker ps упадёт.',
      },
      {
        title: 'Перейти в корень проекта',
        language: 'bash',
        code: projectRoot,
        note: 'Кавычки обязательны, потому что в пути FAMILY TREE есть пробел.',
      },
      {
        title: 'Проверить основные браузерные адреса',
        language: 'text',
        code: [
          'http://localhost:3000',
          'http://localhost:4000/docs',
          'http://localhost:9001/login',
          'http://localhost:7700/',
          'http://localhost:7700/health',
        ].join('\n'),
      },
    ],
  },
  {
    title: '2. Запуск после перезагрузки',
    summary: 'Минимальная последовательность команд, чтобы снова поднять локальный проект.',
    source: 'docs/DOCKER_LOCAL_WINDOWS_AFTER_REBOOT.md',
    body: [
      'После перезагрузки сначала запускается Docker Desktop, затем в Ubuntu проверяется инфраструктура.',
      'Если контейнеры family_postgres, family_redis, family_minio и family_meilisearch уже Up, повторно запускать инфраструктуру не нужно.',
      'API и Web держатся отдельными терминалами Ubuntu.',
    ],
    commands: [
      {
        title: 'Проверить контейнеры инфраструктуры',
        language: 'bash',
        code: [projectRoot, 'docker ps --filter "name=family_"'].join('\n'),
      },
      {
        title: 'Запустить инфраструктуру, если контейнеров нет',
        language: 'bash',
        code: [projectRoot, 'pnpm docker:infra'].join('\n'),
        note: 'Эквивалент: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d',
      },
      {
        title: 'Запустить API в первой вкладке Ubuntu',
        language: 'bash',
        code: [
          projectRoot,
          'export DATABASE_URL="postgresql://family_user:change_me_postgres@localhost:5432/family_platform?schema=public"',
          'pnpm --filter @family/shared build',
          'pnpm --filter @family/genealogy-core build',
          'pnpm --filter @family/api build',
          'node apps/api/dist/apps/api/src/main.js',
        ].join('\n'),
        note: 'Пароль change_me_postgres замените на фактический POSTGRES_PASSWORD из .env.',
      },
      {
        title: 'Запустить Web во второй вкладке Ubuntu',
        language: 'bash',
        code: [projectRoot, 'pnpm --filter @family/web dev'].join('\n'),
      },
    ],
  },
  {
    title: '3. Проверка сервисов',
    summary: 'Команды здоровья для PostgreSQL, Redis, MinIO, Meilisearch, API и Web.',
    source: 'docs/DOCKER_LOCAL_WINDOWS_SESSION_RUNBOOK.md',
    body: [
      'PostgreSQL и Redis нельзя проверять открытием в браузере: это не HTTP-сервисы.',
      'MinIO и Meilisearch имеют web-интерфейсы.',
      'Meilisearch может быть помечен Docker как unhealthy, но если /health возвращает available, для локального MVP это не блокирует работу.',
    ],
    commands: [
      {
        title: 'PostgreSQL принимает подключения',
        language: 'bash',
        code: 'docker exec family_postgres pg_isready -U family_user -d family_platform',
        note: 'Ожидаемо: accepting connections.',
      },
      {
        title: 'Redis отвечает PONG',
        language: 'bash',
        code: 'docker exec family_redis redis-cli ping',
      },
      {
        title: 'Meilisearch health из Ubuntu',
        language: 'bash',
        code: 'curl "http://localhost:7700/health"',
        note: 'Ожидаемо: {"status":"available"}',
      },
      {
        title: 'Meilisearch health из PowerShell',
        language: 'powershell',
        code: 'Invoke-RestMethod -Uri "http://localhost:7700/health"',
      },
      {
        title: 'Посмотреть логи Meilisearch',
        language: 'bash',
        code: 'docker logs family_meilisearch',
      },
    ],
  },
  {
    title: '4. Node.js и pnpm внутри Ubuntu',
    summary: 'Как проверить, что Ubuntu использует Linux Node.js/pnpm, а не Windows-версию.',
    source: 'docs/DOCKER_LOCAL_WINDOWS_VARIANT_A_INFRA_HOST_APPS.md',
    body: [
      'Для запуска Web/API из Ubuntu Node.js и pnpm должны быть установлены внутри Ubuntu.',
      'Плохой признак: pnpm берётся из /mnt/c/Program Files/nodejs/pnpm и падает с exec: node: not found.',
      'Правильный признак: node и pnpm находятся в /home/nik/.nvm/versions/node/...',
    ],
    commands: [
      {
        title: 'Проверить активные node и pnpm',
        language: 'bash',
        code: ['which node', 'node -v', 'which pnpm', 'pnpm -v'].join('\n'),
      },
      {
        title: 'Установить Node.js 20 и pnpm через nvm',
        language: 'bash',
        code: [
          'sudo apt update',
          'sudo apt install -y curl ca-certificates',
          'curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash',
          'source ~/.bashrc',
          'nvm install 20',
          'nvm use 20',
          'corepack enable',
          'corepack prepare pnpm@9.15.0 --activate',
          'hash -r',
          'node -v',
          'pnpm -v',
          'which node',
          'which pnpm',
        ].join('\n'),
      },
    ],
  },
  {
    title: '5. Перезапуск Web/Node.js после изменений',
    summary: 'Что делать, если после правок страницы или меню браузер показывает старую версию.',
    source: 'Практический случай текущей сессии и docs/LOCAL_COMMANDS_REFERENCE.md',
    body: [
      'Next.js dev-сервер обычно подхватывает изменения автоматически, но иногда старый процесс держит порт 3000 или сервер был запущен до появления нового маршрута.',
      'Если пункт меню не появился, страница даёт 404 или браузер показывает старую версию, нужно проверить процесс на 3000 и перезапустить Web из Ubuntu/WSL.',
      'Важно запускать Web именно из Ubuntu с Linux-версией node/pnpm. Если запустить из Windows после WSL, могут появиться проблемы с зависимостями Next.js/SWC.',
      'После перезапуска откройте страницу через Ctrl + F5, чтобы браузер не показал кэш.',
    ],
    commands: [
      {
        title: 'Ubuntu / WSL: найти процесс, который слушает 3000',
        language: 'bash',
        code: 'ss -ltnp | grep ":3000"',
        note: 'Если видите next-server, значит Web уже запущен и держит порт.',
      },
      {
        title: 'Ubuntu / WSL: найти Node/Next/pnpm процессы',
        language: 'bash',
        code: 'ps -ef | grep -E "next|node|pnpm" | grep -v grep',
      },
      {
        title: 'Ubuntu / WSL: остановить старый Next.js dev-сервер',
        language: 'bash',
        code: 'pkill -f "next dev --port 3000" || true\npkill -f "next-server" || true',
        note: 'Команда останавливает старый Web-процесс. API на 4000 она не трогает.',
      },
      {
        title: 'Ubuntu / WSL: переустановить зависимости, если Next/SWC сломан',
        language: 'bash',
        code: [projectRoot, 'CI=true pnpm install --frozen-lockfile'].join('\n'),
        note: 'Нужно после ошибочного install из Windows или при ошибках @next/swc-linux.',
      },
      {
        title: 'Ubuntu / WSL: заново запустить Web',
        language: 'bash',
        code: [projectRoot, 'pnpm --filter @family/web dev'].join('\n'),
        note: 'Терминал с этой командой должен оставаться открытым.',
      },
      {
        title: 'Windows PowerShell: проверить, что /documentation отвечает',
        language: 'powershell',
        code: 'Invoke-WebRequest -Uri "http://localhost:3000/documentation" -UseBasicParsing',
      },
    ],
  },
  {
    title: '6. Meilisearch: ручное добавление данных',
    summary: 'Как вручную создать индекс, добавить JSON-документ, искать и понять ошибку Bearer.',
    source: 'docs/LOCAL_COMMANDS_REFERENCE.md',
    body: [
      'Meilisearch не является файловым хранилищем. Он индексирует JSON-документы.',
      'Файлы, фото, видео и архивы должны храниться в MinIO, а в Meilisearch отправляется поисковая карточка: имя файла, описание, OCR-текст, URL/ключ в MinIO, даты, связанные люди.',
      'В Mini Dashboard на http://localhost:7700 можно выбрать индекс и искать, но основное добавление данных выполняется через HTTP API.',
      'Для авторизации обязателен заголовок Authorization: Bearer <MEILI_MASTER_KEY>.',
    ],
    commands: [
      {
        title: 'PowerShell: задать правильный Authorization header',
        language: 'powershell',
        code: [
          '$headers = @{',
          '  Authorization = "Bearer change_me_meilisearch_master_key"',
          '}',
        ].join('\n'),
        note: 'Ключ лучше брать из .env: MEILI_MASTER_KEY=...',
      },
      {
        title: 'PowerShell: неправильный вариант без Bearer',
        language: 'powershell',
        code: '$headers = @{ Authorization = "change_me_meilisearch_master_key" }',
        note: 'Такой заголовок приводит к ошибке missing_authorization_header.',
      },
      {
        title: 'PowerShell: создать индекс documents',
        language: 'powershell',
        code: [
          'Invoke-RestMethod \\',
          '  -Method Post \\',
          '  -Uri "http://localhost:7700/indexes" \\',
          '  -Headers $headers \\',
          '  -ContentType "application/json" \\',
          '  -Body \'{"uid":"documents","primaryKey":"id"}\'',
        ].join('\n').replaceAll('\\', '`'),
        note: 'Результат enqueued означает, что задача поставлена в очередь Meilisearch.',
      },
      {
        title: 'PowerShell: добавить поисковую карточку файла',
        language: 'powershell',
        code: [
          'Invoke-RestMethod \\',
          '  -Method Post \\',
          '  -Uri "http://localhost:7700/indexes/documents/documents" \\',
          '  -Headers $headers \\',
          '  -ContentType "application/json" \\',
          '  -Body \'[{"id":"file-1","title":"Семейное фото","fileName":"photo-archive-001.jpg","mediaKey":"family-media/photo-archive-001.jpg","type":"image/jpeg","text":"Архивное фото семьи","persons":["Иван Петров","Мария Петрова"],"year":1978}]\'',
        ].join('\n').replaceAll('\\', '`'),
        note: 'Это не загрузка самого файла. Это добавление JSON-описания файла в поиск.',
      },
      {
        title: 'Ubuntu / WSL: создать индекс через curl',
        language: 'bash',
        code: [
          'curl -X POST "http://localhost:7700/indexes" \\',
          '  -H "Authorization: Bearer change_me_meilisearch_master_key" \\',
          '  -H "Content-Type: application/json" \\',
          '  --data \'{"uid":"documents","primaryKey":"id"}\'',
        ].join('\n'),
      },
      {
        title: 'Ubuntu / WSL: добавить поисковую карточку файла',
        language: 'bash',
        code: [
          'curl -X POST "http://localhost:7700/indexes/documents/documents" \\',
          '  -H "Authorization: Bearer change_me_meilisearch_master_key" \\',
          '  -H "Content-Type: application/json" \\',
          '  --data \'[{"id":"file-1","title":"Семейное фото","fileName":"photo-archive-001.jpg","mediaKey":"family-media/photo-archive-001.jpg","type":"image/jpeg","text":"Архивное фото семьи","persons":["Иван Петров","Мария Петрова"],"year":1978}]\'',
        ].join('\n'),
      },
      {
        title: 'PowerShell: выполнить поиск по индексу',
        language: 'powershell',
        code: [
          'Invoke-RestMethod \\',
          '  -Method Post \\',
          '  -Uri "http://localhost:7700/indexes/documents/search" \\',
          '  -Headers $headers \\',
          '  -ContentType "application/json" \\',
          '  -Body \'{"q":"семейное фото"}\'',
        ].join('\n').replaceAll('\\', '`'),
      },
      {
        title: 'Ubuntu / WSL: выполнить поиск через curl',
        language: 'bash',
        code: [
          'curl -X POST "http://localhost:7700/indexes/documents/search" \\',
          '  -H "Authorization: Bearer change_me_meilisearch_master_key" \\',
          '  -H "Content-Type: application/json" \\',
          '  --data \'{"q":"семейное фото"}\'',
        ].join('\n'),
      },
    ],
  },
  {
    title: '7. Частые ошибки',
    summary: 'EADDRINUSE, unhealthy у Meilisearch и missing_authorization_header.',
    source: 'docs/DOCKER_LOCAL_WINDOWS_SESSION_RUNBOOK.md и docs/LOCAL_COMMANDS_REFERENCE.md',
    body: [
      'EADDRINUSE означает, что порт уже занят старым процессом.',
      'missing_authorization_header у Meilisearch чаще всего означает, что в Authorization забыли Bearer.',
      'unhealthy у family_meilisearch не всегда критичен, если http://localhost:7700/health отвечает available.',
    ],
    commands: [
      {
        title: 'Найти процесс Web на 3000 в Ubuntu',
        language: 'bash',
        code: 'ss -ltnp | grep ":3000"',
      },
      {
        title: 'Найти Node/Next процессы в Ubuntu',
        language: 'bash',
        code: 'ps -ef | grep -E "next|node|pnpm" | grep -v grep',
      },
      {
        title: 'Windows: посмотреть соединения по 3000',
        language: 'powershell',
        code: 'netstat -ano | Select-String ":3000"',
      },
      {
        title: 'Meilisearch: ошибка без Bearer',
        language: 'text',
        code: '{"message":"The Authorization header is missing. It must use the bearer authorization method.","code":"missing_authorization_header","type":"auth"}',
      },
    ],
  },
];

function CommandBlock({ title, language, code, note }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-700 bg-stone-950 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-800 bg-stone-900 px-4 py-2">
        <div>
          <p className="text-sm font-medium text-stone-100">{title}</p>
          <p className="text-xs text-stone-400">{language}</p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-md border border-stone-600 px-3 py-1 text-xs font-medium text-stone-100 transition hover:border-family-accent hover:text-family-accent"
        >
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-6 text-stone-100">
        <code>{code}</code>
      </pre>
      {note ? <p className="border-t border-stone-800 px-4 py-2 text-xs text-stone-400">{note}</p> : null}
    </div>
  );
}

/** Project documentation hub — compact UI over local markdown runbooks. */
export default function DocumentationPage() {
  return (
    <div className="space-y-6 pb-12">
      <section>
        <h2 className="text-2xl font-semibold text-family-primary">Документация</h2>
        <p className="mt-2 max-w-3xl text-stone-600">
          Быстрая рабочая памятка по локальному запуску проекта, Docker-инфраструктуре,
          Ubuntu/WSL, PowerShell и ручной работе с Meilisearch. Команды можно копировать
          кнопкой внутри каждого блока.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ['Web', 'http://localhost:3000'],
          ['Swagger/API', 'http://localhost:4000/docs'],
          ['MinIO', 'http://localhost:9001/login'],
          ['Meilisearch', 'http://localhost:7700'],
        ].map(([title, value]) => (
          <article key={title} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-family-primary">{title}</h3>
            <p className="mt-2 break-all text-sm text-stone-600">{value}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        {docSections.map((section, index) => (
          <details
            key={section.title}
            open={index === 0}
            className="group rounded-lg border border-stone-200 bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
              <span>
                <span className="block text-lg font-semibold text-family-primary">{section.title}</span>
                <span className="mt-1 block text-sm text-stone-600">{section.summary}</span>
                <span className="mt-2 block text-xs text-stone-400">Источник: {section.source}</span>
              </span>
              <span className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-500 group-open:bg-family-primary group-open:text-white">
                раскрыть
              </span>
            </summary>
            <div className="space-y-4 border-t border-stone-100 px-5 py-5">
              <div className="space-y-2 text-sm leading-6 text-stone-700">
                {section.body.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="space-y-4">
                {section.commands.map((command) => (
                  <CommandBlock key={command.title} {...command} />
                ))}
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
