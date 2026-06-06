import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ skuId: string }> };

// PATCH /api/inventories/[skuId] — admin, update stock
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { skuId } = await params;
    const body = await req.json();

    if (body.type && body.type !== 'STOCK') {
      return NextResponse.json({ message: 'type must be STOCK' }, { status: 400 });
    }
    if (body.stock === undefined) {
      return NextResponse.json({ message: 'stock wajib diisi' }, { status: 400 });
    }

    const sku = await prisma.productSKU.findUnique({ where: { id: skuId } });
    if (!sku) {
      return NextResponse.json({ message: 'SKU tidak ditemukan' }, { status: 404 });
    }

    const inventory = await prisma.inventory.upsert({
      where: { skuId },
      update: { stock: Number(body.stock) },
      create: { skuId, stock: Number(body.stock) },
    });

    return NextResponse.json({ skuId, stock: inventory.stock });
  } catch (e) {
    console.error('[inventories/[skuId] PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
