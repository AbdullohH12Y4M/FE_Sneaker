import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { LoginSchema } from '@/server/validators/schemas';
import { UserService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest) => {
    const body = (req as any).validatedBody;
    const result = await UserService.login(body);
    return {
      message: 'Login berhasil',
      data: result,
    };
  },
  { schema: LoginSchema }
);
