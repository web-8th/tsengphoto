'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Skeleton,
  Spinner,
} from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Download, ImageOff, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useToast } from '@/hooks/use-toast';
import type { Upload } from '@/lib/types';
import * as UploadService from '@/services/uploads.service';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const queryKeys = {
  uploads: ['uploads'] as const,
};

interface UploadsGalleryProps {
  title?: string;
  description?: string;
  onUploadDeleted?: () => void;
}

export function UploadsGallery({
  title = 'Your Uploads',
  description,
  onUploadDeleted,
}: UploadsGalleryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: uploads = [], isLoading } = useQuery<Upload[]>({
    queryKey: queryKeys.uploads,
    queryFn: async () => {
      const response = await fetch('/api/v1/uploads');
      if (!response.ok) {
        throw new Error('Failed to load uploads');
      }
      const result = await response.json();
      return result.data || [];
    },
  });

  const handleDownload = async (fileUrl: string, fileName: string) => {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl: string }) => {
      setDeletingId(id);
      const result = await UploadService.deleteUpload(id, fileUrl);
      if (!result.success) {
        throw new Error(result.error || 'Something went wrong.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads });
      toast.success('Upload deleted successfully');
      onUploadDeleted?.();
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeletingId(null);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(uploads.map((upload) => upload.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (selectedUploads: Upload[]) => {
      const totalCount = selectedUploads.length;
      let deletedCount = 0;

      setDeletionProgress({ current: 0, total: totalCount });

      for (let i = 0; i < selectedUploads.length; i++) {
        const upload = selectedUploads[i];
        setDeletionProgress({ current: i + 1, total: totalCount });

        const result = await UploadService.deleteUpload(upload.id, upload.file_url);

        if (result.success) {
          deletedCount++;
        } else {
          toast.error(`Failed to delete ${upload.file_name}: ${result.error}`);
        }
      }

      if (deletedCount === 0) {
        throw new Error('Failed to delete any images');
      }

      return deletedCount;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads });
      toast.success(
        `Successfully deleted ${deletedCount} image${deletedCount !== 1 ? 's' : ''}`
      );
      onUploadDeleted?.();
      setSelectedIds(new Set());
      setDeletionProgress({ current: 0, total: 0 });
    },
    onError: () => {
      setSelectedIds(new Set());
      setDeletionProgress({ current: 0, total: 0 });
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selectedUploads = uploads.filter((upload) => selectedIds.has(upload.id));
    bulkDeleteMutation.mutate(selectedUploads);
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-2'>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className='h-4 w-32' />
            ) : (
              description ||
              `${uploads.length} image${uploads.length !== 1 ? 's' : ''} uploaded`
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {uploads.length > 0 && !isLoading && (
          <div className='flex items-center justify-between w-full gap-2 mb-2'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <Checkbox
                checked={selectedIds.size === uploads.length && uploads.length > 0}
                onCheckedChange={handleSelectAll}
                disabled={bulkDeleteMutation.isPending}
              />
              <Text variant='bd-sm'>Select All</Text>
            </label>
            {selectedIds.size > 0 && (
              <Button
                variant='destructive'
                size='sm'
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? (
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
        )}
        {isLoading ? (
          <div className='text-center py-8'>
            <Spinner className='size-8 mx-auto' />
          </div>
        ) : uploads.length === 0 ? (
          <EmptyState
            bordered={true}
            icon={ImageOff}
            title='No uploads yet'
            description='Upload your first image to get started!'
          />
        ) : (
          <ScrollArea className='h-150 pr-4'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className='border rounded-lg overflow-hidden hover:shadow-lg
                    transition-shadow relative'
                >
                  <div className='absolute top-2 left-2 z-10'>
                    <Checkbox
                      checked={selectedIds.has(upload.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(upload.id, checked as boolean)
                      }
                      disabled={bulkDeleteMutation.isPending}
                      className='bg-background/80 backdrop-blur-sm'
                    />
                  </div>
                  <div className='absolute top-2 right-2 z-10'>
                    <Button
                      variant='destructive'
                      size='icon'
                      onClick={() =>
                        deleteMutation.mutate({ id: upload.id, fileUrl: upload.file_url })
                      }
                      disabled={deletingId === upload.id || bulkDeleteMutation.isPending}
                    >
                      {deletingId === upload.id ? (
                        <>
                          <Spinner />
                        </>
                      ) : (
                        <>
                          <Trash2 />
                        </>
                      )}
                    </Button>
                  </div>
                  <div className='relative aspect-video bg-muted'>
                    <Link
                      href={upload.file_url}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <OptimizedImage
                        src={upload.file_url}
                        alt={upload.file_name}
                        fill
                        // Admin-only preview: don't spend Vercel transformations
                        unoptimized
                        className='object-cover'
                        showLoading={true}
                      />
                    </Link>
                  </div>
                  <div className='p-3 space-y-2'>
                    <Link
                      href={upload.file_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='hover:underline hover:text-primary transition-colors
                        block'
                    >
                      <Text variant='bd-sm' className='font-medium truncate'>
                        {upload.file_name}
                      </Text>
                      <Text variant='caption'>
                        {(upload.file_size / 1024 / 1024).toFixed(1)} MB
                      </Text>
                    </Link>
                    <div className='flex items-center justify-between'>
                      <Text variant='caption'>
                        {format(new Date(upload.created_at), 'MMM d, yyyy')}
                      </Text>
                      <Button
                        variant='secondary'
                        size='icon'
                        onClick={() => handleDownload(upload.file_url, upload.file_name)}
                      >
                        <Download />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
