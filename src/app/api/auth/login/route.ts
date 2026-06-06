import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

/**
 * POST /api/auth/login
 * Used by NextAuth Credentials provider internally.
 * Returns { access_token, user } to match the existing auth.ts contract.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    // Return shape expected by auth.ts authorize() callback
    return NextResponse.json({
      access_token: 'session', // NextAuth handles real token — this is just a placeholder
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email.split('@')[0],
        role: user.role,
      },
    });
  } catch (e) {
    console.error('[auth/login]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
