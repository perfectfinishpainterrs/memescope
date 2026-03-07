'use client'
import useSWR from 'swr'
import type { TokenData } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

export function useTokenData(address: string | null, chain = 'SOL') {
  const { data, error, isLoading, mutate } = useSWR<TokenData>(
    address ? `/api/token/data?address=${address}&chain=${chain}` : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  )
  return { tokenData: data, error, isLoading, refresh: mutate }
}
