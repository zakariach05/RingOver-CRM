interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const ROUNDED = { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-full' }

export default function Skeleton({ className = '', rounded = 'lg' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 ${ROUNDED[rounded]} ${className}`} />
}
