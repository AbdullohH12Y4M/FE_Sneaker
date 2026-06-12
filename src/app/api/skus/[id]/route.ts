import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/skus/[id] — admin, update SKU variant
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.type && body.type !== 'SKU') {
      return NextResponse.json({ message: 'type must be SKU' }, { status: 400 });
    }

    const existing = await prisma.productSKU.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'SKU tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.productSKU.update({
      where: { id },
      data: {
        ...(body.color !== undefined && { color: body.color }),
        ...(body.colorHex !== undefined && { colorHex: body.colorHex }),
        ...(body.sizeEU !== undefined && { sizeEU: Number(body.sizeEU) }),
        ...(body.sizeUS !== undefined && { sizeUS: body.sizeUS }),
        ...(body.sizeUK !== undefined && { sizeUK: body.sizeUK }),
        ...(body.sizeCM !== undefined && { sizeCM: Number(body.sizeCM) }),
        ...(body.price !== undefined && { price: body.price !== null ? Number(body.price) : null }),
      },
      include: { inventory: { select: { stock: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      productId: updated.productId,
      color: updated.color,
      colorHex: updated.colorHex,
      sizeEU: updated.sizeEU,
      sizeUS: updated.sizeUS ?? undefined,
      sizeUK: updated.sizeUK ?? undefined,
      sizeCM: updated.sizeCM ?? undefined,
      price: updated.price ?? undefined,
      stock: updated.inventory?.stock ?? 0,
    });
  } catch (e) {
    console.error('[skus/[id] PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/skus/[id] — admin
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const existing = await prisma.productSKU.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'SKU tidak ditemukan' }, { status: 404 });
    }
    await prisma.productSKU.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'SKU berhasil dihapus' });
  } catch (e) {
    console.error('[skus/[id] DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
