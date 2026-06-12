import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '../errors';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'sneakerlocal-super-secret-key-next-auth-v5'
);

export type TokenPayload = {
  id: string;
  email: string;
  role: string;
};

// Access token expires in 15 minutes
const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds

// Refresh token expires in 7 days
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(SECRET);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Token tidak valid atau kedaluwarsa');
  }
}

/** Get and verify session user from Access Token cookie, or Refresh Token cookie */
export async function getAuthUser(req?: NextRequest): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken && req) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (accessToken) {
      try {
        return await verifyToken(accessToken);
      } catch (e) {
        // Access token invalid/expired, try to auto-refresh if refresh token exists
        const refreshToken = cookieStore.get('refresh_token')?.value;
        if (refreshToken) {
          const payload = await verifyToken(refreshToken);
          // Auto sign new access token
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
        }
      }
    }

    // fallback to check direct refresh token if no access token
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (refreshToken) {
      return await verifyToken(refreshToken);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/** Set HttpOnly cookies for both Access Token and Refresh Token */
export async function setAuthCookies(payload: TokenPayload) {
  const cookieStore = await cookies();
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  });
}

/** Clear authentication cookies */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set('access_token', '', { maxAge: 0, path: '/' });
  cookieStore.set('refresh_token', '', { maxAge: 0, path: '/' });
}
