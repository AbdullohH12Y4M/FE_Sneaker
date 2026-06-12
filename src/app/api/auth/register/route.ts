import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { RegisterSchema } from '@/server/validators/schemas';
import { UserService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest) => {
    const body = (req as any).validatedBody;
    const user = await UserService.register(body);
    return {
      message: 'Registrasi berhasil',
      data: { user },
    };
  },
  { schema: RegisterSchema }
);
