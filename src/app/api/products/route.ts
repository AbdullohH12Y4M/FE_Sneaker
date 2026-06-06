import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const skuSelect = {
  id: true,
  productId: true,
  color: true,
  colorHex: true,
  sizeEU: true,
  sizeUS: true,
  sizeUK: true,
  sizeCM: true,
  price: true,
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
  images: { select: { id: true, url: true, isPrimary: true }, orderBy: { isPrimary: 'desc' as const } },
};

// ─── GET /api/products — public, paginated + filtered ────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q') ?? '';
    const categorySlug = searchParams.get('categorySlug') ?? '';
    const brandSlug = searchParams.get('brandSlug') ?? '';
    const color = searchParams.get('color') ?? '';
    const sizeEU = searchParams.get('sizeEU') ? Number(searchParams.get('sizeEU')) : undefined;
    const gender = searchParams.get('gender') ?? '';
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const where: Record<string, unknown> = { isActive: true };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { skuCode: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (categorySlug) where.category = { slug: categorySlug };
    if (brandSlug) where.brand = { slug: brandSlug };
    if (gender) where.gender = gender;

    if (color || sizeEU !== undefined || minPrice !== undefined || maxPrice !== undefined) {
      const skuWhere: Record<string, unknown> = {};
      if (color) skuWhere.color = { equals: color, mode: 'insensitive' };
      if (sizeEU !== undefined) skuWhere.sizeEU = sizeEU;
      if (minPrice !== undefined || maxPrice !== undefined) {
        skuWhere.price = {};
        if (minPrice !== undefined) (skuWhere.price as Record<string, unknown>).gte = minPrice;
        if (maxPrice !== undefined) (skuWhere.price as Record<string, unknown>).lte = maxPrice;
      }
      where.skus = { some: skuWhere };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: productInclude,
      }),
    ]);

    const items = products.map((p) => ({
      ...p,
      images: p.images.map((img) => img.url),
    }));

    return NextResponse.json({ page, limit, total, totalPages: Math.ceil(total / limit), items });
  } catch (e) {
    console.error('[products GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// ─── POST /api/products — admin only ─────────────────────────────────────────
// type: "PRODUCT" → create product
// type: "SKU"     → add SKU to existing product
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await req.json();

    // ── Create SKU ──────────────────────────────────────────────────────────
    if (body.type === 'SKU') {
      const { productId, color, colorHex, sizeEU, sizeUS, sizeUK, sizeCM, initialStock, price } = body;

      if (!productId || !color || sizeEU === undefined) {
        return NextResponse.json(
          { message: 'productId, color, sizeEU wajib diisi' },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
      }

      const sku = await prisma.productSKU.create({
        data: {
          productId,
          color,
          colorHex: colorHex ?? '#888888',
          sizeEU: Number(sizeEU),
          sizeUS: sizeUS ?? null,
          sizeUK: sizeUK ?? null,
          sizeCM: sizeCM ? Number(sizeCM) : null,
          price: price ? Number(price) : null,
          inventory: { create: { stock: Number(initialStock ?? 0) } },
        },
        select: skuSelect,
      });

      return NextResponse.json(formatSku(sku), { status: 201 });
    }

    // ── Create Product ──────────────────────────────────────────────────────
    const { categoryId, brandId, name, slug, skuCode, description, basePrice, gender, releaseYear, isActive, imageUrl } = body;

    if (!categoryId || !brandId || !name || !slug || !skuCode || basePrice === undefined) {
      return NextResponse.json(
        { message: 'categoryId, brandId, name, slug, skuCode, basePrice wajib diisi' },
        { status: 400 }
      );
    }

    const [category, brand, slugTaken, skuCodeTaken] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.brand.findUnique({ where: { id: brandId } }),
      prisma.product.findUnique({ where: { slug } }),
      prisma.product.findFirst({ where: { skuCode } }),
    ]);

    if (!category) return NextResponse.json({ message: 'Kategori tidak ditemukan' }, { status: 404 });
    if (!brand) return NextResponse.json({ message: 'Brand tidak ditemukan' }, { status: 404 });
    if (slugTaken) return NextResponse.json({ message: 'Slug sudah digunakan' }, { status: 400 });
    if (skuCodeTaken) return NextResponse.json({ message: 'SKU Code sudah digunakan' }, { status: 400 });

    const product = await prisma.product.create({
      data: {
        categoryId,
        brandId,
        name,
        slug,
        skuCode,
        description: description ?? '',
        basePrice: Number(basePrice),
        gender: gender ?? 'UNISEX',
        // releaseYear: releaseYear ? Number(releaseYear) : null,
        isActive: isActive !== false,
        // If imageUrl passed directly, create a ProductImage record
        ...(imageUrl
          ? { images: { create: [{ url: imageUrl, isPrimary: true }] } }
          : {}),
      },
      include: {
        ...productInclude,
        skus: { select: skuSelect },
      },
    });

    return NextResponse.json(
      {
        ...product,
        images: product.images.map((img) => img.url),
        skus: product.skus.map(formatSku),
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[products POST]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
