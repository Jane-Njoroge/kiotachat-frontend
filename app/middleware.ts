// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export function middleware(request: NextRequest) {
//   console.log("Middleware - Path:", request.nextUrl.pathname);
//   console.log("Middleware - Cookies:", request.cookies.getAll());
//   const role = request.cookies.get('userRole')?.value?.toUpperCase() as 'ADMIN' | 'USER' | undefined;
//   const userId = request.cookies.get('userId')?.value;
//   console.log("Middleware - userId:", userId, "role:", role);

//   function setUserCookies(response: NextResponse) {
//     response.cookies.set('userRole', role || '', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
//       path: '/',
//     });
//     response.cookies.set('userId', userId || '', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
//       path: '/',
//     });
//     return response;
//   } 

//   if (!role || !userId || !["ADMIN", "USER"].includes(role)) {
//     console.log("Redirecting to /login: Missing userId or role");
//     const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
//     return setUserCookies(redirectResponse);
//   }

//   const path = request.nextUrl.pathname;

//   if (path.startsWith('/admin') && role !== 'ADMIN') {
//     console.log("Redirecting to /user/chatbox: Role not ADMIN");
//     const redirectResponse = NextResponse.redirect(new URL('/user/chatbox', request.url));
//     return setUserCookies(redirectResponse);
//   }

//   if (path.startsWith('/user') && role !== 'USER') {
//     console.log("Redirecting to /admin/chatbox: Role not USER");
//     const redirectResponse = NextResponse.redirect(new URL('/admin/chatbox', request.url));
//     return setUserCookies(redirectResponse);
//   }

//   const response = NextResponse.next();
//   return setUserCookies(response);
// }
// In middleware.ts


import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const role = request.cookies.get("userRole")?.value?.toUpperCase() as
    | "ADMIN"
    | "USER"
    | undefined;
  const userId = request.cookies.get("userId")?.value;

  console.log("Middleware cookies:", { userId, role });

  if (!role || !userId || !["ADMIN", "USER"].includes(role)) {
    console.log("Redirecting to /login: Invalid userId or role");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin") && role !== "ADMIN") {
    console.log("Redirecting to /user/chatbox: Role not ADMIN");
    return NextResponse.redirect(new URL("/user/chatbox", request.url));
  }

  if (path.startsWith("/user") && role !== "USER") {
    console.log("Redirecting to /admin/chatbox: Role not USER");
    return NextResponse.redirect(new URL("/admin/chatbox", request.url));
  }

  const response = NextResponse.next();
  if (userId && role) {
    response.cookies.set("userRole", role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });
    response.cookies.set("userId", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};