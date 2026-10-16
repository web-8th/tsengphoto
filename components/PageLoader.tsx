import { Spinner } from '@/components/ui/spinner';

/** Full-height page loader: spinner centered horizontally near the top, below the navbar. */
export function PageLoader() {
  return (
    <div className='flex h-screen justify-center pt-32'>
      <Spinner className='size-12 text-primary' />
    </div>
  );
}
