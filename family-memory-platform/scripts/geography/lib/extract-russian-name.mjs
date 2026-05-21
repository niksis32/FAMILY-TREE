import { latinToCyrillicRu } from './latin-to-cyrillic-ru.mjs';

/**
 * @param {string} asciiName
 * @param {string} alternatenames
 * @param {number} geonameId
 * @param {Map<number, string>} [ruNamesMap]
 */
export function resolveRussianPlaceName(asciiName, alternatenames, geonameId, ruNamesMap) {
  if (/[А-Яа-яЁё]/.test(asciiName)) return asciiName;

  const fromAlt = pickFromAlternatenames(asciiName, alternatenames);
  if (fromAlt !== asciiName && /[А-Яа-яЁё]/.test(fromAlt)) return fromAlt;

  if (ruNamesMap && geonameId && ruNamesMap.has(geonameId)) {
    return ruNamesMap.get(geonameId);
  }

  const transliterated = latinToCyrillicRu(asciiName);
  if (/[А-Яа-яЁё]/.test(transliterated)) return transliterated;

  return asciiName;
}

function pickFromAlternatenames(asciiName, alternatenames) {
  if (!alternatenames?.trim()) return asciiName;

  const tokens = alternatenames.split(',').map((t) => t.trim()).filter(Boolean);
  const cyrillic = tokens.filter(
    (t) => /[А-Яа-яЁё]/.test(t) && !t.includes('=') && t.length <= 80,
  );

  if (cyrillic.length === 0) return asciiName;

  const exact = cyrillic.find((t) => /^[А-ЯЁ][А-Яа-яЁё\s\.\-'’]+$/.test(t));
  return exact ?? cyrillic[0] ?? asciiName;
}

/** @deprecated use resolveRussianPlaceName */
export function pickRussianName(asciiName, alternatenames) {
  return resolveRussianPlaceName(asciiName, alternatenames, 0);
}
