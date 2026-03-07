'use client'
import useSWR from 'swr'
import type { SafetyData } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

export function useTokenSafety(address: string | null, chain = 'SOL') {
  const { data, error, isLoading } = useSWR<SafetyData>(
    address ? `/api/token/safety?address=${address}&chain=${chain}` : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  )
  return { safetyData: data, error, isLoading }
}
