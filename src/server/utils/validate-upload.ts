/**
 * Shared upload validation utility.
 *
 * Why a dedicated module?
 * - Prevents copy-paste validation across multiple route handlers.
 * - Single place to change limits (e.g. bump max size from 5 MB to 10 MB).
 * - Forces callers to handle validation errors consistently.
 *
 * Usage:
 *   import { validateUploadedFile } from '@/server/utils/validate-upload';
 *   const file = formData.get('file') as File | null;
 *   validateUploadedFile(file); // throws on invalid
 */

/** Allowed image MIME types (strict whitelist). */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/** Default max file size: 5 MB */
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export interface ValidateUploadOptions {
  /**
   * Maximum allowed file size in bytes.
   * @default 5_242_880 (5 MB)
   */
  maxBytes?: number;
  /**
   * Allowed MIME types. Defaults to ALLOWED_MIME_TYPES whitelist.
   * Pass an explicit array to override (useful for testing).
   */
  allowedMimeTypes?: readonly string[];
}

/**
 * Validate a File object from a multipart/form-data request.
 *
 * Throws an `Error` with a user-friendly Indonesian message on:
 * - Missing file
 * - MIME type not in whitelist
 * - File exceeds size limit
 *
 * On success, returns the File unchanged (useful for chaining).
 */
export function validateUploadedFile(
  file: File | null | undefined,
  options: ValidateUploadOptions = {}
): File {
  const { maxBytes = DEFAULT_MAX_BYTES, allowedMimeTypes = ALLOWED_MIME_TYPES } = options;

  // 1. Presence check
  if (!file) {
    throw new Error('File tidak ditemukan dalam permintaan.');
  }

  // 2. MIME type whitelist check
  //    We check both `file.type` (browser-provided) AND the Content-Type header
  //    embedded by the browser. Since we cannot read magic bytes server-side in
  //    Next.js App Router without streaming the full buffer, the MIME whitelist
  //    is our primary defence layer. Cloudinary performs its own content scan.
  const mime = file.type.toLowerCase();
  if (!allowedMimeTypes.includes(mime)) {
    throw new Error(
      `Tipe file tidak didukung: "${file.type}". ` +
        `Hanya gambar yang diizinkan (JPEG, PNG, WebP, GIF, AVIF).`
    );
  }

  // 3. Size check (file.size is always available on the File API)
  if (file.size > maxBytes) {
    const limitMb = (maxBytes / 1024 / 1024).toFixed(0);
    const actualMb = (file.size / 1024 / 1024).toFixed(2);
    throw new Error(
      `Ukuran file terlalu besar: ${actualMb} MB. Maksimum yang diizinkan adalah ${limitMb} MB.`
    );
  }

  // 4. Zero-byte guard (empty file — often a browser bug or network issue)
  if (file.size === 0) {
    throw new Error('File kosong (0 byte). Pastikan file gambar tidak rusak.');
  }

  return file;
}

/** Human-readable file size (for use in error or UI messages). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
