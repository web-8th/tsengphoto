'use client';

import { Button } from '@/components/animate-ui/components/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Text } from '@/components/Text';
import { Progress } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUploadThing } from '@/utils/uploadthing/uploadthing';
import { useMutation } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import {
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

interface CoverImageUploaderProps {
  value?: string; // Current image URL (backward compatible)
  uploadId?: string; // Current upload ID
  onChange?: (data: { url: string; uploadId?: string }) => void; // Callback with URL and upload ID
  onRemove?: () => void; // Callback when image is removed
  onUploadingChange?: (isUploading: boolean) => void; // Callback when upload state changes
  className?: string;
  mode?: 'add' | 'edit'; // Mode determines deletion behavior
  collectionId?: string; // Required in edit mode for immediate DB update
  entityType?: 'collection' | 'video-collection'; // Type of entity for correct API endpoint
}

type FileStatus = 'compressing' | 'pending' | 'uploading' | 'success' | 'error';

interface FileWithStatus {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  originalSize?: number; // Track original file size before compression
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function CoverImageUploader({
  value,
  uploadId,
  onChange,
  onRemove,
  onUploadingChange,
  className,
  mode = 'add',
  collectionId,
  entityType = 'collection',
}: CoverImageUploaderProps) {
  const [fileState, setFileState] = useState<FileWithStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const { startUpload } = useUploadThing('imageUploader', {
    onUploadProgress: (progress) => {
      setFileState((prev) => (prev ? { ...prev, progress } : null));
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const originalFile = acceptedFiles[0];

        // Set compressing status and store original size
        setFileState({
          file: originalFile,
          status: 'compressing',
          progress: 0,
          originalSize: originalFile.size,
        });
        setIsUploading(true);
        onUploadingChange?.(true);

        try {
          // Measure actual dimensions first
          const dimensions = await getImageDimensions(originalFile);

          // Only downscale if wider than 1920px (overkill for a cover)
          const maxWidth = Math.min(dimensions.width, 1920);

          const compressedFile = await imageCompression(originalFile, {
            maxWidthOrHeight: maxWidth,
            fileType: 'image/webp',
            initialQuality: 1, // resizing does the heavy lifting, we can leave it at 1.
            useWebWorker: true,
          });

          // Rename to .webp extension
          const baseName = originalFile.name.replace(/\.[^.]+$/, '');
          const file = new File([compressedFile], `${baseName}.webp`, {
            type: 'image/webp',
          });

          // Update to uploading status and preserve original size
          setFileState((prev) => ({
            file,
            status: 'uploading',
            progress: 0,
            originalSize: prev?.originalSize,
          }));

          const result = await startUpload([file]);
          if (result && result[0]?.ufsUrl) {
            const serverData = result[0].serverData as
              | { uploadId?: string; dbError?: string; error?: string; success?: boolean }
              | undefined;

            // Check if the server-side callback failed
            if (serverData?.dbError || serverData?.error) {
              throw new Error(
                serverData.dbError || serverData.error || 'Failed to save upload record'
              );
            }

            // Check if we got an uploadId back (confirms DB record was created)
            if (!serverData?.uploadId) {
              throw new Error('Upload completed but failed to create database record');
            }

            setFileState((prev) =>
              prev ? { ...prev, status: 'success', progress: 100 } : null
            );

            onChange?.({
              url: result[0].ufsUrl,
              uploadId: serverData.uploadId,
            });
            toast.success('Cover image uploaded successfully');

            // Keep file state to show compression info
            setIsUploading(false);
            onUploadingChange?.(false);
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          setFileState((prev) =>
            prev ? { ...prev, status: 'error', error: errorMessage } : null
          );
          toast.error(errorMessage);
          setIsUploading(false);
          onUploadingChange?.(false);
        }
      }
    },
    [startUpload, onChange, onUploadingChange, toast]
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      fileRejections.forEach((rejection) => {
        const { file, errors } = rejection;

        errors.forEach((error) => {
          if (error.code === 'file-invalid-type') {
            toast.error(
              `"${file.name}" is not a supported image format. Please use PNG, JPG, JPEG, GIF, or WEBP.`
            );
          } else if (error.code === 'file-too-large') {
            toast.error(`"${file.name}" is too large. Maximum file size is 16MB.`);
          } else {
            toast.error(`Error with "${file.name}": ${error.message}`);
          }
        });
      });
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 16 * 1024 * 1024, // 16MB
    disabled: isUploading || !!value, // Disable if already has image
  });

  // TanStack Query mutation for deleting cover image
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // In edit mode, use the cover-image endpoint for immediate DB update
      if (mode === 'edit' && collectionId) {
        const endpoint =
          entityType === 'video-collection'
            ? '/api/v1/video-collections/cover-image'
            : '/api/v1/collections/cover-image';
        const bodyKey =
          entityType === 'video-collection' ? 'videoCollectionId' : 'collectionId';

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            [bodyKey]: collectionId,
            uploadId,
            fileUrl: value,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove cover image');
        }
      }
      // In add mode, just delete the upload without updating collection
      else if (uploadId && value) {
        const response = await fetch('/api/v1/uploads', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadId: uploadId,
            fileUrl: value,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete image from storage');
        }
      }
    },
    onSuccess: () => {
      toast.success('Cover image removed successfully');
      setFileState(null);
      onRemove?.();
    },
    onError: () => {
      toast.error('Something went wrong while removing the image');
    },
  });

  // If there's already an uploaded image (value), show it
  if (value) {
    return (
      <div className={cn('space-y-2', className)}>
        <Text variant='bd-sm' className='font-medium'>
          Cover Image
        </Text>
        <div
          className='relative w-full aspect-video rounded-lg overflow-hidden border group'
        >
          <OptimizedImage
            src={value}
            alt='Cover image'
            fill
            className='object-cover object-[center_20%]'
            sizes='(max-width: 768px) 100vw, 600px'
          />
          <div
            className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
              transition-opacity flex items-center justify-center'
          >
            <Button
              variant='destructive'
              size='icon'
              onClick={() => deleteMutation.mutate()}
              type='button'
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className='animate-spin' />
              ) : (
                <Trash2 />
              )}
            </Button>
          </div>
        </div>

        {/* Show compression info if available */}
        {fileState && fileState.status === 'success' && fileState.originalSize && (
          <div className='border rounded p-3 bg-muted/30'>
            <div className='flex items-center gap-3'>
              <div className='rounded bg-primary/10 p-2 text-primary'>
                <ImageIcon className='size-4' />
              </div>
              <div className='flex-1 min-w-0'>
                <Text variant='bd-sm' className='font-medium truncate'>
                  {fileState.file.name}
                </Text>
                <div className='flex items-center gap-1.5'>
                  <Text variant='caption'>
                    {(fileState.originalSize / 1024 / 1024).toFixed(2)} MB
                  </Text>
                  <ArrowRight className='size-3 text-muted-foreground' />
                  <Text variant='caption' className='text-green-600 dark:text-green-400'>
                    {(fileState.file.size / 1024 / 1024).toFixed(2)} MB (compressed)
                  </Text>
                </div>
              </div>
              <CheckCircle2 className='size-5 text-green-500 shrink-0' />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Text variant='bd-sm' className='font-medium'>
        Cover Image (optional)
      </Text>

      {/* Dropzone */}
      {!fileState && (
        <div
          {...getRootProps()}
          className={cn(
            `border-2 border-dashed rounded p-6 text-center cursor-pointer
            transition-colors`,
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <div className='flex flex-col items-center gap-2'>
            <div className='rounded-full bg-primary/10 p-3 text-primary'>
              <Upload className='size-6' />
            </div>
            {isDragActive ? (
              <Text variant='bd-sm' className='font-medium'>
                Drop the image here...
              </Text>
            ) : (
              <>
                <Text variant='bd-sm' className='font-medium'>
                  Drag & drop an image, or click to select
                </Text>
                <Text variant='caption'>PNG, JPG, JPEG, GIF, WEBP up to 16MB</Text>
              </>
            )}
          </div>
        </div>
      )}

      {/* File Preview & Upload */}
      {fileState && (
        <div className='border rounded p-4 space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='rounded bg-primary/10 p-2 text-primary'>
              <ImageIcon />
            </div>
            <div className='flex-1 min-w-0'>
              <Text variant='bd-sm' className='font-medium truncate'>
                {fileState.file.name}
              </Text>
              {fileState.originalSize && fileState.status !== 'compressing' ? (
                <div className='flex items-center gap-1.5'>
                  <Text variant='caption'>
                    {(fileState.originalSize / 1024 / 1024).toFixed(2)} MB
                  </Text>
                  <ArrowRight className='size-3 text-muted-foreground' />
                  <Text variant='caption' className='text-green-600 dark:text-green-400'>
                    {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </div>
              ) : (
                <Text variant='caption'>
                  {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                  {fileState.error && (
                    <Text variant='caption' className='text-destructive ml-2'>
                      Error: {fileState.error}
                    </Text>
                  )}
                </Text>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {fileState.status === 'compressing' && (
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <Text variant='caption'>Compressing...</Text>
              </div>
              <Progress value={undefined} className='animate-pulse' />
            </div>
          )}
          {fileState.status === 'uploading' && (
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <Text variant='caption'>Uploading...</Text>
                <Text variant='caption'>{fileState.progress}%</Text>
              </div>
              <Progress value={fileState.progress} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
