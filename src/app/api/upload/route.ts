import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { UploadService } from '@/server/services';
import { validateUploadedFile } from '@/server/utils/validate-upload';

export const POST = createHandler(
  async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // Validates MIME type (whitelist) and size (≤ 5 MB) — throws on failure
    const validFile = validateUploadedFile(file);

    const arrayBuffer = await validFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await UploadService.uploadFile(buffer, validFile.type, 'sneakerlocal/general');
    return {
      message: 'File berhasil diunggah',
      data: result,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
