/**
 * Password hashing utilities.
 * Uses the Web Crypto API (available in Next.js Edge & Node runtimes).
 * No native bcrypt dependency needed.
 */

async function sha256(str: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(str));
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash a plaintext password with a random salt (format: "salt:hash") */
export async function hashPassword(plain: string): Promise<string> {
  const salt = bufToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = bufToHex(await sha256(salt + plain));
  return `${salt}:${hash}`;
}

/** Verify a plaintext password against a stored hash */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = bufToHex(await sha256(salt + plain));
  return actual === expected;
}
