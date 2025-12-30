/**
 * React Query Provider with Offline Persistence
 * Implements offline-first architecture using React Query + AsyncStorage
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a client with offline-first configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours
      staleTime: 1000 * 60 * 60 * 24,
      // Keep cache for 7 days
      gcTime: 1000 * 60 * 60 * 24 * 7,
      // Retry failed requests 3 times
      retry: 3,
      // Refetch on reconnection
      refetchOnReconnect: true,
      // Don't refetch on window focus for mobile
      refetchOnWindowFocus: false,
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations on failure
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

// Create persister for AsyncStorage
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'alghazaly-query-cache',
  throttleTime: 1000,
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        buster: 'v1', // Change this to clear cache on app updates
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export { queryClient };
export default QueryProvider;
