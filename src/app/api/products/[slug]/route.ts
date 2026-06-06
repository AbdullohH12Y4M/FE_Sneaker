import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ slug: string }> };

const skuInclude = {
  inventory: { select: { stock: true } },
};

function formatSku(sku: {
  id: string;
  productId: string;
  color: string;
  colorHex: string;
  sizeEU: number;
  sizeUS: string | null;
  sizeUK: string | null;
  sizeCM: number | null;
  price: number | null;
  inventory: { stock: number } | null;
}) {
  return {
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
  };
}

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, isPrimary: true },
    orderBy: { isPrimary: 'desc' as const },
  },
};

// GET /api/products/[slug] — public, detail with skus
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    // Cari berdasarkan slug terlebih dahulu, kemudian berdasarkan id (untuk halaman edit admin)
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }], isActive: true },
      include: {
        ...productInclude,
        skus: { include: skuInclude },
      },
    });

    if (!product) {
      return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      ...product,
      images: product.images.map((img) => img.url),
      skus: product.skus.map(formatSku),
    });
  } catch (e) {
    console.error('[products/[slug] GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/products/[slug] — admin, parameter diperlakukan sebagai ID untuk mutasi
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { slug: id } = await params;
    const body = await req.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
    }

    if (body.slug && body.slug !== existing.slug) {
      const taken = await prisma.product.findUnique({ where: { slug: body.slug } });
      if (taken) return NextResponse.json({ message: 'Slug sudah digunakan' }, { status: 400 });
    }

    // PERBAIKAN: Menggunakan findFirst karena skuCode di schema.prisma belum diberi @unique
    if (body.skuCode && body.skuCode !== existing.skuCode) {
      const taken = await prisma.product.findFirst({ where: { skuCode: body.skuCode } });
      if (taken) return NextResponse.json({ message: 'SKU Code sudah digunakan' }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.brandId !== undefined && { brandId: body.brandId }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.skuCode !== undefined && { skuCode: body.skuCode }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.basePrice !== undefined && { basePrice: Math.round(Number(body.basePrice)) }), // Memastikan nilai integer bulat untuk PostgreSQL Int
        ...(body.gender !== undefined && { gender: body.gender }),
        ...(body.releaseYear !== undefined && { releaseYear: Number(body.releaseYear) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        ...productInclude,
        skus: { include: skuInclude },
      },
    });

    return NextResponse.json({
      ...updated,
      images: updated.images.map((img) => img.url),
      skus: updated.skus.map(formatSku),
    });
  } catch (e) {
    console.error('[products/[slug] PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/products/[slug] — admin (param = id)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { slug: id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (e) {
    console.error('[products/[slug] DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}