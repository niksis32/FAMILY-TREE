/**
 * Maps ISO 639-1 codes without a dedicated UI JSON file to the closest fully translated locale.
 * Used until `pnpm i18n:generate-all-ui-locales` has created a file for that code.
 */
export const LOCALE_UI_FALLBACK = {
  // Slavic → Russian (uk/pl/cs/sk often have dedicated *.json after generate)
  be: 'ru',
  bs: 'ru',
  mk: 'ru',
  // Romance → Spanish / French
  pt: 'es',
  gl: 'es',
  oc: 'es',
  it: 'fr',
  rm: 'fr',
  ro: 'fr',
  ca: 'es',
  // Germanic → German
  nl: 'de',
  da: 'de',
  sv: 'de',
  no: 'de',
  nb: 'de',
  nn: 'de',
  fi: 'de',
  is: 'de',
  lb: 'de',
  // Other European
  el: 'fr',
  tr: 'de',
  hu: 'de',
  cs: 'ru',
  sk: 'ru',
  pl: 'ru',
  hr: 'ru',
  sr: 'ru',
  sl: 'ru',
  bg: 'ru',
  lt: 'ru',
  lv: 'ru',
  et: 'de',
  sq: 'fr',
  // RTL
  he: 'ar',
  fa: 'ar',
  ur: 'ar',
  // CJK / major Asian (generate dedicated files; fallback en until then)
  zh: 'en',
  ja: 'en',
  ko: 'en',
  hi: 'en',
  bn: 'en',
  vi: 'en',
  th: 'en',
  id: 'en',
  ms: 'en',
  // Turkic (generate tr, az, kk, uz separately)
  az: 'tr',
  kk: 'ru',
  uz: 'ru',
  ky: 'ru',
  tg: 'ru',
};
