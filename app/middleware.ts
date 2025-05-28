// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export function middleware(request: NextRequest) {
//   console.log("Middleware cookies:", request.cookies.getAll());
//   console.log("Request path:", request.nextUrl.pathname);
//   const role = request.cookies.get('userRole')?.value as 'ADMIN' | 'USER' | undefined;
//   const userId = request.cookies.get('userId')?.value;
//   console.log("Extracted userId:", userId, "role:", role);
//   const path = request.nextUrl.pathname;
//   if(!role || !userId) {
//     console.log("Redirecting to /login: Missing userId or role");
//     const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
//     return setUserCookies(redirectResponse);
//   }

//   // Helper to set cookies on any response
//   function setUserCookies(response: NextResponse) {
//     response.cookies.set('userRole', role || '', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       path: '/',
//     });
//     response.cookies.set('userId', userId || '', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       path: '/',
//     });
//     return response;
//   }

//   if (!role && !userId && !path.startsWith('/login') && !path.startsWith('/register')) {
//     const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
//     return setUserCookies(redirectResponse);
//   }

//   if (path.startsWith('/admin') && role !== 'ADMIN') {
//     const redirectResponse = NextResponse.redirect(new URL('/user/chatbox', request.url));
//     return setUserCookies(redirectResponse);
//   }

//   if (path.startsWith('/user') && role !== 'USER') {
//     const redirectResponse = NextResponse.redirect(new URL('/admin/chatbox', request.url));
//     return setUserCookies(redirectResponse);
//   }

//   const response = NextResponse.next();
//   return setUserCookies(response);
// }
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log("Middleware - Path:", request.nextUrl.pathname);
  console.log("Middleware - Cookies:", request.cookies.getAll());
  const role = request.cookies.get('userRole')?.value as 'ADMIN' | 'USER' | undefined;
  const userId = request.cookies.get('userId')?.value;
  console.log("Middleware - userId:", userId, "role:", role);

  function setUserCookies(response: NextResponse) {
    response.cookies.set('userRole', role || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });
    response.cookies.set('userId', userId || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });
    return response;
  }

  if (!role || !userId) {
    console.log("Redirecting to /login: Missing userId or role");
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    return setUserCookies(redirectResponse);
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin') && role !== 'ADMIN') {
    console.log("Redirecting to /user/chatbox: Role not ADMIN");
    const redirectResponse = NextResponse.redirect(new URL('/user/chatbox', request.url));
    return setUserCookies(redirectResponse);
  }

  if (path.startsWith('/user') && role !== 'USER') {
    console.log("Redirecting to /admin/chatbox: Role not USER");
    const redirectResponse = NextResponse.redirect(new URL('/admin/chatbox', request.url));
    return setUserCookies(redirectResponse);
  }

  const response = NextResponse.next();
  return setUserCookies(response);
}