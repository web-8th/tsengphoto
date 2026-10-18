'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { addVideoToCollection } from '@/services/video-collections.service';
import { videoCollectionsQueryKeys } from '@/lib/queries/video-collections';
import { isValidYouTubeUrl } from '@/services/videos.service';

const videoSchema = z.object({
  youtube_url: z.string().min(1, 'YouTube URL is required.').refine(isValidYouTubeUrl, {
    message: 'Invalid YouTube URL.',
  }),
  title: z.string().optional(),
  description: z.string().optional(),
});

type VideoFormValues = z.infer<typeof videoSchema>;

interface VideoUploadDialogProps {
  videoCollectionId: string;
  videoCollectionSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoUploadDialog({
  videoCollectionId,
  videoCollectionSlug,
  open,
  onOpenChange,
}: VideoUploadDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      youtube_url: '',
      title: '',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: VideoFormValues) => {
      const result = await addVideoToCollection(
        videoCollectionId,
        values.youtube_url,
        values.title,
        values.description
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to add video');
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: videoCollectionsQueryKeys.all });
      await queryClient.invalidateQueries({
        queryKey: videoCollectionsQueryKeys.bySlug(videoCollectionSlug),
      });
      toast.success('Video added', {
        description: 'Video has been added to the collection successfully.',
      });
      onOpenChange(false);
      form.reset();
      mutation.reset();
    },
    onError: (error: Error) => {
      form.setError('root', { message: error.message });
      toast.error('Failed to add video', {
        description: error.message,
      });
    },
  });

  const onSubmit = (values: VideoFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add YouTube Video</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex min-h-0 flex-1 flex-col'
          >
            <DialogBody>
              <FormField
                control={form.control}
                name='youtube_url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='https://www.youtube.com/watch?v=...'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Custom video title' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='Brief description about this video'
                        rows={3}
                        className='max-h-50'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className='text-sm text-destructive'>
                  {form.formState.errors.root.message}
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={mutation.isPending || mutation.isSuccess}>
                {mutation.isPending || mutation.isSuccess ? (
                  <>
                    <Spinner />
                    Adding...
                  </>
                ) : (
                  'Add Video'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
