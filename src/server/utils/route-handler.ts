import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, TokenPayload } from '../auth/jwt';
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError } from '../errors';
import { z } from 'zod';

// Definisikan tipe generic agar body dan params bisa menyesuaikan skema masing-masing route
type HandlerContext<TBody = any, TParams = any> = {
  params: TParams;
  user?: TokenPayload;
  body?: TBody;
};

type RouteHandlerFn<TBody = any, TParams = any> = (
  req: NextRequest,
  ctx: HandlerContext<TBody, TParams>
) => Promise<NextResponse | any>;

export function createHandler<TBody = any, TParams = any>(
  handler: RouteHandlerFn<TBody, TParams>,
  options?: {
    requiredAuth?: boolean;
    requiredRoles?: string[];
    schema?: z.ZodSchema<TBody>;
  }
) {
  // Next.js 16: params adalah Promise
  return async (req: NextRequest, { params }: { params?: Promise<TParams> }) => {
    try {
      // 1. Resolve params seawal mungkin
      const resolvedParams = params ? await params : ({} as TParams);
      const ctx: HandlerContext<TBody, TParams> = { params: resolvedParams };

      // 2. AUTHENTICATION & AUTHORIZATION
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

      // 3. VALIDATION WITH CONTENT-TYPE CHECK
      if (options?.schema) {
        const contentType = req.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          throw new ValidationError('Content-Type harus application/json');
        }

        let body: any;
        try {
          body = await req.json();
        } catch {
          throw new ValidationError('Format JSON tidak valid atau kosong');
        }

        const parsed = options.schema.safeParse(body);

        if (!parsed.success) {
          const fieldErrors: Record<string, string[]> = {};

          parsed.error.issues.forEach((err) => {
            const path = err.path.join('.') || '_root';
            fieldErrors[path] = fieldErrors[path] || [];
            fieldErrors[path].push(err.message);
          });

          throw new ValidationError('Validasi input gagal', fieldErrors);
        }

        // Data hasil parse yang sudah bersih dimasukkan ke ctx
        ctx.body = parsed.data;
      }

      // 4. EXECUTE HANDLER
      const result = await handler(req, ctx);

      // Handler returned a NextResponse directly — pass through as-is
      if (result instanceof NextResponse || result instanceof Response) return result;

      // 5. UNIFIED RESPONSE FORMAT
      return NextResponse.json({
        success: true,
        message: result?.message ?? 'OK',
        data: result?.data !== undefined ? result.data : null,
      });
    } catch (error) {
      // Prisma known error codes → map to user-friendly AppError
      if (
        error instanceof Error &&
        'code' in error &&
        typeof (error as any).code === 'string'
      ) {
        const prismaError = error as any;
        if (prismaError.code === 'P2002') {
          // Unique constraint violation
          const field = prismaError.meta?.target?.join(', ') ?? 'field';
          return NextResponse.json(
            { success: false, message: `Data duplikat: ${field} sudah digunakan` },
            { status: 409 }
          );
        }
        if (prismaError.code === 'P2025') {
          // Record not found (e.g. update/delete on missing row)
          return NextResponse.json(
            { success: false, message: 'Data tidak ditemukan' },
            { status: 404 }
          );
        }
        if (prismaError.code === 'P2003') {
          // Foreign key constraint failed
          return NextResponse.json(
            { success: false, message: 'Operasi gagal: data terkait masih digunakan' },
            { status: 409 }
          );
        }
      }

      return handleApiError(error);
    }
  };
}