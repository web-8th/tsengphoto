'use client';

import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Text } from '@/components/Text';
import { Card, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib';
import { VideoCollectionWithVideos } from '@/lib/types/database';
import { Edit, Globe, GlobeLock, ImageOff, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface VideoCollectionCardProps {
  videoCollection: VideoCollectionWithVideos;
  className?: string;
  onEdit?: (videoCollection: VideoCollectionWithVideos) => void;
  onDelete?: (videoCollectionId: string) => void;
  onPublish?: (videoCollectionId: string) => void;
}

export function VideoCollectionCard({
  videoCollection,
  className,
  onEdit,
  onDelete,
  onPublish,
}: VideoCollectionCardProps) {
  const { isAuthenticated } = useAuth();

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(videoCollection);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(videoCollection.id);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPublish?.(videoCollection.id);
  };

  return (
    <Link
      href={`/video-collections/${videoCollection.slug}`}
      className='group block h-full'
    >
      <Card
        className={cn(
          'h-full overflow-hidden transition-all hover:shadow-lg py-0 gap-0',
          className
        )}
      >
        {/* Cover Image */}
        <div className='relative aspect-video overflow-hidden bg-muted'>
          {videoCollection.cover_image_url ? (
            <OptimizedImage
              src={videoCollection.cover_image_url}
              alt={videoCollection.title}
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

          {/* Title overlay */}
          <div
            className='pointer-events-none absolute inset-x-0 bottom-0 h-1/2
              bg-gradient-to-t from-black/80 via-black/40 to-transparent'
          />
          <Text variant='hd-xs' className='absolute bottom-3 left-4 right-4 text-white'>
            {videoCollection.title}
          </Text>

          {/* Admin Actions */}
          {isAuthenticated && (
            <div className='absolute top-3 right-3 flex gap-2'>
              <div className='flex flex-row gap-2'>
                <Button variant='secondary' size='icon' onClick={handleEdit}>
                  <Edit />
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant={videoCollection.is_published ? 'secondary' : 'default'}
                        size='icon'
                        onClick={handlePublish}
                      />
                    }
                  >
                    {videoCollection.is_published ? <Globe /> : <GlobeLock />}
                  </TooltipTrigger>
                  <TooltipContent>
                    {videoCollection.is_published
                      ? 'Collection is published. Click to unpublish.'
                      : 'Collection is not published. Click to publish.'}
                  </TooltipContent>
                </Tooltip>
                <Button variant='destructive' size='icon' onClick={handleDelete}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
