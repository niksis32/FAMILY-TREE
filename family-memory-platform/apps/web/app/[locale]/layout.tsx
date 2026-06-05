import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { HtmlLocaleAttrs } from '@/components/html-locale-attrs';
import { APP_LOCALES, type AppLocale } from '@family/shared';

/** Production Docker: set NEXT_STATIC_LOCALES=en,ru to avoid 5000+ SSG pages on small VPS. */
export function generateStaticParams() {
  const fromEnv = process.env.NEXT_STATIC_LOCALES?.split(',')
    .map((code) => code.trim())
    .filter((code) => code && APP_LOCALES.includes(code));
  const locales = fromEnv?.length ? fromEnv : APP_LOCALES;
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!APP_LOCALES.includes(locale as AppLocale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLocaleAttrs />
      {children}
    </NextIntlClientProvider>
  );
}
