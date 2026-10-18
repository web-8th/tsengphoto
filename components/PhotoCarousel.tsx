'use client';
import { OptimizedImage } from '@/components/OptimizedImage';
import {
  Card,
  CardContent,
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Progress,
  useCarousel,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Fills the active dot over the autoplay delay. Shows a solid dot whenever autoplay
// isn't running (no delay, off-screen, or stopped after the user interacts).
function AutoplayProgressDot({ delay }: { delay: number }) {
  const { api } = useCarousel();
  const [value, setValue] = useState(100);

  useEffect(() => {
    const autoplay = api?.plugins().autoplay;
    if (!autoplay || delay <= 0) return;

    let frame: number;
    const tick = () => {
      const remaining = autoplay.isPlaying() ? autoplay.timeUntilNext() : null;
      setValue(remaining === null ? 100 : (1 - remaining / delay) * 100);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [api, delay]);

  return (
    <Progress
      aria-hidden
      value={value}
      // Fill with scaleX instead of the indicator's width: width snaps to whole pixels,
      // which steps visibly on a bar this small, while transforms render sub-pixel
      style={{ '--dot-progress': value / 100 } as React.CSSProperties}
      className='w-full [&_[data-slot=progress-indicator]]:w-full!
        [&_[data-slot=progress-indicator]]:origin-left
        [&_[data-slot=progress-indicator]]:scale-x-(--dot-progress)
        [&_[data-slot=progress-indicator]]:transition-none
        [&_[data-slot=progress-indicator]]:will-change-transform
        [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-accent'
    />
  );
}

function CarouselDots({
  className,
  autoplayDelay = 0,
  ...props
}: React.ComponentProps<'div'> & { autoplayDelay?: number }) {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onInit = useCallback((api: CarouselApi) => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    // Sync dots with Embla (external store); defer to avoid sync setState-in-effect
    queueMicrotask(() => {
      onInit(api);
      onSelect(api);
    });
    api.on('reInit', onInit);
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api.off('reInit', onInit);
      api.off('reInit', onSelect);
      api.off('select', onSelect);
    };
  }, [api, onInit, onSelect]);

  return (
    <div
      className={cn(
        'absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 justify-center gap-2',
        className
      )}
      {...props}
    >
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          className={cn(
            'flex h-2 transition-all',
            index === selectedIndex ? 'w-6' : 'w-2 bg-accent hover:bg-accent-foreground'
          )}
          onClick={() => api?.scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
        >
          {index === selectedIndex && <AutoplayProgressDot delay={autoplayDelay} />}
        </button>
      ))}
    </div>
  );
}

interface PhotoCarouselProps {
  images: string[];
  autoplayDelay?: number;
  className?: string;
  containerClassName?: string;
  itemsToShow?: 1 | 2 | 3;
  btnVariant?: 'ghost' | 'outline';
  navigation?: 'overlay' | 'bottom-center' | 'side-center' | 'below' | 'none';
  showButtons?: boolean;
  fullWidth?: boolean;
  showDots?: boolean;
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
  showLoading?: boolean;
  onIndexChange?: (index: number) => void;
}

