// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export function middleware(request: NextRequest) {
//   const role = request.cookies.get('userRole')?.value as 'ADMIN' | 'USER' | undefined;
//   const path = request.nextUrl.pathname;
//   const response = NextResponse.next();
//   response.cookies.set('userRole', role || '',{
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'strict'
//   });

//   if (!role && !path.startsWith('/login') && !path.startsWith('/register')) {
//     return NextResponse.redirect(new URL('/login', request.url));
//   }


//   if (path.startsWith('/admin') && role !== 'ADMIN') {
//     return NextResponse.redirect(new URL('/user/chatbox', request.url));
//   }

//   if (path.startsWith('/user') && role !== 'USER') {
//     return NextResponse.redirect(new URL('/admin/chatbox', request.url));
//   }

//   return NextResponse.next();
// }
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value as 'ADMIN' | 'USER' | undefined;
  const path = request.nextUrl.pathname;

  // Helper to set cookie on any response
  function setUserRoleCookie(response: NextResponse) {
    response.cookies.set('userRole', role || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/', 
    });
    return response;
  }

  if (!role && !path.startsWith('/login') && !path.startsWith('/register')) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    return setUserRoleCookie(redirectResponse);
  }

  if (path.startsWith('/admin') && role !== 'ADMIN') {
    const redirectResponse = NextResponse.redirect(new URL('/user/chatbox', request.url));
    return setUserRoleCookie(redirectResponse);
  }

  if (path.startsWith('/user') && role !== 'USER') {
    const redirectResponse = NextResponse.redirect(new URL('/admin/chatbox', request.url));
    return setUserRoleCookie(redirectResponse);
  }

  const response = NextResponse.next();
  return setUserRoleCookie(response);
}