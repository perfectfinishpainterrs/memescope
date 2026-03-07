import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function AlertsLoading() {
  return (
    <div className="min-h-screen">
      {/* Header placeholder */}
      <div className="h-14 border-b border-border bg-bg-panel" />
      <main className="max-w-[1440px] mx-auto px-7 py-5">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Create Alert Form */}
        <Card className="mb-6">
          <Skeleton className="h-4 w-28 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-24 mb-1.5" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-36 mt-4 rounded-lg" />
        </Card>

        {/* Active Alerts List */}
        <Card>
          <Skeleton className="h-4 w-28 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  )
}
