'use client';

import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageViewerModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function ImageViewerModal({
  imageUrl,
  isOpen,
  onClose,
  alt = 'Image'
}: ImageViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className='!fixed !inset-0 !z-[100] !bg-black/50' />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-[101] m-0 flex items-center justify-center p-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        >
          <DialogTitle className='sr-only'>{alt}</DialogTitle>
          <div className='relative flex h-full w-full items-center justify-center overflow-auto p-4'>
            <Image
              src={imageUrl}
              alt={alt}
              width={1920}
              height={1080}
              className='h-auto max-h-full w-auto max-w-full object-contain'
              sizes='100vw'
            />
          </div>
          <DialogPrimitive.Close className='ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 z-[102] rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none'>
            <XIcon className='h-6 w-6 text-white' />
            <span className='sr-only'>Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
