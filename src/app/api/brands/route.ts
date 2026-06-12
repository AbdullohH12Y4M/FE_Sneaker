import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

// GET /api/brands — public, all brands with optional filter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q') ?? '';
    const isActiveParam = searchParams.get('isActive');

    const where: Record<string, unknown> = {};
    if (isActiveParam !== null) where.isActive = isActiveParam === 'true';
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.brand.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[brands GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/brands — admin only
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { name, slug, logoUrl } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ message: 'name dan slug wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ message: 'Slug sudah digunakan' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: { name, slug, logoUrl: logoUrl ?? null },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (e) {
    console.error('[brands POST]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
