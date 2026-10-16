import { Skeleton } from '@/components/ui';
import { getDelayClass } from '@/utils/animations';

// `animate={false}` is used when a client component renders this skeleton right after
// the route-level loading.tsx fallback, so the swap doesn't replay the entry animation.
export default function VideoCollectionDetailLoading({
  animate = true,
}: { animate?: boolean } = {}) {
  const fadeIn = (index: number) =>
    animate ? `fade-in-from-top ${getDelayClass(index)}` : '';

  return (
    <div
      className={`container mx-auto px-4 pb-4 nb-padding
        ${animate ? 'fade-in-from-bottom' : ''}`}
    >
      {/* Header Skeleton */}
      <div className='mb-12 space-y-6'>
        <div className='space-y-2'>
          <div className={fadeIn(1)}>
            <Skeleton className='h-10 w-20' />
          </div>
          <div className={fadeIn(2)}>
            <Skeleton className='h-12 w-96' />
          </div>
        </div>
        <div className={fadeIn(3)}>
          <Skeleton className='h-6 w-full max-w-3xl' />
        </div>
        <div className={fadeIn(4)}>
          <Skeleton className='h-6 w-2/3 max-w-3xl' />
        </div>
        <div className='flex gap-6'>
          <div className={fadeIn(5)}>
            <Skeleton className='h-6 w-32' />
          </div>
          <div className={fadeIn(6)}>
            <Skeleton className='h-6 w-32' />
          </div>
          <div className={fadeIn(7)}>
            <Skeleton className='h-6 w-24' />
          </div>
        </div>
      </div>

      {/* Gallery Skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={fadeIn(i + 8)}>
            <Skeleton className='aspect-16/10' />
          </div>
        ))}
      </div>
    </div>
  );
}
