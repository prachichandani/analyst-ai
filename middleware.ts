import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get('session');
  const isLoginPage = req.nextUrl.pathname.startsWith('/login');
  const isRegisterPage = req.nextUrl.pathname.startsWith('/register');

  // Simple check if session cookie exists
  const hasSession = !!sessionCookie;

  // Redirect unauthenticated users to login landing page
  if (!hasSession && !isLoginPage && !isRegisterPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect authenticated users away from login/register pages
  if (hasSession && (isLoginPage || isRegisterPage)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};