export function PhotoCarousel({
  images,
  autoplayDelay = 3000,
  className,
  containerClassName,
  itemsToShow = 3,
  btnVariant = 'ghost',
  navigation = 'overlay',
  showButtons = true,
  fullWidth = false,
  showDots = true,
  objectFit = 'cover',
  objectPosition = 'center',
  showLoading = true,
  onIndexChange,
}: PhotoCarouselProps) {
  // Ghost hovers to bg-muted, which disappears on muted sections; accent stays visible
  const navButtonClass =
    btnVariant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' : '';

  const itemBasisClass =
    itemsToShow === 1
      ? 'basis-full'
      : itemsToShow === 2
        ? 'md:basis-1/2'
        : 'md:basis-1/2 lg:basis-1/3';

  // Match the slide widths above so the browser downloads a right-sized image
  const imageSizes =
    itemsToShow === 1
      ? '100vw'
      : itemsToShow === 2
        ? '(max-width: 768px) 100vw, 50vw'
        : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';

  const carouselOpts = {
    align: 'start' as const,
    containScroll: 'trimSnaps' as const,
    loop: true,
  };

  // Only use Autoplay plugin if autoplayDelay is greater than 0.
  // Autoplay starts once the carousel scrolls into view (see effect below).
  const plugins = useMemo(
    () =>
      autoplayDelay > 0 ? [Autoplay({ delay: autoplayDelay, playOnInit: false })] : [],
    [autoplayDelay]
  );

  const [api, setApi] = useState<CarouselApi>();
  const sectionRef = useRef<HTMLElement>(null);

  // Pause autoplay while the carousel is off-screen so it isn't animating unseen
  useEffect(() => {
    const autoplay = api?.plugins().autoplay;
    const el = sectionRef.current;
    if (!autoplay || !el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) autoplay.play();
      else autoplay.stop();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [api]);

  useEffect(() => {
    if (!api || !onIndexChange) return;
    api.on('select', () => onIndexChange(api.selectedScrollSnap()));
  }, [api, onIndexChange]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        !fullWidth && 'container mx-auto',
        itemsToShow === 1 && 'bg-transparent',
        className
      )}
    >
      <Carousel
        setApi={setApi}
        className={cn('w-full')}
        opts={carouselOpts}
        plugins={plugins}
      >
        <CarouselContent
          className={itemsToShow === 1 ? 'ml-0! bg-transparent' : '-ml-2 md:-ml-4'}
        >
          {images.map((src, index) => (
            <CarouselItem
              key={index}
              className={cn(
                itemsToShow === 1 ? 'pl-0! bg-transparent border-0' : 'pl-2 md:pl-4',
                itemBasisClass
              )}
            >
              {itemsToShow === 1 ? (
                <div
                  className={cn(
                    'flex items-center justify-center relative bg-transparent w-full',
                    containerClassName
                  )}
                >
                  <OptimizedImage
                    src={src}
                    alt={`Image ${index + 1}`}
                    fill
                    sizes={imageSizes}
                    className={objectFit === 'cover' ? 'object-cover' : 'object-contain'}
                    style={{ objectPosition }}
                    showLoading={showLoading}
                  />
                </div>
              ) : (
                <Card className='p-0 bg-black'>
                  <CardContent
                    className={cn(
                      'flex items-center justify-center p-0 relative bg-black',
                      containerClassName
                    )}
                  >
                    <OptimizedImage
                      src={src}
                      alt={`Image ${index + 1}`}
                      fill
                      sizes={imageSizes}
                      className={
                        objectFit === 'cover' ? 'object-cover' : 'object-contain'
                      }
                      style={{ objectPosition }}
                    />
                  </CardContent>
                </Card>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Navigation: Overlay (default) */}
        {navigation === 'overlay' && (
          <>
            {showButtons && (
              <>
                <CarouselPrevious
                  variant={btnVariant}
                  className={cn(navButtonClass, 'hidden sm:flex')}
                />
                <CarouselNext
                  variant={btnVariant}
                  className={cn(navButtonClass, 'hidden sm:flex')}
                />
              </>
            )}
            {showDots && <CarouselDots autoplayDelay={autoplayDelay} />}
          </>
        )}
        {/* Navigation: Bottom Center */}
        {navigation === 'bottom-center' && (
          <div
            className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center
              mb-2 gap-3'
          >
            {showButtons && (
              <CarouselPrevious
                variant={btnVariant}
                className={cn(navButtonClass, 'hidden sm:flex')}
              />
            )}
            {showDots && (
              <CarouselDots
                autoplayDelay={autoplayDelay}
                className='static translate-x-0'
              />
            )}
            {showButtons && (
              <CarouselNext
                variant={btnVariant}
                className={cn(navButtonClass, 'hidden sm:flex')}
              />
            )}
          </div>
        )}
        {/* Navigation: Side Center */}
        {navigation === 'side-center' && (
          <>
            {showButtons && (
              <>
                <CarouselPrevious
                  variant={btnVariant}
                  className={cn(navButtonClass, 'hidden sm:flex left-4')}
                />
                <CarouselNext
                  variant={btnVariant}
                  className={cn(navButtonClass, 'hidden sm:flex right-4')}
                />
              </>
            )}
            {showDots && (
              <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10'>
                <CarouselDots
                  autoplayDelay={autoplayDelay}
                  className='static translate-x-0'
                />
              </div>
            )}
          </>
        )}
        {/* Navigation: Below */}
        {navigation === 'below' && (
          <div className='flex items-center justify-center gap-4 mt-2'>
            {showButtons && (
              <CarouselPrevious
                variant={btnVariant}
                className={cn(navButtonClass, 'static translate-x-0 translate-y-0')}
              />
            )}
            {showDots && (
              <CarouselDots
                autoplayDelay={autoplayDelay}
                className='static translate-x-0'
              />
            )}
            {showButtons && (
              <CarouselNext
                variant={btnVariant}
                className={cn(navButtonClass, 'static translate-x-0 translate-y-0')}
              />
            )}
          </div>
        )}
        {/* Navigation: None - render nothing */}
      </Carousel>
    </section>
  );
}
