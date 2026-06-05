import createIntlMiddleware from 'next-intl/middleware';
import { isAppLocale } from '@family/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const protectedPrefixes = [
  '/dashboard',
  '/persons',
  '/families',
  '/tree',
  '/map',
  '/research',
  '/timeline',
  '/media',
  '/documents',
  '/search',
  '/settings',
  '/stories',
  '/ai-lab',
  '/community',
  '/matching',
  '/story-drafts',
];

function localeFromPath(pathname: string) {
  const seg = pathname.split('/')[1]?.toLowerCase();
  return seg && isAppLocale(seg) ? seg : null;
}

function stripLocale(pathname: string) {
  const locale = localeFromPath(pathname);
  if (!locale) return pathname;
  const rest = pathname.slice(locale.length + 1);
  return rest || '/';
}

export default function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = stripLocale(pathname);
  const isProtected = protectedPrefixes.some(
    (prefix) => pathWithoutLocale === prefix || pathWithoutLocale.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return intlResponse;
  }

  const token = request.cookies.get('family_access_token')?.value;
  if (token) {
    return intlResponse;
  }

  const locale = localeFromPath(pathname) ?? routing.defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/login`;
  url.searchParams.set('next', pathWithoutLocale);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|\\.well-known).*)'],
};
