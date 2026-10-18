'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageUploader } from '@/components/ImageUploader';
import { useToast } from '@/hooks/use-toast';
import { collectionsQueryKeys } from '@/lib/queries/collections';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CollectionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionSlug: string;
}

export function CollectionUploadDialog({
  open,
  onOpenChange,
  collectionSlug,
}: CollectionUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to link uploaded image to collection
  const linkImageMutation = useMutation({
    mutationFn: async (uploadData: { imageUrl: string; uploadId: string }) => {
      const response = await fetch(`/api/v1/collections/${collectionSlug}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadData.imageUrl,
          uploadId: uploadData.uploadId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to link image to collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...collectionsQueryKeys.bySlug(collectionSlug)],
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to link image', { description: error.message });
    },
  });

  const handleUploadComplete = (uploadedFiles?: { url: string; uploadId: string }[]) => {
    toast.success('Upload completed successfully!');

    // Link all uploaded files to the collection
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach((file) => {
        linkImageMutation.mutate({ imageUrl: file.url, uploadId: file.uploadId });
      });
    }
  };

  const handleUploadError = (error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>Upload new images to this collection.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ImageUploader
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
