import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const protectedPrefixes = [
  '/dashboard',
  '/persons',
  '/families',
  '/tree',
  '/timeline',
  '/media',
  '/documents',
  '/search',
  '/settings',
];

function stripLocale(pathname: string) {
  const match = pathname.match(/^\/(en|de|fr|es|ru)(?=\/|$)/);
  if (!match) return pathname;
  const rest = pathname.slice(match[0].length);
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

  const locale = pathname.match(/^\/(en|de|fr|es|ru)/)?.[1] ?? routing.defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/login`;
  url.searchParams.set('next', pathWithoutLocale);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
