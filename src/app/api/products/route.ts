import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { ProductSchema, ProductSkuSchema } from '@/server/validators/schemas';
import { ProductService } from '@/server/services';

export const GET = createHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const params = {
    q: searchParams.get('q') || undefined,
    categorySlug: searchParams.get('categorySlug') || undefined,
    brandSlug: searchParams.get('brandSlug') || undefined,
    gender: searchParams.get('gender') || undefined,
    isActive: searchParams.get('isActive') !== 'false',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  };

  const result = await ProductService.getProducts(params);
  return {
    message: 'Daftar produk berhasil diambil',
    data: result,
  };
});

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const body = await req.json();
    const adminId = ctx.user!.id;

    if (body.type === 'SKU') {
      // Validate SKU schema
      const parsed = ProductSkuSchema.parse(body);
      const sku = await ProductService.createSku(adminId, parsed);
      return {
        message: 'SKU berhasil ditambahkan',
        data: sku,
      };
    }

    // Validate Product schema
    const parsed = ProductSchema.parse(body);
    const product = await ProductService.createProduct(adminId, parsed);
    return {
      message: 'Produk berhasil dibuat',
      data: product,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
