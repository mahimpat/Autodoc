'use client';
import { PropsWithChildren, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KBarProvider } from 'kbar';
import { Toaster } from 'sonner';

export default function Providers({ children }: PropsWithChildren) {
  const client = useMemo(() => new QueryClient(), []);
  return (
    <KBarProvider actions={[]}>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors />
      </QueryClientProvider>
    </KBarProvider>
  );
}
