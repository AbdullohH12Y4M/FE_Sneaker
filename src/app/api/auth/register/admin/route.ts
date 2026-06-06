import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'Email sudah terdaftar' }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, role: 'ADMIN' },
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error('[register/admin]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
