import { NextResponse, type NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('family_access_token')?.value;
  if (token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
