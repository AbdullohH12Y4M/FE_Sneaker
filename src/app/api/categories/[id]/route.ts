import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { CategoryService } from '@/server/services';

export const GET = createHandler(async (req: NextRequest, ctx) => {
  const id = ctx.params.id;
  const category = await CategoryService.getCategory(id);
  return {
    message: 'Kategori berhasil diambil',
    data: category,
  };
});

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id;
    const body = await req.json();
    const adminId = ctx.user!.id;

    const updated = await CategoryService.updateCategory(adminId, id, body);
    return {
      message: 'Kategori berhasil diubah',
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
    const id = ctx.params.id;
    const adminId = ctx.user!.id;

    const result = await CategoryService.deleteCategory(adminId, id);
    return {
      message: 'Kategori berhasil dihapus',
      data: result,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
