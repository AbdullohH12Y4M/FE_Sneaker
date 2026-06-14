/**
 * NextAuth type augmentation.
 *
 * Extends the default User, Session, and JWT types to include
 * application-specific fields (id, role).
 *
 * NOTE: accessToken has been intentionally removed from the session type.
 * Tokens are managed exclusively via HttpOnly cookies (access_token /
 * refresh_token) set by our custom JWT system in src/server/auth/jwt.ts.
 * Exposing tokens in the client-side session or localStorage creates XSS
 * attack surface.
 */
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
  }
}
