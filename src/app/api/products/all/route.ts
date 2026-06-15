import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/products/all — public, all active products WITH skus + brand + images
// Supports optional ?categorySlug= filter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const categorySlug = searchParams.get('categorySlug') || undefined;
    const q = searchParams.get('q') || undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
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
      // Preserve full ProductImage objects (id + url + isPrimary) so the
      // frontend can delete images by id without an extra round-trip.
      images: p.images.map((img) => ({
        id: img.id,
        productId: p.id,
        url: img.url,
        isPrimary: img.isPrimary,
        createdAt: '',
      })),
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
    console.error('[products/all GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
