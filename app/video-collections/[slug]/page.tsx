'use client';

import { Checkbox, CheckboxIndicator } from '@/components/animate-ui/components';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/animate-ui/components/alert-dialog';
import { Button } from '@/components/animate-ui/components/button';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Spinner } from '@/components/ui';
import { VideoCard } from '@/components/video-collections/VideoCard';
import { VideoUploadDialog } from '@/components/video-collections/VideoUploadDialog';
import { VideoViewer } from '@/components/video-collections/VideoViewer';
import { useAuth } from '@/hooks/use-auth';
import { videoCollectionsQueryKeys } from '@/lib/queries/video-collections';
import type { Video } from '@/lib/types';
import { getDelayClass } from '@/utils/animations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Share2,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageLoader } from '@/components/PageLoader';

export default function VideoCollectionPage() {
  const params = useParams();
  const slug = params['slug'] as string;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });

  const {
    data: videoCollection,
    isLoading: isLoadingCollection,
    isError,
  } = useQuery({
    queryKey: [
      ...videoCollectionsQueryKeys.bySlug(slug),
      { includeUnpublished: isAuthenticated },
    ],
    queryFn: async () => {
      const response = await fetch(`/api/v1/video-collections/${slug}`);
      if (!response.ok) {
        throw new Error('Video collection not found');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !authLoading,
    retry: false, // Don't retry 404s - video collection doesn't exist
  });

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsViewerOpen(true);
  };

  const handleDeleteClick = (videoId: string) => {
    setVideoToDelete(videoId);
  };

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await fetch(`/api/v1/video/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Something went wrong.');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: videoCollectionsQueryKeys.bySlug(slug),
      });
      toast.success('Video removed from collection');
      setVideoToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete video', { description: error.message });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (videoIds: string[]) => {
      setBulkDeleteProgress({ current: 0, total: videoIds.length });

      for (let i = 0; i < videoIds.length; i++) {
        const videoId = videoIds[i];
        const response = await fetch(`/api/v1/video/${videoId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Something went wrong.');
        }

        setBulkDeleteProgress({ current: i + 1, total: videoIds.length });
      }
    },
    onSuccess: (_, videoIds) => {
      queryClient.invalidateQueries({
        queryKey: videoCollectionsQueryKeys.bySlug(slug),
      });
      toast.success('Videos removed from collection', {
        description: `Successfully deleted ${videoIds.length} video(s).`,
      });
      setBulkDeleteDialogOpen(false);
      setSelectedVideoIds(new Set());
      setBulkDeleteProgress({ current: 0, total: 0 });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete videos', { description: error.message });
      setBulkDeleteProgress({ current: 0, total: 0 });
    },
  });

  const confirmDelete = () => {
    if (videoToDelete) {
      deleteVideoMutation.mutate(videoToDelete);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVideoIds(new Set(sortedVideos.map((v: Video) => v.id)));
    } else {
      setSelectedVideoIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedVideoIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedVideoIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedVideoIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (selectedVideoIds.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedVideoIds));
    }
  };

  if (authLoading || isLoadingCollection) {
    return <PageLoader />;
  }

  if (isError || !videoCollection) {
    return notFound();
  }

  const formattedDate = videoCollection.date
    ? new Date(videoCollection.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const sortedVideos = (videoCollection.videos || []).sort(
    (a: Video, b: Video) => (a.order || 0) - (b.order || 0)
  );

  const handleShareClick = () => {
    const url = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: videoCollection.title,
          text: `Check out this collection: ${videoCollection.title}`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast.success('Link copied to clipboard');
        })
        .catch((error) => {
          toast.error('Failed to copy URL', { description: error.message });
        });
    }
  };

  return (
    <>
      <section
        className='container border-x-2 border-dashed mx-auto pb-4 px-4 nb-padding flex
          flex-col min-h-screen'
      >
        {/* Back Button */}
        <div className={`sticky top-20 mb-6 z-40 fade-in-from-top ${getDelayClass(0)}`}>
          <div className='flex items-center gap-4'>
            <Link href='/video-collections'>
              <Button variant='default'>
                <ArrowLeft />
                Back
              </Button>
            </Link>
            <Button variant='secondary' onClick={handleShareClick}>
              <Share2 className='size-5' />
              Share
            </Button>
            {isAuthenticated && (
              <Button variant='secondary' onClick={() => setUploadDialogOpen(true)}>
                <Plus />
                Add Video
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className='mb-6 space-y-6'>
          <div className='space-y-4'>
            <Text variant='hd-xxl' className={`fade-in-from-top ${getDelayClass(1)}`}>
              {videoCollection.title}
            </Text>
            {videoCollection.description && (
              <Text
                variant='bd-lg'
                className={`text-muted-foreground max-w-3xl fade-in-from-top
                ${getDelayClass(2)}`}
              >
                {videoCollection.description}
              </Text>
            )}
          </div>

          {/* Metadata */}
          <div
            className={`flex flex-wrap gap-6 text-muted-foreground fade-in-from-top
              ${getDelayClass(3)}`}
          >
            {formattedDate && (
              <div className='flex items-center gap-2'>
                <Calendar className='size-5' />
                <Text variant='bd-md'>{formattedDate}</Text>
              </div>
            )}
            {videoCollection.location && (
              <div className='flex items-center gap-2'>
                <MapPin className='size-5' />
                <Text variant='bd-md'>{videoCollection.location}</Text>
              </div>
            )}
          </div>
        </div>

        {/* Videos Grid */}
        {sortedVideos.length === 0 ? (
          <EmptyState
            icon={VideoIcon}
            title='No videos yet'
            description={
              isAuthenticated
                ? 'Get started by adding your first video to this collection.'
                : 'Check back later for video content.'
            }
            className='border-dashed border-2'
          />
        ) : (
          <div className='space-y-6'>
            {/* Bulk Actions Bar */}
            {isAuthenticated && sortedVideos.length > 0 && (
              <div
                className={`flex items-center justify-between w-full gap-2
                  fade-in-from-top ${getDelayClass(4)}`}
              >
                <label className='flex items-center gap-2 cursor-pointer'>
                  <Checkbox
                    checked={
                      selectedVideoIds.size === sortedVideos.length &&
                      sortedVideos.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <CheckboxIndicator />
                  </Checkbox>
                  <Text variant='bd-sm'>Select All</Text>
                </label>
                {(selectedVideoIds.size > 0 || bulkDeleteMutation.isPending) && (
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    {bulkDeleteMutation.isPending ? (
                      <>
                        <Spinner /> Deleting {bulkDeleteProgress.current} of{' '}
                        {bulkDeleteProgress.total}...
                      </>
                    ) : (
                      <>
                        <Trash2 /> Delete Selected ({selectedVideoIds.size})
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {sortedVideos.map((video: Video, index: number) => (
                <div
                  key={video.id}
                  className={`fade-in-from-top ${getDelayClass(index + 5)}`}
                >
                  <VideoCard
                    video={video}
                    onDelete={handleDeleteClick}
                    onClick={handleVideoClick}
                    isSelected={selectedVideoIds.has(video.id)}
                    onSelect={
                      isAuthenticated
                        ? (checked) => handleSelectOne(video.id, checked)
                        : undefined
                    }
                    isBulkDeleting={bulkDeleteMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {isAuthenticated && (
        <VideoUploadDialog
          videoCollectionId={videoCollection.id}
          videoCollectionSlug={slug}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
        />
      )}

      <VideoViewer
        video={selectedVideo}
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
      />

      <AlertDialog open={!!videoToDelete} onOpenChange={() => setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the video from
              this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Videos?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove{' '}
              {selectedVideoIds.size} video(s) from this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className='bg-destructive hover:bg-destructive/90'
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? `Deleting ${bulkDeleteProgress.current}/${bulkDeleteProgress.total}...`
                : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
