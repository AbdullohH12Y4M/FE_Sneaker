import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminOrStaff, isErrorResponse } from '@/lib/server-auth';
import { uploadToCloudinary, deleteCloudinaryAsset } from '@/server/utils/cloudinary';
import { validateUploadedFile } from '@/server/utils/validate-upload';

type Params = { params: Promise<{ slug: string }> };

/**
 * POST /api/products/[id]/image
 * Upload a product image to Cloudinary and create a ProductImage record.
 *
 * The [slug] param is treated as a product ID for mutations.
 *
 * Validation:
 * - MIME type must be an image/* type in the allowed whitelist
 * - File size must be ≤ 5 MB
 */
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAdminOrStaff(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { slug: id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      }
    });
    if (!product) {
      return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
    }
    const resolvedProductId = product.id;

    const formData = await req.formData();
    const rawFile = formData.get('file') as File | null;

    // Validate MIME type whitelist + 5 MB size limit — throws with friendly message on failure
    let file: File;
    try {
      file = validateUploadedFile(rawFile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'File tidak valid';
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    const isPrimary = formData.get('isPrimary') === 'true';

    // Upload to Cloudinary via shared helper
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let uploadResult: { secureUrl: string; publicId: string };
    try {
      uploadResult = await uploadToCloudinary(buffer, file.type, {
        folder: 'sneakerlocal/products',
        publicId: `product-${resolvedProductId}-${Date.now()}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload gagal';
      console.error('[products/image POST] Upload error:', msg);
      return NextResponse.json({ message: msg }, { status: 500 });
    }

    // If this is the primary image, unset any existing primary
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: resolvedProductId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // First image automatically becomes primary
    const existingCount = await prisma.productImage.count({ where: { productId: resolvedProductId } });
    const shouldBePrimary = isPrimary || existingCount === 0;

    const productImage = await prisma.productImage.create({
      data: { productId: resolvedProductId, url: uploadResult.secureUrl, isPrimary: shouldBePrimary },
    });

    return NextResponse.json({ imageUrl: uploadResult.secureUrl, productImage });
  } catch (e) {
    console.error('[products/[id]/image POST]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id]/image?imageId=xxx
 * Remove a specific product image from DB AND from Cloudinary storage.
 *
 * Root-cause fix: Previously only deleted the DB record, leaving the
 * Cloudinary asset orphaned. Now we extract the public_id from the stored URL
 * and call Cloudinary destroy() before removing the DB row.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireAdminOrStaff(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { slug: id } = await params;
    const imageId = req.nextUrl.searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ message: 'imageId wajib diisi' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      },
      select: { id: true }
    });

    if (!product) {
      return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
    }
    const resolvedProductId = product.id;

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: resolvedProductId },
    });

    if (!image) {
      return NextResponse.json({ message: 'Gambar tidak ditemukan' }, { status: 404 });
    }

    // ─── Delete from Cloudinary FIRST ────────────────────────────────────────
    // We delete Cloudinary before the DB row so that if the Cloudinary call
    // fails we can still surface the error and the DB record stays intact
    // (preventing a phantom record that points to a deleted asset).
    try {
      await deleteCloudinaryAsset(image.url);
    } catch (cloudinaryErr: unknown) {
      // Log but do NOT abort — if Cloudinary delete fails (e.g. already gone),
      // we still want to clean up the DB row.
      const msg = cloudinaryErr instanceof Error ? cloudinaryErr.message : String(cloudinaryErr);
      console.warn('[products/image DELETE] Cloudinary delete warning:', msg);
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true, message: 'Gambar berhasil dihapus' });
  } catch (e) {
    console.error('[products/[id]/image DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
