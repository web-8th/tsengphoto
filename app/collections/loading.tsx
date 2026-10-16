import { Skeleton } from '@/components/ui';
import { getDelayClass } from '@/utils/animations';

// `animate={false}` is used when a client component renders this skeleton right after
// the route-level loading.tsx fallback, so the swap doesn't replay the entry animation.
export default function CollectionsLoading({
  animate = true,
}: { animate?: boolean } = {}) {
  const fadeIn = (index: number) =>
    animate ? `fade-in-from-bottom ${getDelayClass(index)}` : '';

  return (
    <div className='pt-18'>
      {/* Header Skeleton */}
      <div
        className='container mx-auto border-x-2 border-dashed text-center space-y-4 py-8'
      >
        <div className={fadeIn(0)}>
          <Skeleton className='h-12 w-64 mx-auto' />
        </div>
        <div className={fadeIn(1)}>
          <Skeleton className='h-6 w-96 mx-auto' />
        </div>
      </div>

      {/* Separator */}
      <div className='border-t' />

      <div className='container mx-auto px-4 py-4 border-dashed border-x-2'>
        {/* Grid Skeleton */}
        <div className='container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`space-y-4 ${fadeIn(i + 2)}`}>
              <Skeleton className='aspect-4/3 w-full rounded-xl' />
              <div className='space-y-2'>
                <Skeleton className='h-6 w-3/4' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-2/3' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
