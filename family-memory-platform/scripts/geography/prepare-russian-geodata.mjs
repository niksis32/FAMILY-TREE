/**
 * Дублирует GeoNames-файлы в cities/ru/ и подставляет русские названия.
 *
 * - RU.txt → RU.ru.txt (имя из alternatenames с кириллицей, иначе как в оригинале)
 * - admin1CodesASCII.txt → admin1CodesASCII.ru.txt (субъекты РФ на русском)
 * - countryInfo.txt → countryInfo.ru.txt (страны на русском, где есть в справочнике)
 *
 * Usage: pnpm geography:prepare:ru
 */
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { admin1NameRu } from './lib/ru-admin1-names.mjs';
import { countryNameRu } from './lib/ru-country-names.mjs';
import { loadGeonamesRuNamesMap } from './lib/geonames-ru-names-map.mjs';
import { resolveRussianPlaceName } from './lib/extract-russian-name.mjs';

const srcDir = join(process.cwd(), 'cities');
const outDir = join(process.cwd(), 'cities/ru');

function ensureOutDir() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
}

async function prepareRuCities() {
  const input = join(srcDir, 'RU.txt');
  const output = join(outDir, 'RU.ru.txt');
  if (!existsSync(input)) {
    console.error('Нет cities/RU.txt');
    return;
  }

  const ruNamesMap = await loadGeonamesRuNamesMap();
  let processed = 0;
  let withRu = 0;
  let transliterated = 0;
  const out = createWriteStream(output, { encoding: 'utf8' });
  const rl = createInterface({ input: createReadStream(input, { encoding: 'utf8' }), crlfDelay: true });

  for await (const line of rl) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 15) {
      out.write(`${line}\n`);
      continue;
    }

    const geonameId = Number.parseInt(parts[0], 10);
    const ascii = parts[1];
    const ru = resolveRussianPlaceName(ascii, parts[3], geonameId, ruNamesMap);
    if (ru !== ascii) {
      withRu += 1;
      if (!/[А-Яа-яЁё]/.test(ascii) && /[А-Яа-яЁё]/.test(ru)) transliterated += 1;
    }
    parts[1] = ru;
    out.write(`${parts.join('\t')}\n`);

    processed += 1;
    if (processed % 50000 === 0) {
      console.log(`RU.ru.txt: ${processed} строк, с русским именем: ${withRu}`);
    }
  }

  out.end();
  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  console.log(
    `RU.ru.txt готов: всего ${processed}, кириллица: ${withRu}, из них транслит: ${transliterated}`,
  );
}

function prepareAdmin1() {
  const input = join(srcDir, 'admin1CodesASCII.txt');
  const output = join(outDir, 'admin1CodesASCII.ru.txt');
  if (!existsSync(input)) {
    console.error('Нет cities/admin1CodesASCII.txt');
    return;
  }

  const lines = [];
  for (const line of readFileSync(input, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) {
      lines.push(line);
      continue;
    }
    const parts = line.split('\t');
    const code = parts[0]?.trim();
    if (code?.startsWith('RU.')) {
      parts[1] = admin1NameRu(code, parts[1]);
      if (parts[2]) parts[2] = parts[1];
    }
    lines.push(parts.join('\t'));
  }

  writeFileSync(output, lines.join('\n'), 'utf8');
  console.log(`admin1CodesASCII.ru.txt готов (${lines.length} строк)`);
}

function prepareCountryInfo() {
  const input = join(srcDir, 'countryInfo.txt');
  const output = join(outDir, 'countryInfo.ru.txt');
  if (!existsSync(input)) {
    console.error('Нет cities/countryInfo.txt');
    return;
  }

  const lines = [];
  for (const line of readFileSync(input, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) {
      lines.push(line);
      continue;
    }
    const parts = line.split('\t');
    const iso2 = parts[0]?.trim();
    if (iso2?.length === 2) {
      const ru = countryNameRu(iso2, parts[4]);
      if (ru) parts[4] = ru;
    }
    lines.push(parts.join('\t'));
  }

  writeFileSync(output, lines.join('\n'), 'utf8');
  console.log('countryInfo.ru.txt готов');
}

async function main() {
  ensureOutDir();
  console.log(`Источник: ${srcDir}`);
  console.log(`Результат: ${outDir}`);
  prepareCountryInfo();
  prepareAdmin1();
  await prepareRuCities();
  console.log('Готово. Дальше: pnpm geography:import:ru-full');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
