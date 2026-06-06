import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/categories/[id] — public
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ message: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (e) {
    console.error('[categories/[id] GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/categories/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    if (body.slug && body.slug !== existing.slug) {
      const slugTaken = await prisma.category.findUnique({ where: { slug: body.slug } });
      if (slugTaken) {
        return NextResponse.json({ message: 'Slug sudah digunakan' }, { status: 400 });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[categories/[id] PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category does not exist', data: null },
        { status: 404 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus', data: null });
  } catch (e) {
    console.error('[categories/[id] DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
