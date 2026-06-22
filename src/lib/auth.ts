/**
 * NextAuth v5 configuration — Credentials-only, JWT strategy.
 *
 * ── Why no PrismaAdapter? ──────────────────────────────────────────────────
 * PrismaAdapter requires additional tables (Account, Session, VerificationToken)
 * that are not in our schema. Since we use JWT strategy (stateless sessions),
 * the adapter is not needed. Our custom JWT system (src/server/auth/jwt.ts)
 * handles access/refresh cookies for API routes independently.
 *
 * ── Auth flow ──────────────────────────────────────────────────────────────
 * 1. User submits email + password on /login
 * 2. NextAuth Credentials.authorize() verifies against DB
 * 3. On success: jwt() callback embeds id, role into the NextAuth JWT
 * 4. session() callback exposes id, role on the client-side session object
 * 5. Simultaneously, /api/auth/login issues HttpOnly access_token + refresh_token
 *    cookies via our custom JWT system — these are used by all API route handlers
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';
import prisma from './prisma';
import { verifyPassword } from './password';

export const authConfig: NextAuthConfig = {
  // No adapter — pure JWT strategy, no DB session storage needed
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findFirst({
            where: {
              email: String(credentials.email),
              deletedAt: null,
            },
          });

          if (!user) return null;

          const valid = await verifyPassword(
            String(credentials.password),
            user.password
          );
          if (!valid) return null;

          // Return shape — kept minimal. id/role are embedded in the JWT token
          // by the jwt() callback below.
          return {
            id: user.id,
            name: user.name ?? user.email.split('@')[0],
            email: user.email,
            role: user.role as string,
          };
        } catch (error) {
          console.error('[NextAuth] authorize error:', error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        try {
          // Check if user exists in the local database
          let dbUser = await prisma.user.findFirst({
            where: {
              email: String(email),
              deletedAt: null,
            },
          });

          if (!dbUser) {
            // Create a new user (Sign-up with Google)
            const { hashPassword } = await import('./password');
            const randomPassword = Math.random().toString(36) + Date.now().toString();
            const hashedPassword = await hashPassword(randomPassword);

            dbUser = await prisma.user.create({
              data: {
                email: String(email),
                name: user.name ?? email.split('@')[0],
                password: hashedPassword,
                role: 'CUSTOMER',
              },
            });
          }

          // Set the backend custom HttpOnly cookies
          const { setAuthCookies } = await import('@/server/auth/jwt');
          await setAuthCookies({
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role as string,
          });

          // Inject DB user info back into NextAuth user object
          user.id = dbUser.id;
          (user as any).role = dbUser.role;
        } catch (error) {
          console.error('[NextAuth] signIn Google sync error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // `user` is only present on the first sign-in
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'CUSTOMER';
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? 'CUSTOMER';
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days — matches refresh token lifetime
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
