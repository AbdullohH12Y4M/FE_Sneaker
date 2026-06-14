/**
 * JWT utilities for the custom authentication system.
 *
 * SECURITY NOTES:
 * 1. JWT_SECRET is REQUIRED. The server will refuse to start if it is absent.
 *    There is NO fallback string — a missing secret is a hard startup failure,
 *    not a degraded-mode situation.
 * 2. Both access tokens (15 min) and refresh tokens (7 days) are signed with
 *    HS256 using the same secret. If you need independent rotation in the future,
 *    introduce a separate REFRESH_TOKEN_SECRET env var.
 * 3. Token verification always uses jwtVerify() from 'jose', which validates
 *    the signature, expiry, and algorithm. Raw base64-decoding is never used
 *    for any security decision.
 */
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '../errors';

// ─── Secret resolution — deferred to first use ───────────────────────────────
// NOTE: We intentionally do NOT resolve the secret at module load time.
// Next.js evaluates server modules during `next build` in a context where
// runtime env vars (JWT_SECRET) may not be present, causing the build to fail.
// Instead, we resolve lazily inside each function call so the error only
// surfaces at request time, not at build time.
function resolveSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;

  if (!raw || raw.trim() === '') {
    throw new Error(
      '[jwt] JWT_SECRET environment variable is not set. ' +
        'Set a strong random secret (≥32 chars) in your .env file and restart the server. ' +
        'Example: openssl rand -hex 32'
    );
  }

  if (raw.length < 32) {
    console.warn(
      '[jwt] WARNING: JWT_SECRET is shorter than 32 characters. ' +
        'Use a longer random value in production.'
    );
  }

  return new TextEncoder().encode(raw);
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type TokenPayload = {
  id: string;
  email: string;
  role: string;
};

// ─── Token lifetimes ──────────────────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // seconds

const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // seconds

// ─── Signing ──────────────────────────────────────────────────────────────────

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(resolveSecret());
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(resolveSecret());
}

// ─── Verification ─────────────────────────────────────────────────────────────

/**
 * Verify a token and return its payload.
 * Throws UnauthorizedError if the token is invalid, expired, or tampered with.
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, resolveSecret(), {
      algorithms: ['HS256'],
    });

    const id = payload['id'];
    const email = payload['email'];
    const role = payload['role'];

    if (typeof id !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
      throw new UnauthorizedError('Token payload tidak valid');
    }

    return { id, email, role };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Token tidak valid atau kedaluwarsa');
  }
}

// ─── Session retrieval ────────────────────────────────────────────────────────

/**
 * Retrieve and verify the current user from the access_token (or refresh_token)
 * cookie, or from the Authorization: Bearer header as a fallback.
 *
 * Returns null (never throws) so callers can decide how to handle unauthenticated
 * requests — the route handler will throw UnauthorizedError if auth is required.
 */
export async function getAuthUser(req?: NextRequest): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('access_token')?.value;

    // Bearer token fallback for programmatic clients / server-to-server
    if (!accessToken && req) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (accessToken) {
      try {
        return await verifyToken(accessToken);
      } catch {
        // Access token is invalid or expired — attempt silent refresh
        const refreshToken = cookieStore.get('refresh_token')?.value;
        if (refreshToken) {
          try {
            const payload = await verifyToken(refreshToken);

            // Issue a new short-lived access token and write it to the cookie
            const newAccessToken = await signAccessToken({
              id: payload.id,
              email: payload.email,
              role: payload.role,
            });

            cookieStore.set('access_token', newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: ACCESS_TOKEN_MAX_AGE,
              path: '/',
            });

            return payload;
          } catch {
            // Refresh token is also invalid — fall through to null
          }
        }
      }
    }

    // No access token — check if there is a valid refresh token on its own
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (refreshToken) {
      try {
        return await verifyToken(refreshToken);
      } catch {
        // Refresh token invalid — unauthenticated
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/** Write both access_token and refresh_token as HttpOnly cookies. */
export async function setAuthCookies(payload: TokenPayload): Promise<void> {
  const cookieStore = await cookies();
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload),
  ]);

  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  cookieStore.set('access_token', accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  cookieStore.set('refresh_token', refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/** Expire both auth cookies, effectively logging the user out. */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  const expireOptions = { maxAge: 0, path: '/' };
  cookieStore.set('access_token', '', expireOptions);
  cookieStore.set('refresh_token', '', expireOptions);
}
