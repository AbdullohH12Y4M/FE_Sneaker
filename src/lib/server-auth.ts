/**
 * Server-side auth helpers for API routes.
 * Uses custom JWT system (access_token / refresh_token cookies).
 * Compatible with all routes that use createHandler and standalone routes alike.
 */
import { getAuthUser, TokenPayload } from '@/server/auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export type SessionUser = TokenPayload;

/** Returns the current session user from JWT cookie, or null if unauthenticated. */
export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  return getAuthUser(req);
}

/** Requires authentication. Returns 401 response if not logged in. */
export async function requireAuth(req?: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized', statusCode: 401 }, { status: 401 });
  }
  return user;
}

/** Requires ADMIN role. Returns 401/403 if not permitted. */
export async function requireAdmin(req?: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized', statusCode: 401 }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden', statusCode: 403 }, { status: 403 });
  }
  return user;
}

/** Type guard: check if the result is a NextResponse (error) */
export function isErrorResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}
