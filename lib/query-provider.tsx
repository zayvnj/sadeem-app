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
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        staleTime: 1000 * 10, // 10 seconds
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
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
