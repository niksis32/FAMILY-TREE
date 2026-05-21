/**
 * Обратная транслитерация латинских названий GeoNames → кириллица (эвристика BGN/PCGN).
 * Не идеально, но лучше чем "Zelënyy" в интерфейсе.
 * @param {string} input
 */
export function latinToCyrillicRu(input) {
  const source = input?.trim();
  if (!source || /[А-Яа-яЁё]/.test(source)) return source;

  return source
    .split(/(\s+|-)/)
    .map((part) => {
      if (!/[A-Za-z]/.test(part)) return part;
      return transliterateToken(part);
    })
    .join('');
}

function transliterateToken(token) {
  let t = token.toLowerCase();

  t = t
    .replace(/ë/g, 'yo')
    .replace(/ü/g, 'yu')
    .replace(/é/g, 'e')
    .replace(/ó/g, 'o')
    .replace(/á/g, 'a');

  const multi = [
    ['shch', 'щ'],
    ['sch', 'щ'],
    ['zh', 'ж'],
    ['kh', 'х'],
    ['ts', 'ц'],
    ['ch', 'ч'],
    ['sh', 'ш'],
    ['yo', 'ё'],
    ['ye', 'е'],
    ['yu', 'ю'],
    ['ya', 'я'],
    ['yy', 'ый'],
    ['iy', 'ий'],
    ['oy', 'ой'],
    ['uy', 'уй'],
    ['ey', 'ей'],
    ['ay', 'ай'],
    ['skiy', 'ский'],
    ['skie', 'ские'],
    ['skaya', 'ская'],
    ['skoye', 'ское'],
    ['ovo', 'ово'],
    ['ev', 'ев'],
    ['in', 'ин'],
  ];

  for (const [from, to] of multi) {
    t = t.split(from).join(to);
  }

  const map = {
    a: 'а',
    b: 'б',
    v: 'в',
    w: 'в',
    g: 'г',
    d: 'д',
    e: 'е',
    z: 'з',
    i: 'и',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    f: 'ф',
    h: 'х',
    c: 'к',
    y: 'ы',
    j: 'й',
    x: 'кс',
    q: 'к',
  };

  let out = '';
  for (const ch of t) {
    out += map[ch] ?? ch;
  }

  if (/^[A-Z]/.test(token)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }

  return out;
}
