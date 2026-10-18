'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/Text';
import { Video as VideoType } from '@/lib/types';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Button } from '@/components/ui/button';
import { Trash2, Play } from 'lucide-react';
import { cn } from '@/lib';
import { Checkbox } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

interface VideoCardProps {
  video: VideoType;
  className?: string;
  onDelete?: (videoId: string) => void;
  onClick?: (video: VideoType) => void;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  isBulkDeleting?: boolean;
}

export function VideoCard({
  video,
  className,
  onDelete,
  onClick,
  isSelected = false,
  onSelect,
  isBulkDeleting = false,
}: VideoCardProps) {
  const { isAuthenticated } = useAuth();
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(video.id);
  };

  const handleClick = () => {
    onClick?.(video);
  };

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all hover:shadow-lg p-0',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      <div className='relative aspect-video overflow-hidden bg-muted'>
        {video.thumbnail_url ? (
          <>
            <OptimizedImage
              src={video.thumbnail_url}
              alt={video.title || 'Video thumbnail'}
              fill
              className='object-cover object-[center_20%] transition-transform
                group-hover:scale-105'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            />
            {/* Play button overlay */}
            <div
              className='absolute inset-0 flex items-center justify-center bg-black/20
                opacity-0 group-hover:opacity-100 transition-opacity'
            >
              <div className='rounded-full bg-white/90 p-4'>
                <Play className='w-8 h-8 text-black fill-black' />
              </div>
            </div>
          </>
        ) : (
          <div className='flex h-full items-center justify-center'>
            <Play className='w-12 h-12 text-muted-foreground' />
          </div>
        )}

        {/* Checkbox for bulk selection */}
        {isAuthenticated && onSelect && (
          <div className='absolute top-2 left-2 z-10'>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              disabled={isBulkDeleting}
              className='bg-background/80 backdrop-blur-sm'
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Delete button */}
        {isAuthenticated && (
          <div className='absolute top-2 right-2'>
            <Button variant='destructive' size='icon' onClick={handleDelete}>
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {(video.title || video.description) && (
        <CardContent className='p-3 space-y-1'>
          {video.title && (
            <Text variant='bd-sm' className='line-clamp-1 font-medium'>
              {video.title}
            </Text>
          )}
          {video.description && (
            <Text variant='bd-xs' className='text-muted-foreground line-clamp-2'>
              {video.description}
            </Text>
          )}
        </CardContent>
      )}
    </Card>
  );
}
