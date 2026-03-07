import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function ScanLoading() {
  return (
    <div className="min-h-screen">
      {/* Header placeholder */}
      <div className="h-14 border-b border-border bg-bg-panel" />
      <main className="max-w-[1440px] mx-auto px-7 py-5 space-y-4">
        {/* Search bar */}
        <Skeleton className="h-12 w-full rounded-lg" />

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))}
        </div>

        {/* Tab row */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-32 rounded-lg" />
          ))}
        </div>

        {/* Main content area */}
        <Card>
          <Skeleton className="h-[300px]" />
        </Card>
      </main>
    </div>
  )
}
