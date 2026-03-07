'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

export function useTokenOrderbook(address: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    address ? `/api/token/orderbook?address=${address}` : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  )
  return { orderbookData: data, error, isLoading, refresh: mutate }
}
