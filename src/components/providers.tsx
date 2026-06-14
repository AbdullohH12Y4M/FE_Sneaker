'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { Session } from 'next-auth';

/**
 * Application providers.
 *
 * NOTE: The previous AuthTokenSync component that copied session.user.accessToken
 * into localStorage has been removed. Storing tokens in localStorage exposes
 * them to XSS attacks. Auth tokens are now managed exclusively via HttpOnly
 * cookies (access_token / refresh_token) set server-side by our custom JWT
 * system. The Axios interceptor in lib/api.ts has also been updated accordingly.
 */

interface ProvidersProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
