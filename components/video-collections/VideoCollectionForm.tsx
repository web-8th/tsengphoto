'use client';

import { Checkbox, CheckboxIndicator } from '@/components/animate-ui/components';
import { Button } from '@/components/animate-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/animate-ui/components/dialog';
import { CoverImageUploader } from '@/components/CoverImageUploader';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { videoCollectionsQueryKeys } from '@/lib/queries/video-collections';
import type { VideoCollection } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui';

const videoCollectionSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only.'),
  date: z.date().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  cover_image_url: z.url('Must be a valid URL.').optional().or(z.literal('')),
  cover_image_id: z.string().uuid().optional().or(z.literal('')),
  is_published: z.boolean(),
});

type VideoCollectionFormValues = z.infer<typeof videoCollectionSchema>;

interface VideoCollectionFormProps {
  mode: 'add' | 'edit';
  videoCollection?: VideoCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedSlug?: string) => void;
}

export function VideoCollectionForm({
  mode,
  videoCollection,
  open,
  onOpenChange,
  onSuccess,
}: VideoCollectionFormProps) {
  const queryClient = useQueryClient();
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  // Track original and pending cover images for cleanup (Layer 2)
  const originalCoverImageIdRef = useRef<string | null>(null);
  const pendingCoverImageIdRef = useRef<string | null>(null);

  const form = useForm<VideoCollectionFormValues>({
    resolver: zodResolver(videoCollectionSchema),
    defaultValues: videoCollection
      ? {
          title: videoCollection.title,
          slug: videoCollection.slug,
          date: videoCollection.date ? new Date(videoCollection.date) : undefined,
          location: videoCollection.location || '',
          description: videoCollection.description || '',
          cover_image_url: videoCollection.cover_image_url || '',
          cover_image_id: videoCollection.cover_image_id || '',
          is_published: videoCollection.is_published,
        }
      : {
          title: '',
          slug: '',
          date: undefined,
          location: '',
          description: '',
          cover_image_url: '',
          cover_image_id: '',
          is_published: false,
        },
  });

  const coverImageId = useWatch({
    control: form.control,
    name: 'cover_image_id',
  });

  // Watch date to ensure button text updates
  const dateValue = useWatch({
    control: form.control,
    name: 'date',
  });

  const mutation = useMutation({
    mutationFn: async (values: VideoCollectionFormValues) => {
      const payload = {
        ...values,
        date: values.date ? values.date.toISOString() : null,
        location: values.location || null,
        description: values.description || null,
        cover_image_url: values.cover_image_url || null,
        cover_image_id: values.cover_image_id || null,
      };

      if (mode === 'add') {
        const response = await fetch('/api/v1/video-collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create video collection');
        }

        const result = await response.json();
        return { slug: result.data?.slug || values.slug };
      } else {
        const response = await fetch('/api/v1/video-collections', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: videoCollection!.id, ...payload }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update video collection');
        }

        const result = await response.json();
        return { slug: result.data?.slug || values.slug };
      }
    },
    onSuccess: async (data: { slug: string }) => {
      await queryClient.invalidateQueries({ queryKey: videoCollectionsQueryKeys.all });
      await queryClient.refetchQueries({ queryKey: videoCollectionsQueryKeys.all });
      toast.success(
        mode === 'add' ? 'Video collection created' : 'Video collection updated',
        {
          description: `Video collection has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
        }
      );
      onOpenChange(false);
      form.reset();
      mutation.reset();

      onSuccess?.(data.slug);
    },
    onError: (error: Error) => {
      form.setError('root', { message: error.message });
      toast.error(
        mode === 'add'
          ? 'Failed to create video collection'
          : 'Failed to update video collection',
        {
          description: error.message,
        }
      );
    },
  });

  useEffect(() => {
    if (open) {
      const isEditMode = mode === 'edit' && videoCollection;
      const coverImageId = isEditMode ? videoCollection.cover_image_id || null : null;

      const defaultValues = videoCollection
        ? {
            title: videoCollection.title,
            slug: videoCollection.slug,
            date: videoCollection.date ? new Date(videoCollection.date) : undefined,
            location: videoCollection.location || '',
            description: videoCollection.description || '',
            cover_image_url: videoCollection.cover_image_url || '',
            cover_image_id: videoCollection.cover_image_id || '',
            is_published: videoCollection.is_published,
          }
        : {
            title: '',
            slug: '',
            date: undefined,
            location: '',
            description: '',
            cover_image_url: '',
            cover_image_id: '',
            is_published: false,
          };
      form.reset(defaultValues);

      // Store original cover image ID for cleanup tracking (Layer 2)
      originalCoverImageIdRef.current = coverImageId;
      pendingCoverImageIdRef.current = coverImageId;
    }
  }, [open, videoCollection, form, mode]);

  const handleTitleChange = (value: string) => {
    if (mode === 'add') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      form.setValue('slug', slug);
    }
  };

  const onSubmit = (values: VideoCollectionFormValues) => {
    mutation.mutate(values);
  };

  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && isCoverImageUploading) {
      toast.error('Please wait for the cover image to finish uploading');
      return;
    }

    // Layer 2: Cleanup pending uploads if user cancels without saving
    if (
      !newOpen &&
      pendingCoverImageIdRef.current &&
      pendingCoverImageIdRef.current !== originalCoverImageIdRef.current
    ) {
      const pendingUrl = form.getValues('cover_image_url');
      if (pendingUrl) {
        try {
          await fetch('/api/v1/uploads', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uploadId: pendingCoverImageIdRef.current,
              fileUrl: pendingUrl,
            }),
          });
        } catch {
          // Silently fail - don't interrupt dialog close
        }
      }
    }

    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[70vh] sm:max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add Video Collection' : 'Edit Video Collection'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleTitleChange(e.target.value);
                      }}
                      placeholder='A memorable collection title'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Slug
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className='size-4 text-muted-foreground' />
                      </TooltipTrigger>
                      <TooltipContent>
                        A URL-friendly version of the collection title. It should be
                        lowercase, with words separated by hyphens.
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='user-friendly-readable-slug' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='date'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Date (optional)</FormLabel>
                  <div className='flex gap-2'>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild className='flex-1'>
                        <FormControl>
                          <Button
                            variant='outline'
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !dateValue && 'text-muted-foreground'
                            )}
                          >
                            {dateValue ? format(dateValue, 'PPP') : 'Pick a date'}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value ?? undefined}
                          onSelect={(date) => {
                            field.onChange(date ?? undefined);
                            setDatePopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {dateValue && (
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        onClick={() => {
                          field.onChange(undefined);
                          setDatePopoverOpen(false);
                        }}
                      >
                        <X className='size-5' />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='location'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Kelowna, BC' />
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
                      placeholder='A memorable collection description...'
                      rows={3}
                      className='max-h-50'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='cover_image_url'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CoverImageUploader
                      value={field.value}
                      uploadId={coverImageId}
                      onChange={(data) => {
                        form.setValue('cover_image_url', data.url);
                        if (data.uploadId) {
                          form.setValue('cover_image_id', data.uploadId);
                          pendingCoverImageIdRef.current = data.uploadId; // Track for cleanup
                        }
                      }}
                      onRemove={() => {
                        form.setValue('cover_image_url', '');
                        form.setValue('cover_image_id', '');
                        pendingCoverImageIdRef.current = null; // Clear pending tracking
                      }}
                      onUploadingChange={setIsCoverImageUploading}
                      mode={mode}
                      collectionId={videoCollection?.id}
                      entityType='video-collection'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='is_published'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className='rounded'
                    >
                      <CheckboxIndicator />
                    </Checkbox>
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Published</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className='text-sm text-destructive'>
                {form.formState.errors.root.message}
              </div>
            )}

            <div className='flex gap-2 justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending || isCoverImageUploading}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={
                  mutation.isPending || mutation.isSuccess || isCoverImageUploading
                }
              >
                {mutation.isPending || mutation.isSuccess ? (
                  <>
                    <Spinner />
                    {mode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : mode === 'add' ? (
                  'Create'
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
