import Skeleton from './Skeleton'

export default function PageSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="min-w-[280px] w-[280px] space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-3 w-3" rounded="full" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
