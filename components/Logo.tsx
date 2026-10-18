import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

export function Logo({ className, showText = true, onClick }: LogoProps) {
  return (
    <div className='flex items-center justify-center'>
      <Button
        variant='link'
        className={cn('m-0 h-auto gap-2 p-0', className)}
        nativeButton={false}
        render={<Link href='/' onClick={onClick} />}
      >
        {showText && <span>Tseng Photography</span>}
      </Button>
    </div>
  );
}
