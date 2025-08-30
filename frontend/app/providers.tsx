'use client';
import { PropsWithChildren, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { KBarProvider } from 'kbar';
import { Toaster } from 'sonner';
import { WorkspaceProvider } from '@/lib/workspace-context';
import { ToastProvider } from '@/components/ui/Toast';

export default function Providers({ children }: PropsWithChildren) {
  const client = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <KBarProvider actions={[]}>
        <QueryClientProvider client={client}>
          <WorkspaceProvider>
            <ToastProvider>
              {children}
              <Toaster 
                richColors
                position="top-right"
                expand
                visibleToasts={3}
              />
            </ToastProvider>
          </WorkspaceProvider>
        </QueryClientProvider>
      </KBarProvider>
    </ThemeProvider>
  );
}
