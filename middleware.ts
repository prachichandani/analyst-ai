import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get('session');
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isLoginPage = req.nextUrl.pathname.startsWith('/login');
  const isRegisterPage = req.nextUrl.pathname.startsWith('/register');

  // Simple check if session cookie exists
  const hasSession = !!sessionCookie;

  // Redirect unauthenticated users to auth landing page
  if (!hasSession && !isAuthPage && !isLoginPage && !isRegisterPage) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && (isAuthPage || isLoginPage || isRegisterPage)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};