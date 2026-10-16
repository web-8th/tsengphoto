'use client';

import { OptimizedImage } from '@/components/OptimizedImage';
import { Text } from '@/components/Text';
import { Card } from '@/components/ui';
import { cn } from '@/lib';
import { CollectionWithImages } from '@/lib/types/database';
import { scrollToTop } from '@/utils/scroll';
import { Layers, ImageOff } from 'lucide-react';

interface CollectionGroupCardProps {
  groupName: string;
  collections: CollectionWithImages[];
  className?: string;
  onClick?: () => void;
}

export function CollectionGroupCard({
  groupName,
  collections,
  className,
  onClick,
}: CollectionGroupCardProps) {
  // Get the first available cover image from any collection in the group
  const collectionWithCover = collections.find((c) => c.cover_image_url);
  const coverImage = collectionWithCover?.cover_image_url;

  const handleClick = () => {
    scrollToTop();
    onClick?.();
  };

  return (
    <div onClick={handleClick} className='cursor-pointer group block h-full'>
      <Card
        className={cn(
          'h-full overflow-hidden transition-all hover:shadow-lg py-0 gap-0',
          className
        )}
      >
        {/* Cover Image */}
        <div className='relative aspect-video overflow-hidden bg-muted'>
          {coverImage ? (
            <OptimizedImage
              src={coverImage}
              alt={groupName}
              fill
              loading='lazy'
              className='object-cover object-[center_20%] transition-transform
                group-hover:scale-105'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            />
          ) : (
            <div
              className='flex h-full flex-col items-center justify-center gap-2
                text-center'
            >
              <ImageOff className='w-12 h-12 text-muted-foreground' />
              <Text variant='muted'>No cover image</Text>
            </div>
          )}

          {/* Group icon - Top Right */}
          <Layers className='absolute top-3 right-3 size-5 text-white drop-shadow-md
            md:size-6' />

          {/* Title overlay */}
          <div
            className='pointer-events-none absolute inset-x-0 bottom-0 h-1/2
              bg-gradient-to-t from-black/80 via-black/40 to-transparent'
          />
          <div className='absolute bottom-3 left-4 right-4 text-white'>
            <Text variant='hd-xs'>{groupName}</Text>
            <Text variant='bd-xs' className='text-white/80'>
              {collections.length}{' '}
              {collections.length === 1 ? 'collection' : 'collections'}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
