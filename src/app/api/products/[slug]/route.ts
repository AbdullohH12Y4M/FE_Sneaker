import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { ProductService } from '@/server/services';

export const GET = createHandler(async (req: NextRequest, ctx) => {
  const slug = ctx.params.slug;
  const product = await ProductService.getProductBySlugOrId(slug);
  return {
    message: 'Detail produk berhasil diambil',
    data: product,
  };
});

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.slug; // treated as product ID
    const body = await req.json();
    const adminId = ctx.user!.id;

    const updated = await ProductService.updateProduct(adminId, id, body);
    return {
      message: 'Produk berhasil diubah',
      data: updated,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);

export const DELETE = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.slug;
    const adminId = ctx.user!.id;

    const result = await ProductService.deleteProduct(adminId, id);
    return {
      message: 'Produk berhasil dihapus',
      data: result,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);