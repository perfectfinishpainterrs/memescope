import dynamic from 'next/dynamic'

export const LazyPriceChart = dynamic(
  () => import('./price-chart').then((m) => ({ default: m.PriceChart })),
  {
    loading: () => <div className="h-[300px] bg-bg-card rounded-lg animate-pulse" />,
    ssr: false,
  }
)

export const LazyHolderTrendChart = dynamic(
  () => import('./holder-trend-chart').then((m) => ({ default: m.HolderTrendChart })),
  {
    loading: () => <div className="h-[200px] bg-bg-card rounded-lg animate-pulse" />,
    ssr: false,
  }
)

export const LazyHolderFlowChart = dynamic(
  () => import('./holder-flow-chart').then((m) => ({ default: m.HolderFlowChart })),
  {
    loading: () => <div className="h-[200px] bg-bg-card rounded-lg animate-pulse" />,
    ssr: false,
  }
)

export const LazyHolderDistributionChart = dynamic(
  () => import('./holder-distribution-chart').then((m) => ({ default: m.HolderDistributionChart })),
  {
    loading: () => <div className="h-[200px] bg-bg-card rounded-lg animate-pulse" />,
    ssr: false,
  }
)
