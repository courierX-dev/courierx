import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value
  const { pathname } = request.nextUrl

  // Unauthenticated users cannot access protected routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect bare /dashboard to /dashboard/overview
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard/overview", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding/:path*"],
}
