import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

function getSessionFromRequest(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  
  // Try both authjs.session.token, next-auth.session-token, and our custom access_token patterns
  const sessionToken = cookies['access_token'] || cookies['authjs.session.token'] || cookies['next-auth.session-token'];
  if (!sessionToken) return null;
  
  const payload = decodeJwt(sessionToken);
  if (!payload) return null;
  
  return {
    user: {
      id: payload.id as string | undefined,
      email: payload.email as string | undefined,
      role: payload.role as string | undefined,
    },
  };
}

export async function middleware(request: NextRequest) {
  const nextUrl = request.nextUrl;
  const session = getSessionFromRequest(request);
  const isLoggedIn = !!session?.user?.id;
  const isAdmin = session?.user?.role === 'ADMIN';

  // Admin routes — require ADMIN role
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', nextUrl);
      loginUrl.searchParams.set('callbackUrl', '/admin');
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
  }

  // Public categories detail
  if (nextUrl.pathname.startsWith('/categories') && nextUrl.pathname !== '/categories') {
    return NextResponse.next();
  }

  // Protected user routes — require login
  const protectedRoutes = ['/checkout', '/orders', '/profile'];
  const isProtected = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r));

  if (isProtected && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in, redirect away from auth pages
  if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/login',
    '/register',
  ],
};