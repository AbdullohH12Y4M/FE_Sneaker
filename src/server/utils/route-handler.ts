import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, TokenPayload } from '../auth/jwt';
import { handleApiError, AppError, UnauthorizedError, ValidationError, ForbiddenError } from '../errors';
import { z } from 'zod';

type HandlerContext = {
  params?: any;
  user?: TokenPayload;
};

type RouteHandlerFn = (
  req: NextRequest,
  ctx: HandlerContext
) => Promise<NextResponse | any>;

export function createHandler(
  handler: RouteHandlerFn,
  options?: {
    requiredAuth?: boolean;
    requiredRoles?: string[];
    schema?: z.ZodSchema;
  }
) {
  return async (req: NextRequest, { params }: { params?: any }) => {
    try {
      const ctx: HandlerContext = { params: params ? await params : undefined };

      // Auth guard
      if (options?.requiredAuth || options?.requiredRoles) {
        const user = await getAuthUser(req);
        if (!user) {
          throw new UnauthorizedError('Silakan login terlebih dahulu');
        }
        if (options.requiredRoles && !options.requiredRoles.includes(user.role)) {
          throw new ForbiddenError('Akses ditolak. Peran Anda tidak diizinkan.');
        }
        ctx.user = user;
      }

      // Input Validation
      if (options?.schema) {
        try {
          const body = await req.json();
          const parsed = options.schema.safeParse(body);
          if (!parsed.success) {
            const fieldErrors: Record<string, string[]> = {};
            parsed.error.errors.forEach((err) => {
              const path = err.path.join('.');
              if (!fieldErrors[path]) fieldErrors[path] = [];
              fieldErrors[path].push(err.message);
            });
            throw new ValidationError('Validasi input gagal', fieldErrors);
          }
          // Attach parsed data to request for access inside handlers
          (req as any).validatedBody = parsed.data;
        } catch (e) {
          if (e instanceof ValidationError) throw e;
          throw new ValidationError('Format JSON tidak valid');
        }
      }

      const result = await handler(req, ctx);

      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json({
        success: true,
        message: result.message || 'Operasi berhasil',
        data: result.data || result,
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
