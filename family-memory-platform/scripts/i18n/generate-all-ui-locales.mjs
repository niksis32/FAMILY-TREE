/**
 * Generate apps/web/i18n/locales/{code}.json from en.json via machine translation.
 *
 *   pnpm i18n:generate-all-ui-locales -- --priority
 *   pnpm i18n:generate-all-ui-locales -- --locales=uk,pl,it
 *   pnpm i18n:generate-all-ui-locales -- --all
 *   pnpm i18n:generate-all-ui-locales -- --all --force
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenMessages, unflattenMessages } from './lib/flatten-messages.mjs';
import { sleep, translateText } from './lib/translate-text.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const localesDir = join(root, 'apps/web/i18n/locales');
const enPath = join(localesDir, 'en.json');
const geonamesPath = join(root, 'packages/shared/src/data/geonames-locales.json');

const SKIP_LOCALES = new Set(['en']);
const MANUAL_LOCALES = new Set(['en', 'ru', 'de', 'fr', 'es', 'ar']);

const PRIORITY = [
  'uk', 'pl', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 'cs', 'sk', 'hu', 'ro', 'bg', 'el', 'tr',
  'he', 'zh', 'ja', 'ko', 'hi', 'bn', 'vi', 'th', 'id', 'ms', 'ca', 'hr', 'sr', 'sl', 'lt', 'lv',
  'et', 'ka', 'hy', 'az', 'kk', 'uz',
];

function parseArgs() {
  const args = process.argv.slice(2);
  let all = false;
  let priority = false;
  let force = false;
  let locales = null;
  let remaining = false;
  for (const arg of args) {
    if (arg === '--all') all = true;
    else if (arg === '--priority') priority = true;
    else if (arg === '--remaining') remaining = true;
    else if (arg === '--force') force = true;
    else if (arg.startsWith('--locales=')) locales = arg.slice('--locales='.length).split(',').map((s) => s.trim());
  }
  return { all, priority, remaining, force, locales };
}

function loadTargetCodes({ all, priority, remaining, locales }) {
  const geonames = JSON.parse(readFileSync(geonamesPath, 'utf8'));
  const allCodes = geonames.codes.filter((c) => !SKIP_LOCALES.has(c));
  if (locales?.length) return locales.filter((c) => c !== 'en');
  if (remaining) {
    return allCodes.filter((c) => !MANUAL_LOCALES.has(c) && !existsSync(join(localesDir, `${c}.json`)));
  }
  if (priority) return PRIORITY.filter((c) => allCodes.includes(c));
  if (all) return allCodes;
  console.error('Specify --priority, --remaining, --all, or --locales=uk,pl,...');
  process.exit(1);
}

async function translateLocale(flatEn, targetLang) {
  const out = {};
  const entries = Object.entries(flatEn);
  let i = 0;
  for (const [key, value] of entries) {
    i++;
    out[key] = await translateText(value, targetLang);
    if (i % 8 === 0) {
      process.stdout.write(`  ${targetLang} ${i}/${entries.length}\r`);
      await sleep(120);
    }
  }
  console.log(`  ${targetLang} done (${entries.length} strings)`);
  return out;
}

async function main() {
  const opts = parseArgs();
  const targets = loadTargetCodes(opts);
  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const flatEn = flattenMessages(en);

  mkdirSync(localesDir, { recursive: true });

  console.log(`Translating en.json → ${targets.length} locale(s)...`);

  for (const code of targets) {
    const outPath = join(localesDir, `${code}.json`);
    if (MANUAL_LOCALES.has(code) && !opts.force) {
      console.log(`skip ${code} (manual bundle)`);
      continue;
    }
    if (existsSync(outPath) && !opts.force) {
      console.log(`skip ${code} (exists, use --force)`);
      continue;
    }

    try {
      const flat = await translateLocale(flatEn, code);
      const messages = unflattenMessages(flat);
      const merged = { ...en, ...messages, pages: messages.pages ?? en.pages, localeNames: messages.localeNames ?? en.localeNames, localeGroups: messages.localeGroups ?? en.localeGroups, formHints: messages.formHints ?? en.formHints };
      writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    } catch (error) {
      console.error(`FAIL ${code}:`, error.message);
    }
    await sleep(400);
  }

  console.log('Syncing locale registry…');
  spawnSync(process.execPath, ['scripts/i18n/sync-ui-locales.mjs'], { cwd: root, stdio: 'inherit' });
}

main();
