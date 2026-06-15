/**
 * Next.js Middleware — Route Protection
 *
 * SECURITY NOTE:
 * This middleware uses jwtVerify() from 'jose' to cryptographically verify
 * the JWT signature before making any redirect decisions. A forged token
 * (e.g., base64-decoded payload with role=ADMIN but no valid signature)
 * will be rejected here — NOT just at the route handler level.
 *
 * The middleware is intentionally kept as a "redirect layer only":
 * - It redirects unauthenticated users to /login
 * - It redirects non-admin users away from /admin
 * Final resource authorization (ownership checks, role checks) is still
 * enforced at the route handler / service layer via getAuthUser().
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ─── Secret resolution ────────────────────────────────────────────────────────
// We read the secret at module evaluation time. In the Edge runtime (where
// middleware executes) we cannot throw at startup, but we can make every
// request fail gracefully when the secret is missing, which surfaces the
// misconfiguration immediately during development or the first deploy.
function getMiddlewareSecret(): Uint8Array | null {
  const raw = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

// ─── Token payload shape we care about in the middleware ─────────────────────
interface JwtSession {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// ─── Verify & decode JWT — returns null on any failure ───────────────────────
async function verifySessionToken(token: string): Promise<JwtSession | null> {
  const secret = getMiddlewareSecret();

  // If the secret is not configured, deny all protected access so the
  // misconfiguration is obvious rather than silently passing requests through.
  if (!secret) {
    console.error(
      '[Middleware] JWT_SECRET / NEXTAUTH_SECRET is not set. ' +
        'All protected routes will redirect to /login until the env var is configured.'
    );
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      // Enforce the algorithm — prevents algorithm confusion attacks
      algorithms: ['HS256'],
    });

    const id = payload['id'];
    const email = payload['email'];
    const role = payload['role'];

    // All three fields must be non-empty strings for the session to be valid
    if (
      typeof id !== 'string' || !id ||
      typeof email !== 'string' || !email ||
      typeof role !== 'string' || !role
    ) {
      return null;
    }

    return { user: { id, email, role } };
  } catch {
    // jwtVerify throws on expired, tampered, or incorrectly signed tokens
    return null;
  }
}

// ─── Extract token from cookies ───────────────────────────────────────────────
function extractTokenFromRequest(request: NextRequest): string | null {
  // Only use our custom HttpOnly access_token cookie.
  // NextAuth session tokens use JWE encryption which requires @auth/core decrypt,
  // not available in Edge middleware with simple jwtVerify.
  const accessToken = request.cookies.get('access_token')?.value;
  return accessToken ?? null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = extractTokenFromRequest(request);

  // Perform cryptographic verification — never trust without verifying
  const session = token ? await verifySessionToken(token) : null;

  const isLoggedIn = !!session?.user?.id;
  const isAdmin = session?.user?.role === 'ADMIN';

  // ── Admin routes: require authenticated ADMIN ────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.nextUrl);
      loginUrl.searchParams.set('callbackUrl', '/admin');
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      // Authenticated but not admin — redirect to home, not to an error page
      // so as not to leak that the /admin route exists.
      return NextResponse.redirect(new URL('/', request.nextUrl));
    }
  }

  // ── Protected user routes: require any authenticated user ────────────────
  const protectedPrefixes = ['/checkout', '/orders', '/profile'];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname + search);
    const loginUrl = new URL('/login', request.nextUrl);
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect already-logged-in users away from auth pages ────────────────
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
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
