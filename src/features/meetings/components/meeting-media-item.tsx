'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn, formatBytes } from '@/lib/utils';
import { ImageViewerModal } from '@/components/image-viewer-modal';

interface MeetingMediaItemProps {
  media: {
    id: string;
    url: string;
    type: string;
    description?: string | null;
    size?: number | null;
  };
  size?: 'small' | 'medium' | 'large';
  aspectRatio?: 'square' | 'video';
}

export function MeetingMediaItem({
  media,
  size = 'small',
  aspectRatio = 'square'
}: MeetingMediaItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isImage = media.type === 'PHOTO';
  const isDocument = media.type === 'DOCUMENT' || media.type === 'OTHER';

  const bytes = media.size;
  const sizeLabel =
    typeof bytes === 'number' ? formatBytes(bytes, { decimals: 1 }) : null;

  const typeLabel = media.type;
  const metaLabel = [typeLabel, sizeLabel].filter(Boolean).join(' · ');

  const handleClick = (e: React.MouseEvent) => {
    if (isImage) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const sizeClasses = {
    small: 'w-full',
    medium: 'w-16',
    large: 'w-80'
  };

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video'
  };

  return (
    <>
      <a
        href={media.url}
        target={isImage ? undefined : '_blank'}
        rel={isImage ? undefined : 'noreferrer'}
        onClick={handleClick}
        className='group flex cursor-pointer flex-col gap-1 text-center'
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-md border',
            sizeClasses[size],
            aspectRatioClasses[aspectRatio],
            isDocument
              ? 'bg-muted/50 flex items-center justify-center'
              : 'bg-muted'
          )}
        >
          {isImage ? (
            <Image
              src={media.url}
              alt={media.description || 'Meeting media'}
              fill
              className='object-cover transition-transform group-hover:scale-105'
            />
          ) : (
            <span className='text-muted-foreground text-[10px] font-medium'>
              FILE
            </span>
          )}
        </div>
        {metaLabel && (
          <span className='text-muted-foreground text-[10px]'>{metaLabel}</span>
        )}
      </a>
      {isImage && (
        <ImageViewerModal
          imageUrl={media.url}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          alt={media.description || 'Meeting media'}
        />
      )}
    </>
  );
}
