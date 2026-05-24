/** Google Translate (gtx) for build-time UI string generation. Placeholders {name} preserved. */

const ICU_RE = /\{[^}]+\}/g;

function protectIcu(text) {
  const tokens = [];
  const safe = text.replace(ICU_RE, (match) => {
    const id = `__ICU${tokens.length}__`;
    tokens.push({ id, match });
    return id;
  });
  return { safe, tokens };
}

function restoreIcu(text, tokens) {
  let out = text;
  for (const { id, match } of tokens) {
    out = out.replaceAll(id, match);
  }
  return out;
}

function shouldSkipTranslation(text) {
  if (!text?.trim()) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^\/[a-z]/i.test(text)) return true;
  if (/^MinIO|PostgreSQL|Meilisearch|Swagger|GEDCOM|API|GeoNames|CRUD/i.test(text)) return true;
  return false;
}

export async function translateText(text, targetLang, sourceLang = 'en') {
  if (shouldSkipTranslation(text)) return text;
  if (targetLang === sourceLang) return text;

  const { safe, tokens } = protectIcu(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(safe)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'family-memory-platform-i18n/1.0' } });
  if (!res.ok) throw new Error(`translate ${targetLang} HTTP ${res.status}`);
  const data = await res.json();
  const translated = data?.[0]?.[0]?.[0];
  if (!translated) return text;
  return restoreIcu(translated, tokens);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
