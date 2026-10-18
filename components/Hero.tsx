'use client';
import { cn } from '@/lib';
import { PhotoCarousel } from './PhotoCarousel';

const images = [
  '/landing/carousel/carousel_1.webp',
  '/landing/carousel/carousel_2.webp',
  '/landing/carousel/carousel_3.webp',
  '/landing/carousel/carousel_4.webp',
  '/landing/carousel/carousel_5.webp',
];

export function Hero({ className }: { className?: string }) {
  return (
    <PhotoCarousel
      images={images}
      autoplayDelay={3000}
      className={cn('w-screen', className)}
      containerClassName='h-screen'
      itemsToShow={1}
      navigation='bottom-center'
      showButtons={false}
      fullWidth={true}
      showLoading={false}
    />
  );
}
