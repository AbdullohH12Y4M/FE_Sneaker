import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

export async function GET() {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error('[auth/users]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
