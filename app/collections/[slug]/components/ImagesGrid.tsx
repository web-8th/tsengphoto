'use client';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Text } from '@/components/Text';
import { Checkbox, CheckboxIndicator } from '@/components/animate-ui/components';
import { Button } from '@/components/animate-ui/components/button';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileDevice } from '@/hooks/use-mobile-device';
import type { CollectionImage } from '@/lib/types';
import { getDelayClass } from '@/utils/animations';
import {
  getMasonryColumnCount,
  packMasonryColumns,
  type MasonryBreakpointCols,
} from '@/utils/masonry';
import { ImageOff, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Masonry from 'react-masonry-css';

interface ImagesGridProps {
  images: CollectionImage[];
  collectionTitle: string;
  onImageClick: (index: number) => void;
  source: 'uploaded' | 'drive';
  startIndex?: number;
  onDeleteImage?: (imageId: string) => void;
  isDeletingImage?: boolean;
  onBulkDelete?: (images: CollectionImage[]) => void;
  isBulkDeleting?: boolean;
  deletionProgress?: { current: number; total: number };
  maxColumns?: number;
  disableDownload?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}

function imageSrc(image: CollectionImage, isDrive: boolean) {
  if (!image.image_url) return null;
  return isDrive
    ? `/api/v1/proxy-image?url=${encodeURIComponent(image.image_url)}`
    : image.image_url;
}

export function ImagesGrid({
  images,
  collectionTitle,
  onImageClick,
  source,
  startIndex = 0,
  onDeleteImage,
  isDeletingImage = false,
  onBulkDelete,
  isBulkDeleting = false,
  deletionProgress = { current: 0, total: 0 },
  maxColumns = 5,
  disableDownload = false,
  selectedIds = new Set<string>(),
  onSelectionChange,
}: ImagesGridProps) {
  const { isAuthenticated } = useAuth();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [aspectById, setAspectById] = useState<Record<string, number>>({});
  const [viewportWidth, setViewportWidth] = useState(1280);
  const isMobile = useIsMobile(); // For UI interactions
  const isMobileDevice = useMobileDevice(); // For feature detection

  const isDrive = source === 'drive';
  const isUploaded = source === 'uploaded';

  // Show selection UI only if not on a mobile device and user can download OR delete
  const canSelectImages =
    !isMobileDevice && (!disableDownload || (isAuthenticated && isUploaded));

  const breakpointCols: MasonryBreakpointCols = useMemo(
    () => ({
      default: maxColumns,
      1280: Math.min(maxColumns, 4),
      1024: Math.min(maxColumns, 3),
      768: 2,
      640: 1,
    }),
    [maxColumns]
  );

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Prefetch intrinsic ratios so packing matches rendered photo heights
  useEffect(() => {
    let cancelled = false;

    images.forEach((image) => {
      const src = imageSrc(image, isDrive);
      if (!src) return;

      const img = new window.Image();
      img.onload = () => {
        if (cancelled || !img.naturalWidth) return;
        const ratio = img.naturalHeight / img.naturalWidth;
        setAspectById((prev) => {
          if (prev[image.id] === ratio) return prev;
          return { ...prev, [image.id]: ratio };
        });
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [images, isDrive]);

  const columnCount = getMasonryColumnCount(breakpointCols, viewportWidth);

  const originalIndexById = useMemo(() => {
    const map = new Map<string, number>();
    images.forEach((image, index) => map.set(image.id, index));
    return map;
  }, [images]);

  // Pack by height, then hand Masonry one child per column (keeps that packing)
  const masonryColumns = useMemo(
    () =>
      packMasonryColumns(
        images,
        columnCount,
        (image) => aspectById[image.id] ?? 1
      ),
    [images, columnCount, aspectById]
  );

  const handleImageError = (imageId: string) => {
    setFailedImages((prev) => new Set(prev).add(imageId));
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(new Set(images.map((img) => img.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    onSelectionChange(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0 || !onBulkDelete) return;
    const selectedImages = images.filter((img) => selectedIds.has(img.id));
    onBulkDelete(selectedImages);
  };

  const handleDeleteClick = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (onDeleteImage) {
      onDeleteImage(imageId);
    }
  };

  const renderImageCard = (image: CollectionImage) => {
    const originalIndex = originalIndexById.get(image.id) ?? 0;
    const globalIndex = isDrive ? startIndex + originalIndex : originalIndex;
    const hasFailed = failedImages.has(image.id);
    const src = imageSrc(image, isDrive);

    return (
      <div
        key={image.id}
        className={`group relative mb-4 overflow-hidden rounded ${
          isMobile ? '' : 'cursor-pointer'
        } fade-in-from-top
        ${getDelayClass(globalIndex)}`}
        onClick={isMobile ? undefined : () => onImageClick(globalIndex)}
      >
        <div className='relative overflow-hidden'>
          {hasFailed && isDrive ? (
            <div
              className='flex h-64 flex-col items-center justify-center gap-2
                bg-muted rounded'
            >
              <ImageOff className='w-8 h-8 text-muted-foreground' />
              <Text variant='muted-sm'>Failed to load</Text>
            </div>
          ) : src ? (
            <OptimizedImage
              src={src}
              alt={`${collectionTitle} - ${isDrive ? 'Google Drive Photo' : 'Photo'} ${originalIndex + 1}`}
              width={800}
              height={600}
              className='w-full h-auto rounded hover:scale-105 transition-transform
                duration-300'
              sizes='(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
              loading='lazy'
              showLoading='spinner-only'
              onError={() => handleImageError(image.id)}
            />
          ) : (
            <div className='flex h-64 items-center justify-center bg-muted rounded'>
              <Text variant='muted'>No image</Text>
            </div>
          )}

          {canSelectImages && (
            <div className='absolute top-2 left-2 z-10'>
              <Checkbox
                checked={selectedIds.has(image.id)}
                onCheckedChange={(checked) =>
                  handleSelectOne(image.id, checked as boolean)
                }
                disabled={isBulkDeleting}
                variant='overlay'
                onClick={(e) => e.stopPropagation()}
              >
                <CheckboxIndicator />
              </Checkbox>
            </div>
          )}

          {isAuthenticated && isUploaded && (
            <div className='absolute top-2 right-2 z-10'>
              <Button
                variant='destructive'
                size='icon'
                onClick={(e) => handleDeleteClick(e, image.id)}
                disabled={isDeletingImage || isBulkDeleting}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Title for Drive images */}
      {isDrive && (
        <Text variant='hd-lg' className={`fade-in-from-top ${getDelayClass(1)}`}>
          {startIndex > 0 ? 'More Images from' : 'Images from'} Google Drive
        </Text>
      )}

      {/* Bulk Actions Bar - Hidden on mobile */}
      {images.length > 0 && canSelectImages && (
        <div
          className={`flex items-center justify-between w-full gap-2 fade-in-from-top
          ${getDelayClass(isDrive ? 4 : 1)}`}
        >
          <label className='flex items-center gap-2 cursor-pointer'>
            <Checkbox
              checked={selectedIds.size === images.length && images.length > 0}
              onCheckedChange={handleSelectAll}
              disabled={isBulkDeleting}
            >
              <CheckboxIndicator />
            </Checkbox>
            <Text variant='bd-sm'>Select All</Text>
          </label>
          <div className='flex gap-2'>
            {isAuthenticated && isUploaded && selectedIds.size > 0 && (
              <Button
                variant='destructive'
                size='sm'
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <>
                    <Spinner /> Deleting {deletionProgress.current} of{' '}
                    {deletionProgress.total}...
                  </>
                ) : (
                  <>
                    <Trash2 /> Delete Selected ({selectedIds.size})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Device Hint - Show only on mobile devices when downloads are available */}
      {images.length > 0 && isMobileDevice && !disableDownload && (
        <div
          className={`p-4 rounded-lg border border-dashed border-muted-foreground/30
          bg-muted/30 fade-in-from-top ${getDelayClass(isDrive ? 4 : 1)}`}
        >
          <Text variant='bd-sm' className='text-muted-foreground'>
            💡 <strong>Hint:</strong> Bulk downloading is only available on desktop. To
            save images on mobile, long press any image and select &quot;Save Image&quot;.
          </Text>
        </div>
      )}

      {/* One Masonry child per column so round-robin preserves height packing */}
      <Masonry
        breakpointCols={columnCount}
        className='masonry-grid'
        columnClassName='masonry-grid_column'
      >
        {masonryColumns.map((columnImages, columnIndex) => (
          <div key={`masonry-col-${columnIndex}`}>
            {columnImages.map((image) => renderImageCard(image))}
          </div>
        ))}
      </Masonry>
    </div>
  );
}
