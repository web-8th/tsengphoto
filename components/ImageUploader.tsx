'use client';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/Text';
import { Progress, ScrollArea } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUploadThing } from '@/utils/uploadthing/uploadthing';
import { useMutation } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

interface UploadedFile {
  url: string;
  uploadId: string;
}

interface ImageUploaderProps {
  onUploadComplete?: (uploadedFiles?: UploadedFile[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

type FileStatus = 'compressing' | 'pending' | 'uploading' | 'success' | 'error';

interface FileWithStatus {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

export function ImageUploader({
  onUploadComplete,
  onUploadError,
  className,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const currentFileIndexRef = useRef<number>(-1);
  const { toast } = useToast();

  // TanStack Query mutation for removing files
  const removeFileMutation = useMutation({
    mutationFn: async (index: number) => {
      // Simulate async operation (in case future API call is needed)
      await new Promise((resolve) => setTimeout(resolve, 100));
      return index;
    },
    onSuccess: (index) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setDeletingIndex(null);
    },
    onError: () => {
      toast.error('Failed to remove file');
      setDeletingIndex(null);
    },
  });

  const { startUpload } = useUploadThing('imageUploader', {
    onUploadProgress: (progress) => {
      const currentIdx = currentFileIndexRef.current;
      if (currentIdx >= 0) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === currentIdx ? { ...f, progress } : f))
        );
      }
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Add files with 'compressing' status immediately
      const pendingFiles: FileWithStatus[] = acceptedFiles.map((file) => ({
        file,
        status: 'compressing' as FileStatus,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...pendingFiles]);

      // Compress images
      const compressedFiles: File[] = [];
      const startIndex = files.length;

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        try {
          // Compress to WebP at 75% quality
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 16,
            fileType: 'image/webp',
            initialQuality: 0.75,
            useWebWorker: true,
          });

          // Rename to .webp extension
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const webpFile = new File([compressedFile], `${baseName}.webp`, {
            type: 'image/webp',
          });

          compressedFiles.push(webpFile);

          // Update status to pending after compression
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === startIndex + i
                ? { ...f, file: webpFile, status: 'pending' as FileStatus, progress: 0 }
                : f
            )
          );
        } catch (error) {
          console.error('Compression failed for', file.name, error);
          // If compression fails, use original file
          compressedFiles.push(file);
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === startIndex + i ? { ...f, status: 'pending' as FileStatus } : f
            )
          );
        }
      }

      // Handle duplicate names
      setFiles((prev) => {
        const existingNames = new Set(prev.slice(0, startIndex).map((f) => f.file.name));

        return prev.map((fileWithStatus, idx) => {
          if (idx < startIndex || idx >= startIndex + compressedFiles.length) {
            return fileWithStatus;
          }

          const file = fileWithStatus.file;
          let fileName = file.name;
          let counter = 1;

          // Rename if duplicate
          while (existingNames.has(fileName)) {
            const nameParts = file.name.split('.');
            const ext = nameParts.pop();
            const baseName = nameParts.join('.');
            fileName = `${baseName} (${counter}).${ext}`;
            counter++;
          }

          existingNames.add(fileName);

          // Create new file with potentially renamed name if needed
          const finalFile =
            fileName !== file.name
              ? new File([file], fileName, { type: file.type })
              : file;

          return {
            ...fileWithStatus,
            file: finalFile,
          };
        });
      });
    },
    [files.length]
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
          } else if (error.code === 'too-many-files') {
            toast.error('Too many files selected. Maximum is 100 files at a time.');
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
    maxFiles: 100,
    maxSize: 16 * 1024 * 1024, // 16MB per file
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    let hasErrors = false;
    const uploadedFiles: UploadedFile[] = [];

    // Upload files sequentially
    for (let i = 0; i < files.length; i++) {
      currentFileIndexRef.current = i;
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading' as FileStatus, progress: 0 } : f
        )
      );

      try {
        const result = await startUpload([files[i].file]);
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

          uploadedFiles.push({
            url: result[0].ufsUrl,
            uploadId: serverData.uploadId,
          });
        }
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'success' as FileStatus, progress: 100 } : f
          )
        );
      } catch (error) {
        hasErrors = true;
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error' as FileStatus, error: errorMessage } : f
          )
        );
        onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
      }
    }

    currentFileIndexRef.current = -1;

    // Only clear and call success if no errors
    if (!hasErrors) {
      onUploadComplete?.(uploadedFiles);
      // Brief delay to show success state, then clear
      setTimeout(() => {
        setFiles([]);
        setIsUploading(false);
      }, 500);
    } else {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setDeletingIndex(index);
    removeFileMutation.mutate(index);
  };

  const removeAllFiles = () => {
    setFiles([]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          `border-2 border-dashed rounded p-8 text-center cursor-pointer
          transition-colors`,
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <div className='flex flex-col items-center gap-2'>
          <div className='rounded-full bg-primary/10 p-4 text-primary'>
            <Upload className='size-8' />
          </div>
          {isDragActive ? (
            <Text variant='bd-sm' className='font-medium'>
              Drop the images here...
            </Text>
          ) : (
            <>
              <Text variant='bd-sm' className='font-medium'>
                Drag & drop images here, or click to select
              </Text>
              <Text variant='caption'>PNG, JPG, JPEG, GIF, WEBP up to 16MB per file</Text>
            </>
          )}
        </div>
      </div>

      {/* Selected Files Preview */}
      {files.length > 0 && (
        <div className='border rounded p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <Text variant='bd-sm' className='font-medium'>
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </Text>
            {!isUploading && (
              <Button variant='ghost' size='sm' onClick={removeAllFiles}>
                Clear all
              </Button>
            )}
          </div>

          {/* File List */}
          <ScrollArea className='h-80'>
            <div className='space-y-3 pr-4'>
              {files.map((fileWithStatus, index) => (
                <div key={`${fileWithStatus.file.name}-${index}`} className='space-y-2'>
                  <div className='flex flex-col bg-muted/50 border rounded'>
                    {/* File Info */}
                    <div className='flex items-center gap-3 p-2 rounded'>
                      <div className='rounded bg-primary/10 p-2 text-primary'>
                        <ImageIcon />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <Text variant='bd-sm' className='font-medium truncate'>
                          {fileWithStatus.file.name}
                        </Text>
                        <Text variant='caption'>
                          {(fileWithStatus.file.size / 1024 / 1024).toFixed(2)} MB
                          {fileWithStatus.error && (
                            <Text variant='caption' className='text-destructive ml-2'>
                              Error: {fileWithStatus.error}
                            </Text>
                          )}
                        </Text>
                      </div>

                      {/* Status Icon */}
                      {fileWithStatus.status === 'success' && (
                        <CheckCircle2 className='size-5 text-green-500 shrink-0' />
                      )}
                      {fileWithStatus.status === 'error' && (
                        <XCircle className='size-5 text-destructive shrink-0' />
                      )}
                      {!isUploading && fileWithStatus.status === 'pending' && (
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => removeFile(index)}
                          className='shrink-0 size-8'
                          disabled={deletingIndex === index}
                        >
                          {deletingIndex === index ? (
                            <Loader2 className='size-4 animate-spin' />
                          ) : (
                            <X className='size-4' />
                          )}
                        </Button>
                      )}
                    </div>
                    {/* Per-file Progress Bar */}
                    {fileWithStatus.status === 'compressing' && (
                      <div className='space-y-1 px-2 pb-2'>
                        <div className='flex items-center justify-between'>
                          <Text variant='caption'>Compressing...</Text>
                        </div>
                        <Progress value={null} className='animate-pulse' />
                      </div>
                    )}
                    {fileWithStatus.status === 'uploading' && (
                      <div className='space-y-1 px-2 pb-2'>
                        <div className='flex items-center justify-between'>
                          <Text variant='caption'>Uploading...</Text>
                          <Text variant='caption'>{fileWithStatus.progress}%</Text>
                        </div>
                        <Progress value={fileWithStatus.progress} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Upload Button or Summary */}
          {!isUploading ? (
            <Button
              onClick={handleUpload}
              className='w-full'
              disabled={files.length === 0}
            >
              <Upload />
              Upload {files.length} Image{files.length !== 1 ? 's' : ''}
            </Button>
          ) : (
            <Text variant='bd-sm' className='text-center text-muted-foreground'>
              Uploading {files.filter((f) => f.status === 'success').length} of{' '}
              {files.length} files...
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
