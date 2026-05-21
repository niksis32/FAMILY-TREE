/**
 * Берёт русское название из поля alternatenames GeoNames (если есть кириллица).
 * @param {string} asciiName
 * @param {string} alternatenames
 */
export function pickRussianName(asciiName, alternatenames) {
  if (!alternatenames?.trim()) return asciiName;

  const tokens = alternatenames.split(',').map((t) => t.trim()).filter(Boolean);

  const cyrillic = tokens.filter(
    (t) => /[А-Яа-яЁё]/.test(t) && !t.includes('=') && t.length <= 80,
  );

  if (cyrillic.length === 0) return asciiName;

  const exact = cyrillic.find((t) => /^[А-ЯЁ][А-Яа-яЁё\s\.\-'’]+$/.test(t));
  return exact ?? cyrillic[0] ?? asciiName;
}
