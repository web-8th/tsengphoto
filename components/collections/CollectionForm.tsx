'use client';

import { Checkbox } from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CoverImageUploader } from '@/components/CoverImageUploader';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Check, Info, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { collectionGroupsQueryKeys } from '@/lib/queries/collection-groups';
import { collectionsQueryKeys } from '@/lib/queries/collections';
import type { Collection, CollectionGroup } from '@/lib/types';
import { Text } from '../Text';
import { DialogDescription, Tooltip, TooltipContent, TooltipTrigger } from '../ui';

const COLLECTION_TYPES = ['event', 'series'] as const;

const collectionSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only.'),
  type: z.enum(COLLECTION_TYPES, { message: 'Type is required.' }),
  collection_group_id: z.string().uuid().optional().or(z.literal('')),
  date: z.date().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  cover_image_url: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  cover_image_id: z.string().uuid().optional().or(z.literal('')),
  drive_link: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  is_published: z.boolean(),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

interface CollectionFormProps {
  mode: 'add' | 'edit';
  collection?: Collection;
  groups?: CollectionGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedSlug?: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  defaultType?: 'event' | 'series';
}

export function CollectionForm({
  mode,
  collection,
  groups = [],
  open,
  onOpenChange,
  onSuccess,
  onDeleteGroup,
  defaultType = 'event',
}: CollectionFormProps) {
  const queryClient = useQueryClient();
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  // Track original and pending cover images for cleanup (Layer 2)
  const originalCoverImageIdRef = useRef<string | null>(null);
  const pendingCoverImageIdRef = useRef<string | null>(null);

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: collection
      ? {
          title: collection.title,
          slug: collection.slug,
          type: collection.type as (typeof COLLECTION_TYPES)[number],
          collection_group_id: collection.collection_group_id || '',
          date: collection.date ? new Date(collection.date) : undefined,
          location: collection.location || '',
          description: collection.description || '',
          cover_image_url: collection.cover_image_url || '',
          cover_image_id: collection.cover_image_id || '',
          drive_link: collection.drive_link || '',
          is_published: collection.is_published,
        }
      : {
          title: '',
          slug: '',
          type: defaultType,
          collection_group_id: '',
          date: undefined,
          location: '',
          description: '',
          cover_image_url: '',
          cover_image_id: '',
          drive_link: '',
          is_published: false,
        },
  });

  // Watch cover_image_id at component level
  const coverImageId = useWatch({
    control: form.control,
    name: 'cover_image_id',
  });

  // Watch date to ensure button text updates
  const dateValue = useWatch({
    control: form.control,
    name: 'date',
  });

  // Watch collection_group_id to display selected group
  const selectedGroupId = useWatch({
    control: form.control,
    name: 'collection_group_id',
  });

  const mutation = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      const payload = {
        ...values,
        date: values.date ? values.date.toISOString() : null,
        location: values.location || null,
        description: values.description || null,
        cover_image_url: values.cover_image_url || null,
        cover_image_id: values.cover_image_id || null,
        drive_link: values.drive_link || null,
        collection_group_id: values.collection_group_id || null,
      };

      if (mode === 'add') {
        const response = await fetch('/api/v1/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create collection');
        }

        const result = await response.json();
        return { slug: result.data?.slug || values.slug };
      } else {
        const response = await fetch('/api/v1/collections', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: collection!.id, ...payload }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update collection');
        }

        const result = await response.json();
        return { slug: result.data?.slug || values.slug };
      }
    },
    onSuccess: async (data: { slug: string }) => {
      await queryClient.invalidateQueries({ queryKey: collectionsQueryKeys.all });
      await queryClient.refetchQueries({ queryKey: collectionsQueryKeys.all });
      toast.success(mode === 'add' ? 'Collection created' : 'Collection updated', {
        description: `Collection has been ${mode === 'add' ? 'created' : 'updated'} successfully.`,
      });
      onOpenChange(false);
      form.reset();
      mutation.reset();

      // Call onSuccess callback with the slug (for potential redirect)
      onSuccess?.(data.slug);
    },
    onError: (error: Error) => {
      form.setError('root', { message: error.message });
      toast.error(
        mode === 'add' ? 'Failed to create collection' : 'Failed to update collection',
        {
          description: error.message,
        }
      );
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/v1/collection-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create group');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionGroupsQueryKeys.all });
      toast.success('Group created successfully');
      setAddGroupDialogOpen(false);
      setNewGroupName('');
    },
    onError: (error: Error) => {
      toast.error('Failed to create group', { description: error.message });
    },
  });

  // Reset form when dialog opens or collection changes
  useEffect(() => {
    if (open) {
      const isEditMode = mode === 'edit' && collection;
      const coverImageId = isEditMode ? collection.cover_image_id || null : null;

      const defaultValues = collection
        ? {
            title: collection.title,
            slug: collection.slug,
            type: collection.type as (typeof COLLECTION_TYPES)[number],
            collection_group_id: collection.collection_group_id || '',
            date: collection.date ? new Date(collection.date) : undefined,
            location: collection.location || '',
            description: collection.description || '',
            cover_image_url: collection.cover_image_url || '',
            cover_image_id: collection.cover_image_id || '',
            drive_link: collection.drive_link || '',
            is_published: collection.is_published,
          }
        : {
            title: '',
            slug: '',
            type: defaultType,
            collection_group_id: '',
            date: undefined,
            location: '',
            description: '',
            cover_image_url: '',
            cover_image_id: '',
            drive_link: '',
            is_published: false,
          };
      form.reset(defaultValues);

      // Store original cover image ID for cleanup tracking (Layer 2)
      originalCoverImageIdRef.current = coverImageId;
      pendingCoverImageIdRef.current = coverImageId;
    }
  }, [open, collection, defaultType, form, mode]);

  // Auto-generate slug from title
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

  const onSubmit = (values: CollectionFormValues) => {
    mutation.mutate(values);
  };

  const handleAddGroup = () => {
    setGroupPopoverOpen(false);
    setAddGroupDialogOpen(true);
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName);
    }
  };

  const handleOpenChange = async (newOpen: boolean) => {
    // Prevent closing dialog while cover image is uploading
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add Collection' : 'Edit Collection'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex min-h-0 flex-1 flex-col'
          >
            <DialogBody>
              {/* Title */}
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
                        placeholder='A memorable event title'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name='slug'
                render={({ field }) => (
                  <FormItem className='flex-1'>
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

              {/* Type & Group */}
              <div className='flex flex-col sm:flex-row w-full gap-4'>
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <FormLabel>Type</FormLabel>
                      <Select
                        items={[
                          { value: 'event', label: 'Event' },
                          { value: 'series', label: 'Series' },
                        ]}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='event'>Event</SelectItem>
                          <SelectItem value='series'>Series</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='collection_group_id'
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <FormLabel>
                        Group (optional){' '}
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className='size-4 text-muted-foreground' />
                          </TooltipTrigger>
                          <TooltipContent>
                            Group collections together for better organization
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
                        <FormControl>
                          <PopoverTrigger
                            render={
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'w-full justify-between',
                                  !selectedGroupId && 'text-muted-foreground'
                                )}
                              />
                            }
                          >
                            {selectedGroupId
                              ? groups.find((g) => g.id === selectedGroupId)?.name
                              : 'No group'}
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent
                          className='p-0'
                          align='start'
                          style={{ width: 'var(--radix-popover-trigger-width)' }}
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <Command>
                            <CommandInput
                              placeholder='Search group...'
                              value={groupSearchQuery}
                              onValueChange={setGroupSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No group found.</CommandEmpty>

                              {/* Add Group Action */}
                              <CommandGroup>
                                <CommandItem onSelect={handleAddGroup}>
                                  <Plus className='mr-2 h-4 w-4' />
                                  Add Group
                                </CommandItem>
                              </CommandGroup>

                              <CommandSeparator />

                              {/* No Group Option */}
                              <CommandGroup>
                                <CommandItem
                                  value='no-grouping'
                                  onSelect={() => {
                                    field.onChange('');
                                    setGroupPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      !selectedGroupId ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  No Group
                                </CommandItem>
                              </CommandGroup>

                              <CommandSeparator />

                              {/* Grouping List */}
                              <CommandGroup heading='Groups'>
                                {groups.map((group) => (
                                  <CommandItem
                                    key={group.id}
                                    value={group.name}
                                    onSelect={() => {
                                      field.onChange(group.id);
                                      setGroupPopoverOpen(false);
                                    }}
                                    className='flex items-center justify-between'
                                  >
                                    <div className='flex items-center flex-1'>
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          selectedGroupId === group.id
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      <span>{group.name}</span>
                                    </div>
                                    <Button
                                      type='button'
                                      variant='destructive'
                                      size='icon'
                                      className='h-6 w-6 ml-2'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteGroup?.(group.id);
                                      }}
                                    >
                                      <Trash2 className='size-3' />
                                    </Button>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date */}
              <FormField
                control={form.control}
                name='date'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Date (optional)</FormLabel>
                    <div className='flex gap-2 w-full'>
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                        <FormControl>
                          <PopoverTrigger
                            className='flex-1'
                            render={
                              <Button
                                variant='outline'
                                className={cn(
                                  'w-full',
                                  !dateValue && 'text-muted-foreground'
                                )}
                              />
                            }
                          >
                            {dateValue ? format(dateValue, 'PPP') : 'Pick a date'}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </PopoverTrigger>
                        </FormControl>
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

              {/* Location */}
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

              {/* Description */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='A memorable event description...'
                        rows={3}
                        className='max-h-50'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Google Drive Link */}
              <FormField
                control={form.control}
                name='drive_link'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Google Drive Folder (optional)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className='size-4 text-muted-foreground' />
                        </TooltipTrigger>
                        <TooltipContent>
                          Link to a Google Drive folder to display additional images
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='https://drive.google.com/drive/folders/...'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cover Image */}
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
                        collectionId={collection?.id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Published */}
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
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>Published</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Root Error */}
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
                ) : isCoverImageUploading ? (
                  <>
                    <Spinner />
                    Uploading cover...
                  </>
                ) : mode === 'add' ? (
                  'Create'
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Add Group Dialog */}
      <Dialog open={addGroupDialogOpen} onOpenChange={setAddGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your collections. For example, you could
              create a group for a club, or a collection series you took in Japan.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Input
              placeholder='Enter group name'
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGroupName.trim()) {
                  handleCreateGroup();
                }
              }}
            />
            <Text variant='caption' className='mt-1 text-destructive'>
              {createGroupMutation.error?.message}
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setAddGroupDialogOpen(false)}
              disabled={createGroupMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? (
                <>
                  <Spinner /> Adding...
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
