/**
 * Server-side auth helpers for API routes.
 * Uses NextAuth session — no separate JWT needed.
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export type SessionUser = {
  id: string;
  email: string;
  role: string;
};

/** Returns the current session user, or null if unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: session.user.role ?? 'CUSTOMER',
  };
}

/** Requires authentication. Returns 401 response if not logged in. */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized', statusCode: 401 }, { status: 401 });
  }
  return user;
}

/** Requires ADMIN role. Returns 401/403 if not permitted. */
export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized', statusCode: 401 }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden', statusCode: 403 }, { status: 403 });
  }
  return user;
}

/** Type guard: check if the result is a NextResponse (error) */
export function isErrorResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}
