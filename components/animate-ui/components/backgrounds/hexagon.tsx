'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type HexagonBackgroundProps = React.ComponentProps<'div'> & {
  hexagonProps?: React.ComponentProps<'div'>;
  hexagonSize?: number; // value greater than 50
  hexagonMargin?: number;
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener('resize', onStoreChange);
  return () => window.removeEventListener('resize', onStoreChange);
}

function getViewportSnapshot() {
  return `${window.innerWidth}x${window.innerHeight}`;
}

function getServerViewportSnapshot() {
  return '0x0';
}

function HexagonBackground({
  className,
  children,
  hexagonProps,
  hexagonSize = 75,
  hexagonMargin = 3,
  ...props
}: HexagonBackgroundProps) {
  const hexagonWidth = hexagonSize;
  const hexagonHeight = hexagonSize * 1.1;
  const rowSpacing = hexagonSize * 0.8;
  const baseMarginTop = -36 - 0.275 * (hexagonSize - 100);
  const computedMarginTop = baseMarginTop + hexagonMargin;
  const oddRowMarginLeft = -(hexagonSize / 2);
  const evenRowMarginLeft = hexagonMargin / 2;

  const viewport = React.useSyncExternalStore(
    subscribe,
    getViewportSnapshot,
    getServerViewportSnapshot
  );

  const gridDimensions = React.useMemo(() => {
    const [width, height] = viewport.split('x').map(Number);
    return {
      rows: Math.ceil(height / rowSpacing),
      columns: Math.ceil(width / hexagonWidth) + 1,
    };
  }, [viewport, rowSpacing, hexagonWidth]);

  return (
    <div
      data-slot='hexagon-background'
      className={cn(
        'relative size-full overflow-hidden dark:bg-neutral-900 bg-neutral-100',
        className
      )}
      {...props}
    >
      <style>{`:root { --hexagon-margin: ${hexagonMargin}px; }`}</style>
      <div className='absolute top-0 -left-0 size-full overflow-hidden'>
        {Array.from({ length: gridDimensions.rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            style={{
              marginTop: computedMarginTop,
              marginLeft:
                ((rowIndex + 1) % 2 === 0 ? evenRowMarginLeft : oddRowMarginLeft) - 10,
            }}
            className='inline-flex'
          >
            {Array.from({ length: gridDimensions.columns }).map((_, colIndex) => (
              <div
                key={`hexagon-${rowIndex}-${colIndex}`}
                {...hexagonProps}
                style={{
                  width: hexagonWidth,
                  height: hexagonHeight,
                  marginLeft: hexagonMargin,
                  ...hexagonProps?.style,
                }}
                className={cn(
                  'relative',
                  '[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]',
                  `before:content-[''] before:absolute before:top-0 before:left-0
                  before:w-full before:h-full dark:before:bg-neutral-950 before:bg-white
                  before:opacity-100 before:transition-all before:duration-1000`,
                  `after:content-[''] after:absolute after:inset-[var(--hexagon-margin)]
                  dark:after:bg-neutral-950 after:bg-white`,
                  'after:[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]',
                  `hover:before:bg-neutral-200 dark:hover:before:bg-neutral-800
                  hover:before:opacity-100 hover:before:duration-0
                  dark:hover:after:bg-neutral-900 hover:after:bg-neutral-100
                  hover:after:opacity-100 hover:after:duration-0`,
                  hexagonProps?.className
                )}
              />
            ))}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

export { HexagonBackground, type HexagonBackgroundProps };
