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
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new Error('Format JSON tidak valid atau kosong');
    }

    const adminId = ctx.user!.id;

    if (body.type === 'SKU') {
      const parsed = ProductSkuSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.issues.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = fieldErrors[path] || [];
          fieldErrors[path].push(err.message);
        });
        return new Response(
          JSON.stringify({ success: false, message: 'Validasi SKU gagal', errors: fieldErrors }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const sku = await ProductService.createSku(adminId, parsed.data);
      return {
        message: 'SKU berhasil ditambahkan',
        data: sku,
      };
    }

    const parsed = ProductSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        fieldErrors[path] = fieldErrors[path] || [];
        fieldErrors[path].push(err.message);
      });
      return new Response(
        JSON.stringify({ success: false, message: 'Validasi produk gagal', errors: fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const product = await ProductService.createProduct(adminId, parsed.data);
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
