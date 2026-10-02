import { OptimizedImage } from '@/components/OptimizedImage';
import { getDelayClass } from '@/utils/animations';
import Link from 'next/link';
import { Separator } from './ui';
import { ChevronRight } from 'lucide-react';

export function Footer() {
  return (
    <footer>
      <Separator className='border-t-2' />
      <div className='container mx-auto border-x-2 border-dashed'>
        <div className='flex flex-col items-center gap-6 py-8'>
          <div
            className={`text-lg md:text-xl font-semibold fade-in-from-bottom
              ${getDelayClass(1)}`}
          >
            Contacts
          </div>
          <Link
            href='https://www.instagram.com/matthewtseng35/'
            target='_blank'
            rel='noopener noreferrer'
            className={`flex items-center gap-2 hover:opacity-70 transition-opacity
              fade-in-from-bottom ${getDelayClass(2)}`}
          >
            <OptimizedImage
              src='/icons/instagram-svgrepo-com.svg'
              alt='Instagram'
              width={24}
              height={24}
              className='dark:invert'
            />
            <span className='text-base md:text-lg'>matthewtseng35</span>
          </Link>
          <div
            className={`text-sm text-muted-foreground fade-in-from-bottom
              ${getDelayClass(3)}`}
          >
            <div className='flex gap-2 items-center'>
              <p>built by</p>
              <Link href='https://web8th.com'>
                <OptimizedImage
                  className='not-dark:invert-100'
                  src='/8th_svg.svg'
                  alt='Logo'
                  width={48}
                  height={48}
                />
              </Link>

              <ChevronRight className='text-muted-foreground' />
              <Link href='https://rinm.dev'>
                <OptimizedImage
                  src='/rmlogo.png'
                  alt='Logo'
                  className='not-dark:invert-100'
                  width={48}
                  height={48}
                />
              </Link>
            </div>
          </div>
          <div
            className={`text-sm text-muted-foreground fade-in-from-bottom
              ${getDelayClass(4)}`}
          >
            © {new Date().getFullYear()} Matthew Tseng. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
