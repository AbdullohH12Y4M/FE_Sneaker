import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/brands/[id] — public
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json({ message: 'Brand tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(brand);
  } catch (e) {
    console.error('[brands/[id] GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/brands/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Brand tidak ditemukan' }, { status: 404 });
    }

    if (body.slug && body.slug !== existing.slug) {
      const slugTaken = await prisma.brand.findUnique({ where: { slug: body.slug } });
      if (slugTaken) {
        return NextResponse.json({ message: 'Slug sudah digunakan' }, { status: 400 });
      }
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[brands/[id] PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/brands/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Brand tidak ditemukan', data: null },
        { status: 404 }
      );
    }

    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Brand berhasil dihapus', data: null });
  } catch (e) {
    console.error('[brands/[id] DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
