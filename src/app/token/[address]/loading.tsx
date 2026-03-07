import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function TokenLoading() {
  return (
    <div className="min-h-screen">
      {/* Header placeholder */}
      <div className="h-14 border-b border-border bg-bg-panel" />
      <main className="max-w-[1440px] mx-auto px-7 py-5 space-y-5">
        {/* Back link */}
        <Skeleton className="h-4 w-32" />

        {/* Token header */}
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
        </Card>

        {/* Price chart */}
        <Card>
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-[300px] w-full" />
        </Card>

        {/* Market stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-24" />
            </Card>
          ))}
        </div>

        {/* Holder analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="h-[200px]" />
            </Card>
          ))}
        </div>

        {/* Safety scanner */}
        <Card>
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-16 w-full mb-3" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </main>
    </div>
  )
}
