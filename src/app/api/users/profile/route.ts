import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { UpdateProfileSchema } from '@/server/validators/schemas';
import { UserService } from '@/server/services';

export const GET = createHandler(
  async (req: NextRequest, ctx) => {
    const profile = await UserService.getProfile(ctx.user!.id);
    return {
      message: 'Profil berhasil diambil',
      data: profile,
    };
  },
  { requiredAuth: true }
);

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const body = (req as any).validatedBody;
    const user = await UserService.updateProfile(ctx.user!.id, body);
    return {
      message: 'Profil berhasil diperbarui',
      data: { user },
    };
  },
  {
    requiredAuth: true,
    schema: UpdateProfileSchema,
  }
);
