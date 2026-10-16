'use client';
import { Text } from '@/components/Text';
import { useImageOptimization } from '@/contexts/ImageOptimizationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDelayClass } from '@/utils/animations';
import {
  driveImageLoader,
  getDirectDriveUrl,
  getDriveProxyUrl,
} from '@/utils/google-drive';
import { Loader2 } from 'lucide-react';
import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps extends ImageProps {
  showLoading?: boolean | 'spinner-only';
}

/**
 * Wrapper around Next.js Image that automatically falls back to unoptimized
 * images when Vercel returns 402 (billing limit exceeded).
 * Uses global state to avoid retrying optimization after first 402.
 * Google Drive images (direct or proxied) bypass Vercel and are resized by Google.
 *
 * @param showLoading - If true, shows a loading spinner and text while the image loads
 */
export function OptimizedImage({ showLoading = false, ...props }: OptimizedImageProps) {
  const { isOptimizationDisabled, disableOptimization } = useImageOptimization();
  const [localUnoptimized, setLocalUnoptimized] = useState(false);
  const [isLoading, setIsLoading] = useState(showLoading);
  const [driveFailed, setDriveFailed] = useState(false);
  const isMobile = useIsMobile();

  // Drive images are resized by Google, never by Vercel
  const driveUrl = typeof props.src === 'string' ? getDirectDriveUrl(props.src) : null;

  const handleError: ImageProps['onError'] = (error) => {
    if (driveUrl) {
      // Direct request failed (e.g. Google rate limit): retry once through our proxy.
      // Not a Vercel billing issue, so leave global optimization alone.
      if (!driveFailed) {
        setDriveFailed(true);
        return;
      }
      setIsLoading(false);
      props.onError?.(error);
      return;
    }

    // Disable optimization globally so all subsequent images skip optimization
    if (!isOptimizationDisabled) {
      disableOptimization();
    }
    setLocalUnoptimized(true);
    setIsLoading(false);

    // Call the original onError if provided
    props.onError?.(error);
  };

  const handleLoad: ImageProps['onLoad'] = (result) => {
    setIsLoading(false);

    // Call the original onLoad if provided
    props.onLoad?.(result);
  };

  // Force Image to remount when switching to unoptimized mode
  // This ensures the image refetches with the new unoptimized URL
  const shouldUseUnoptimized =
    props.unoptimized || isOptimizationDisabled || localUnoptimized;
  const sourceProps: Partial<Pick<ImageProps, 'src' | 'loader' | 'unoptimized'>> =
    driveUrl
      ? driveFailed
        ? { src: getDriveProxyUrl(driveUrl), unoptimized: true }
        : { src: driveUrl, loader: driveImageLoader, unoptimized: false }
      : { unoptimized: shouldUseUnoptimized };
  const imageKey = `${props.src}-${
    driveUrl
      ? driveFailed
        ? 'drive-proxy'
        : 'drive'
      : shouldUseUnoptimized
        ? 'unopt'
        : 'opt'
  }`;

  const imageElement = (
    <Image
      {...props}
      {...sourceProps}
      key={imageKey}
      alt={props.alt || ''}
      onError={handleError}
      onLoad={handleLoad}
    />
  );

  if (!showLoading) {
    return imageElement;
  }

  return (
    // `fill` images size to this wrapper, so it needs the parent's height;
    // intrinsic-size images (masonry grid) must not be stretched by it
    <div className={`relative w-full ${props.fill ? 'h-full' : ''}`}>
      {isLoading && (
        <div
          className={`absolute inset-0 z-10 bg-black/50
          ${isMobile ? '' : 'backdrop-blur-md'} flex flex-col items-center justify-center
          fade-in-from-bottom ${getDelayClass(1)}`}
        >
          <Loader2
            className={`size-8 animate-spin text-primary mb-3 fade-in-from-bottom
            ${getDelayClass(2)}`}
          />
          {showLoading !== 'spinner-only' && (
            <Text
              variant='bd-xs'
              className={`text-center text-white fade-in-from-bottom ${getDelayClass(3)}`}
            >
              We&apos;re fetching the highest quality possible...
            </Text>
          )}
        </div>
      )}
      {imageElement}
    </div>
  );
}
