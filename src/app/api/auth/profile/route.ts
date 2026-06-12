import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { UpdateProfileSchema } from '@/server/validators/schemas';
import { UserService } from '@/server/services';

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const body = ctx.body;
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
