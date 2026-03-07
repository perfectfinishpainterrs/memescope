'use client'
import useSWR from 'swr'
import type { SentimentScore, Tweet } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

interface SentimentResult { sentiment: SentimentScore; tweets: Tweet[] }

export function useTokenSentiment(address: string | null, ticker: string | null) {
  const { data, error, isLoading } = useSWR<SentimentResult>(
    address && ticker ? `/api/token/sentiment?address=${address}&ticker=${ticker}` : null,
    fetcher,
    { refreshInterval: 120_000, revalidateOnFocus: false }
  )
  return { sentimentData: data?.sentiment, tweets: data?.tweets, error, isLoading }
}
