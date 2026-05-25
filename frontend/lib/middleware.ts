import { NextRequest, NextResponse } from "next/server";

// import { decrypt } from "@/app/lib/session";

import { protectedRoutes, publicRoutes } from "@/lib/routes";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );

  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get("session")?.value;

  //   const session = cookie ? await decrypt(cookie) : null;

  //   if (isProtectedRoute && !session?.userId) {
  //     return NextResponse.redirect(new URL("/login", req.url));
  //   }

  //   if (isPublicRoute && session?.userId) {
  //     return NextResponse.redirect(new URL("/institution", req.url));
  //   }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
