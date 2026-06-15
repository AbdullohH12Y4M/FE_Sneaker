import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { CategoryService } from '@/server/services';
import { CategoryRepository } from '@/server/repositories';

export const GET = createHandler(async (req: NextRequest, ctx) => {
  const id = ctx.params.id;
  // Try by ID first, then fall back to slug so both /categories/[id] and
  // /categories/[slug] work without a separate route.
  let category = await CategoryRepository.findById(id);
  if (!category) {
    category = await CategoryRepository.findBySlug(id);
  }
  if (!category) {
    return new Response(
      JSON.stringify({ success: false, message: 'Kategori tidak ditemukan' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return {
    message: 'Kategori berhasil diambil',
    data: category,
  };
});

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id;
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new Error('Format JSON tidak valid atau kosong');
    }
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
