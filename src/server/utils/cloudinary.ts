/**
 * Shared Cloudinary utility for the entire server layer.
 *
 * Design decisions:
 * - Config is called lazily per-request (idempotent, safe, avoids module-load
 *   timing issues with env vars in Next.js edge/serverless runtimes).
 * - deleteCloudinaryAsset accepts either a full secure_url OR a public_id so
 *   callers don't have to parse URLs themselves.
 * - uploadToCloudinary centralises base64 conversion and error normalisation
 *   so every upload route gets the same error shape without copy-paste.
 */

import { v2 as cloudinary } from 'cloudinary';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Initialise (or re-initialise) Cloudinary with runtime env vars. */
export function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/** Throw a ValidationError-style message if Cloudinary env vars are missing. */
export function assertCloudinaryEnv() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Konfigurasi Cloudinary tidak lengkap. Hubungi administrator.');
  }
}

// ─── Public-ID extraction ─────────────────────────────────────────────────────

/**
 * Extract the Cloudinary public_id from a secure_url.
 *
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234567890/folder/filename.ext
 *
 * The public_id is everything after `/upload/` and the optional version segment
 * (`v<digits>/`), WITHOUT the file extension.
 *
 * Returns `null` if the URL does not match the expected Cloudinary pattern.
 */
export function extractPublicId(secureUrl: string): string | null {
  try {
    const url = new URL(secureUrl);
    // Must be a res.cloudinary.com host
    if (!url.hostname.includes('cloudinary.com')) return null;

    // Path: /image/upload/v1234567890/folder/name.ext
    //        ────────────── prefix ──────────────────
    const uploadIdx = url.pathname.indexOf('/upload/');
    if (uploadIdx === -1) return null;

    // Everything after /upload/
    let rest = url.pathname.slice(uploadIdx + '/upload/'.length);

    // Strip optional version segment (v<digits>/)
    rest = rest.replace(/^v\d+\//, '');

    // Strip file extension
    const lastDot = rest.lastIndexOf('.');
    if (lastDot !== -1) {
      rest = rest.slice(0, lastDot);
    }

    return rest || null;
  } catch {
    return null;
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadOptions {
  folder: string;
  /** Optional stable public_id (e.g. "product-{id}-{ts}"). Auto-generated if omitted. */
  publicId?: string;
}

export interface UploadResult {
  secureUrl: string;
  publicId: string;
}

/**
 * Upload a binary buffer to Cloudinary.
 *
 * @param buffer   Raw file bytes
 * @param mimeType e.g. "image/jpeg" — falls back to "image/jpeg" if not an image/* type
 * @param options  Folder and optional public_id
 * @throws Error with a user-friendly Indonesian message on Cloudinary failure
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  options: UploadOptions
): Promise<UploadResult> {
  assertCloudinaryEnv();

  const cld = getCloudinary();

  // Normalise MIME — Cloudinary rejects unknown types
  const safeMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const base64 = `data:${safeMime};base64,${buffer.toString('base64')}`;

  const uploadOpts: Record<string, unknown> = {
    folder: options.folder,
    resource_type: 'image',
  };
  if (options.publicId) uploadOpts.public_id = options.publicId;

  let result: { secure_url: string; public_id: string };
  try {
    result = await cld.uploader.upload(base64, uploadOpts) as typeof result;
  } catch (err: unknown) {
    throw new Error(`Gagal mengunggah gambar: ${normaliseCloudinaryError(err)}`);
  }

  return { secureUrl: result.secure_url, publicId: result.public_id };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a Cloudinary asset by its secure_url OR public_id.
 *
 * - If `urlOrPublicId` starts with "http", it is treated as a full URL and the
 *   public_id is extracted automatically.
 * - Silent on "not found" (idempotent) — only throws on network/auth errors.
 *
 * @returns true if deleted, false if asset was not found (already gone)
 */
export async function deleteCloudinaryAsset(urlOrPublicId: string): Promise<boolean> {
  assertCloudinaryEnv();

  let publicId: string | null;
  if (urlOrPublicId.startsWith('http')) {
    publicId = extractPublicId(urlOrPublicId);
    if (!publicId) {
      // Not a Cloudinary URL — skip silently
      console.warn('[deleteCloudinaryAsset] Could not extract public_id from URL:', urlOrPublicId);
      return false;
    }
  } else {
    publicId = urlOrPublicId;
  }

  const cld = getCloudinary();
  try {
    const res = (await cld.uploader.destroy(publicId, { resource_type: 'image' })) as {
      result: string;
    };
    if (res.result === 'not found') {
      console.warn('[deleteCloudinaryAsset] Asset not found (already deleted):', publicId);
      return false;
    }
    console.info('[deleteCloudinaryAsset] Deleted:', publicId);
    return true;
  } catch (err: unknown) {
    // Do NOT silently swallow auth/network errors — they indicate misconfiguration.
    throw new Error(`Gagal menghapus aset Cloudinary: ${normaliseCloudinaryError(err)}`);
  }
}

// ─── Internal helper ──────────────────────────────────────────────────────────

/** Normalise the various error shapes Cloudinary SDK v2 can throw. */
function normaliseCloudinaryError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (e.error && typeof e.error === 'object') {
      const nested = (e.error as Record<string, unknown>).message;
      if (typeof nested === 'string') return nested;
    }
    if (typeof e.message === 'string') return e.message;
    return JSON.stringify(err);
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
