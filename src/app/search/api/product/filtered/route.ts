import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /search/api/product/filtered — proxy to /api/products with filter params
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const categorySlug = searchParams.get('category') ?? '';
    const color = searchParams.get('color') ?? '';
    const size = searchParams.get('size');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const search = searchParams.get('search') ?? '';

    const where: Record<string, unknown> = { isActive: true };

    if (categorySlug) where.category = { slug: categorySlug };
    if (color) where.skus = { some: { color: { contains: color, mode: 'insensitive' } } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
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
    console.error('[search/products/filtered GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}