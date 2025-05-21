import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value as 'ADMIN' | 'USER' | undefined;
  const userId = request.cookies.get('userId')?.value;
  const path = request.nextUrl.pathname;

  // Helper to set cookies on any response
  function setUserCookies(response: NextResponse) {
    response.cookies.set('userRole', role || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    response.cookies.set('userId', userId || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return response;
  }

  if (!role && !userId && !path.startsWith('/login') && !path.startsWith('/register')) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    return setUserCookies(redirectResponse);
  }

  if (path.startsWith('/admin') && role !== 'ADMIN') {
    const redirectResponse = NextResponse.redirect(new URL('/user/chatbox', request.url));
    return setUserCookies(redirectResponse);
  }

  if (path.startsWith('/user') && role !== 'USER') {
    const redirectResponse = NextResponse.redirect(new URL('/admin/chatbox', request.url));
    return setUserCookies(redirectResponse);
  }

  const response = NextResponse.next();
  return setUserCookies(response);
}