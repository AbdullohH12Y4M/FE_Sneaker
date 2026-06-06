import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /search/api/product/all — proxy to /api/products/all (redundant, kept for backward compatibility)
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        },
        skus: {
          include: { inventory: { select: { stock: true } } },
        },
      },
    });

    const items = products.map((p) => ({
      ...p,
      images: p.images.map((img) => img.url),
      skus: p.skus.map((sku) => ({
        id: sku.id,
        productId: sku.productId,
        color: sku.color,
        colorHex: sku.colorHex,
        sizeEU: sku.sizeEU,
        sizeUS: sku.sizeUS ?? undefined,
        sizeUK: sku.sizeUK ?? undefined,
        sizeCM: sku.sizeCM ?? undefined,
        price: sku.price ?? undefined,
        stock: sku.inventory?.stock ?? 0,
      })),
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[search/products/all GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}