import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

// GET /api/categories — public, with pagination + filter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q') ?? '';
    const slug = searchParams.get('slug') ?? '';
    const isActiveParam = searchParams.get('isActive');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const where: Record<string, unknown> = {};
    if (isActiveParam !== null) where.isActive = isActiveParam === 'true';
    if (slug) where.slug = slug;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ page, limit, total, totalPages: Math.ceil(total / limit), items });
  } catch (e) {
    console.error('[categories GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/categories — admin only
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ message: 'name dan slug wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ message: 'Slug sudah digunakan' }, { status: 400 });
    }

    const category = await prisma.category.create({ data: { name, slug } });
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    console.error('[categories POST]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
