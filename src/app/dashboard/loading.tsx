import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Header placeholder */}
      <div className="h-14 border-b border-border bg-bg-panel" />
      <main className="max-w-[1440px] mx-auto px-7 py-5 space-y-8">
        {/* Page title */}
        <Skeleton className="h-8 w-40" />

        {/* Saved Wallets section */}
        <section className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))}
          </div>
        </section>

        {/* Watchlist section */}
        <section className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Card>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </Card>
        </section>

        {/* Recent Scans section */}
        <section className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Card>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}
