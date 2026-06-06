import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';
import { hashPassword, verifyPassword } from '@/lib/password';

// PATCH /api/auth/profile — update name and/or password for logged-in user
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const { name, currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name.trim() || null;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { message: 'Password saat ini wajib diisi untuk mengubah password' },
          { status: 400 }
        );
      }
      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ message: 'Password saat ini salah' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { message: 'Password baru minimal 6 karakter' },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'Tidak ada yang diubah' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    console.error('[auth/profile PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
