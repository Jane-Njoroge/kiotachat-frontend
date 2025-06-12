import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get("userRole")?.value?.toUpperCase() as
    | "ADMIN"
    | "USER"
    | undefined;
  const userId = request.cookies.get("userId")?.value;

  console.log("Middleware cookies:", { userId, userRole, path: request.nextUrl.pathname });

  const path = request.nextUrl.pathname;


  if (["/", "/login", "/register", "/otp"].includes(path)) {
    return NextResponse.next();
  }


  if (!userId || !userRole || !["ADMIN", "USER"].includes(userRole)) {
    console.log("Redirecting to /login: Invalid userId or userRole");
    return NextResponse.redirect(new URL("/login", request.url));
  }

 
  if (path.startsWith("/admin") && userRole !== "ADMIN") {
    console.log("Redirecting to /userchatbox: Role not ADMIN");
    return NextResponse.redirect(new URL("/userchatbox", request.url));
  }


  if (path.startsWith("/user") && userRole !== "USER") {
    console.log("Redirecting to /adminchatbox: Role not USER");
    return NextResponse.redirect(new URL("/adminchatbox", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*", "/:path*"],
};