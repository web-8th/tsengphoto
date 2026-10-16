import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;

  const { user, supabaseResponse } = await updateSession(request);

  const pathname = nextUrl.pathname;

  // Define protected routes
  const protectedRoutes = ['/admin'];
  const authRoutes = ['/login'];

  // Check if user is trying to access a protected route without being logged in
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Check if logged-in user is trying to access auth routes (like login page)
  if (user && authRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  /*
   * Only run on auth-gated routes. Middleware runs before Vercel's CDN cache and
   * calls Supabase Auth, so running it on public pages/APIs costs an invocation and
   * an auth round-trip per visit. Session refresh elsewhere is handled by the
   * browser Supabase client and by server clients in route handlers.
   */
  matcher: ['/admin/:path*', '/login'],
};
