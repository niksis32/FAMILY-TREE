import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

/**
 * Опциональный файл cities/alternateNamesRU.tsv: geonameId<TAB>ruName
 * Собрать из GeoNames alternateNamesV2 (isolanguage=ru):
 *   awk -F'\t' '$2=="ru" {print $1"\t"$3}' alternateNamesV2.txt > cities/alternateNamesRU.tsv
 */
export async function loadGeonamesRuNamesMap() {
  const path = join(process.cwd(), 'cities/alternateNamesRU.tsv');
  const map = new Map();
  if (!existsSync(path)) return map;

  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: true,
  });

  for await (const line of rl) {
    const [id, name] = line.split('\t');
    const geonameId = Number.parseInt(id, 10);
    const ru = name?.trim();
    if (geonameId && ru && /[А-Яа-яЁё]/.test(ru)) {
      map.set(geonameId, ru);
    }
  }

  console.log(`alternateNamesRU.tsv: ${map.size} русских имён`);
  return map;
}
