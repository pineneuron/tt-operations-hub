import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadToR2, validateR2Config } from '@/lib/r2';
import { prisma } from '@/lib/db';
import { EventMediaType, JobMediaType, MeetingMediaType } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate R2 configuration
    if (!validateR2Config()) {
      return NextResponse.json(
        {
          error:
            'R2 storage is not configured. Please check environment variables.'
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventId = formData.get('eventId') as string | null;
    const jobId = formData.get('jobId') as string | null;
    const meetingId = formData.get('meetingId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate that exactly one ID is provided
    const providedIds = [eventId, jobId, meetingId].filter(Boolean);
    if (providedIds.length === 0) {
      return NextResponse.json(
        { error: 'One of eventId, jobId, or meetingId must be provided' },
        { status: 400 }
      );
    }
    if (providedIds.length > 1) {
      return NextResponse.json(
        {
          error:
            'Only one of eventId, jobId, or meetingId can be provided at a time'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const validImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    const validDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    const validTypes = [...validImageTypes, ...validDocumentTypes];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Only images (JPEG, PNG, WebP) and documents (PDF, DOC, DOCX) are allowed.'
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to R2
    const url = await uploadToR2(buffer, filename, file.type);

    let mediaId: string | null = null;

    // Determine media type based on file type
    const isImage = validImageTypes.includes(file.type);

    // If an eventId is provided, create an EventMedia record
    if (eventId) {
      const mediaType = isImage
        ? EventMediaType.PHOTO
        : EventMediaType.DOCUMENT;

      const media = await prisma.eventMedia.create({
        data: {
          eventId,
          uploadedById: session.user.id,
          type: mediaType,
          url,
          size: file.size
        }
      });
      mediaId = media.id;
    }

    // If a jobId is provided, create a JobMedia record
    if (jobId) {
      const mediaType = isImage ? JobMediaType.PHOTO : JobMediaType.DOCUMENT;

      const media = await prisma.jobMedia.create({
        data: {
          jobId,
          uploadedById: session.user.id,
          type: mediaType,
          url,
          size: file.size
        }
      });
      mediaId = media.id;
    }

    // If a meetingId is provided, create a MeetingMedia record
    if (meetingId) {
      const mediaType = isImage
        ? MeetingMediaType.IMAGE
        : MeetingMediaType.DOCUMENT;

      const media = await prisma.meetingMedia.create({
        data: {
          meetingId,
          uploadedById: session.user.id,
          type: mediaType,
          url,
          size: file.size
        }
      });
      mediaId = media.id;
    }

    return NextResponse.json({ url, mediaId }, { status: 200 });
  } catch (error) {
    console.error('[UPLOAD_IMAGE]', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
