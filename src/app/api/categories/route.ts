import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { CategorySchema } from '@/server/validators/schemas';
import { CategoryService } from '@/server/services';

export const GET = createHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const params = {
    isActive: searchParams.get('isActive') === 'true' ? true : undefined,
  };
  const categories = await CategoryService.getCategories(params);
  return {
    message: 'Kategori berhasil diambil',
    data: categories,
  };
});

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const body = ctx.body;
    const adminId = ctx.user!.id;
    const category = await CategoryService.createCategory(adminId, body);
    return {
      message: 'Kategori berhasil dibuat',
      data: category,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
    schema: CategorySchema,
  }
);
