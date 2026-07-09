"use client"

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import * as idb from 'idb-keyval'
import React, { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // Keep cached data for 24 hours (persisted to IndexedDB)
        staleTime: 1000 * 60 * 5, // Aggressive: data stays fresh for 5 minutes -> instant back/forward navigation
        refetchOnWindowFocus: false, // Don't refetch every time the app regains focus
        refetchOnReconnect: true,
        networkMode: 'offlineFirst', // Serve cache first, hit network in background
        retry: 1,
      },
    },
  }))

  const [persister] = useState(() => createAsyncStoragePersister({
    storage: {
      getItem: async (key) => {
        const val = await idb.get(key)
        return val === undefined ? null : val
      },
      setItem: async (key, value) => {
        await idb.set(key, value)
      },
      removeItem: async (key) => {
        await idb.del(key)
      },
    },
  }))

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
