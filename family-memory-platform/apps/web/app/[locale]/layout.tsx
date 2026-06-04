import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { HtmlLocaleAttrs } from '@/components/html-locale-attrs';
import { APP_LOCALES, type AppLocale } from '@family/shared';

export function generateStaticParams() {
  return APP_LOCALES.map((locale) => ({ locale }));
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
