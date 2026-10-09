'use client';

import * as React from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  btnVariant?: React.ComponentProps<typeof Button>['variant'];
  btnLocation?: 'default' | 'mb' | 'below-carousel';
  showDots?: boolean;
  dotsLocation?: 'absolute' | 'below-carousel';
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  btnVariant?: React.ComponentProps<typeof Button>['variant'];
  btnLocation?: 'default' | 'mb' | 'below-carousel';
  showDots?: boolean;
  dotsLocation?: 'absolute' | 'below-carousel';
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }

  return context;
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  btnVariant = 'outline',
  btnLocation = 'default',
  showDots = false,
  dotsLocation = 'absolute',
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    // Sync scroll state with Embla (external store); defer to avoid sync setState-in-effect
    queueMicrotask(() => onSelect(api));
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api?.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        btnVariant,
        btnLocation,
        showDots,
        dotsLocation,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role='region'
        aria-roledescription='carousel'
        data-slot='carousel'
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className='overflow-hidden' data-slot='carousel-content'>
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          className
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel();

  return (
    <div
      role='group'
      aria-roledescription='slide'
      data-slot='carousel-item'
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant,
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev, btnVariant, btnLocation } =
    useCarousel();

  return (
    <Button
      data-slot='carousel-previous'
      variant={variant || btnVariant || 'outline'}
      size={size}
      className={cn(
        'size-8 rounded-full',
        btnLocation === 'mb'
          ? 'relative'
          : btnLocation === 'below-carousel'
            ? 'relative'
            : orientation === 'horizontal'
              ? 'absolute top-1/2 -left-12 -translate-y-1/2'
              : 'absolute -top-12 left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <>
        <ArrowLeft />
        <span className='sr-only'>Previous slide</span>
      </>
    </Button>
  );
}

function CarouselNext({
  className,
  variant,
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext, btnVariant, btnLocation } =
    useCarousel();

  return (
    <Button
      data-slot='carousel-next'
      variant={variant || btnVariant || 'outline'}
      size={size}
      className={cn(
        'size-8 rounded-full',
        btnLocation === 'mb'
          ? 'relative'
          : btnLocation === 'below-carousel'
            ? 'relative'
            : orientation === 'horizontal'
              ? 'absolute top-1/2 -right-12 -translate-y-1/2'
              : 'absolute -bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <>
        <ArrowRight />
        <span className='sr-only'>Next slide</span>
      </>
    </Button>
  );
}

function CarouselDots({ className, ...props }: React.ComponentProps<'div'>) {
  const { api, dotsLocation } = useCarousel();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  const onInit = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  React.useEffect(() => {
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
      api?.off('select', onSelect);
    };
  }, [api, onInit, onSelect]);

  return (
    <div
      className={cn(
        'flex gap-2 justify-center',
        dotsLocation === 'absolute'
          ? 'absolute bottom-7 left-1/2 -translate-x-1/2 z-10'
          : '',
        className
      )}
      {...props}
    >
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          className={cn(
            'rounded-full transition-all',
            index === selectedIndex
              ? 'w-6 h-2 bg-primary'
              : 'w-2 h-2 bg-accent hover:bg-accent-foreground'
          )}
          onClick={() => api?.scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
};
