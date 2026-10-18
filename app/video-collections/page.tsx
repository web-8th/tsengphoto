'use client';

import { useState } from 'react';
import { VideoCollectionGrid } from '@/components/video-collections/VideoCollectionGrid';
import { VideoCollectionForm } from '@/components/video-collections/VideoCollectionForm';
import { Text } from '@/components/Text';
import { getDelayClass } from '@/utils/animations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { videoCollectionsQueryKeys } from '@/lib/queries/video-collections';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { VideoCollectionWithVideos } from '@/lib/types';
import { PageLoader } from '@/components/PageLoader';
import { Separator } from '@/components/ui';

export default function VideoCollectionsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVideoCollection, setSelectedVideoCollection] =
    useState<VideoCollectionWithVideos | null>(null);
  const [videoCollectionToDelete, setVideoCollectionToDelete] = useState<string | null>(
    null
  );

  const { data: videoCollections = [], isLoading } = useQuery<
    VideoCollectionWithVideos[]
  >({
    queryKey: [
      ...videoCollectionsQueryKeys.list(),
      { includeUnpublished: isAuthenticated },
    ],
    queryFn: async () => {
      const response = await fetch('/api/v1/video-collections');
      if (!response.ok) {
        throw new Error('Failed to fetch video collections');
      }
      const result = await response.json();
      return result.data || [];
    },
    // Wait for auth so we don't fetch once as anonymous and again once the key flips
    enabled: !authLoading,
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const response = await fetch(`/api/v1/video-collections/${slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete video collection');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoCollectionsQueryKeys.all });
      toast.success('Video collection deleted', {
        description: 'Video collection has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setVideoCollectionToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete video collection', {
        description: error.message,
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (videoCollectionId: string) => {
      const videoCollection = videoCollections.find(
        (c: VideoCollectionWithVideos) => c.id === videoCollectionId
      );
      if (!videoCollection) {
        throw new Error('Video collection not found');
      }

      const response = await fetch('/api/v1/video-collections', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: videoCollectionId,
          is_published: !videoCollection.is_published,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update video collection');
      }

      return !videoCollection.is_published;
    },
    onSuccess: (newPublishedState) => {
      queryClient.invalidateQueries({ queryKey: videoCollectionsQueryKeys.all });
      toast.success(
        newPublishedState ? 'Video collection published' : 'Video collection unpublished',
        {
          description: newPublishedState
            ? 'Video collection is now visible to everyone.'
            : 'Video collection is now hidden from public view.',
        }
      );
    },
    onError: (error: Error) => {
      toast.error('Failed to update video collection', {
        description: error.message,
      });
    },
  });

  const handleEdit = (videoCollection: VideoCollectionWithVideos) => {
    setSelectedVideoCollection(videoCollection);
    setEditDialogOpen(true);
  };

  const handleDelete = (videoCollectionId: string) => {
    const collection = videoCollections.find((c) => c.id === videoCollectionId);
    if (collection) {
      setVideoCollectionToDelete(collection.slug);
      setDeleteDialogOpen(true);
    }
  };

  const handlePublish = (videoCollectionId: string) => {
    publishMutation.mutate(videoCollectionId);
  };

  const confirmDelete = () => {
    if (videoCollectionToDelete) {
      deleteMutation.mutate(videoCollectionToDelete);
    }
  };

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  return (
    <div className='pt-18'>
      <div
        className='container mx-auto border-x-2 border-dashed text-center space-y-4 py-8'
      >
        <Text variant='hd-xxl' className={`fade-in-from-bottom ${getDelayClass(0)}`}>
          Video Collections
        </Text>
        <Text
          variant='bd-lg'
          className={`text-muted-foreground max-w-2xl mx-auto fade-in-from-bottom
            ${getDelayClass(1)}`}
        >
          Explore our curated collections of videography projects. From events to creative
          series, each collection showcases professional video production and
          storytelling.
        </Text>
      </div>
      <Separator className='border' />
      <div className='container mx-auto px-4 py-4 border-dashed border-x-2'>
        {/* Add Button - Only for authenticated users */}
        {isAuthenticated && (
          <div
            className={`mb-6 flex justify-center fade-in-from-bottom ${getDelayClass(2)}`}
          >
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus />
              Add New Video Collection
            </Button>
          </div>
        )}

        <VideoCollectionGrid
          videoCollections={videoCollections}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPublish={handlePublish}
        />

        <VideoCollectionForm
          mode='add'
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
        />

        {selectedVideoCollection && (
          <VideoCollectionForm
            mode='edit'
            videoCollection={selectedVideoCollection}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the video
                collection and all its videos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className='bg-destructive hover:bg-destructive/90'
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
