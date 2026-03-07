'use client'
import useSWR from 'swr'
import type { HolderData } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

export function useTokenHolders(address: string | null) {
  const { data, error, isLoading } = useSWR<HolderData>(
    address ? `/api/token/holders?address=${address}` : null,
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false }
  )
  return { holderData: data, error, isLoading }
}
