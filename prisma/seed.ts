import {
  EventMediaType,
  EventParticipantRole,
  EventStatus,
  EventUpdateType,
  JobPriority,
  JobStatus,
  NotificationCategory,
  NotificationChannel,
  PrismaClient,
  UserRole
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.notificationReceipt.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventMedia.deleteMany();
  await prisma.eventReport.deleteMany();
  await prisma.eventUpdate.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.jobAssignment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.event.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'anupam.achhami@gmail.com' },
    update: {},
    create: {
      email: 'anupam.achhami@gmail.com',
      username: 'admin',
      name: 'Platform Admin',
      passwordHash: hashedPassword,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const maheshAdmin = await prisma.user.upsert({
    where: { email: 'maheshbohara0101@gmail.com' },
    update: {},
    create: {
      email: 'maheshbohara0101@gmail.com',
      username: 'mahesh',
      name: 'Mahesh Bohara',
      passwordHash: hashedPassword,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@techtrust.com.np' },
    update: {},
    create: {
      email: 'staff@techtrust.com.np',
      username: 'staff',
      name: 'Staff User',
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@techtrust.com.np' },
    update: {},
    create: {
      email: 'finance@techtrust.com.np',
      username: 'finance',
      name: 'Finance User',
      passwordHash: hashedPassword,
      role: UserRole.FINANCE,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const clientUser = await prisma.user.upsert({
    where: { email: 'client@techtrust.com.np' },
    update: {},
    create: {
      email: 'client@techtrust.com.np',
      username: 'client',
      name: 'Client User',
      passwordHash: hashedPassword,
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@techtrust.com.np' },
    update: {},
    create: {
      email: 'vendor@techtrust.com.np',
      username: 'vendor',
      name: 'Vendor Partner',
      passwordHash: hashedPassword,
      role: UserRole.VENDOR_SUPPLIER,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const summitEvent = await prisma.event.create({
    data: {
      title: 'Tech Trust Annual Summit',
      description: 'Flagship corporate summit for enterprise clients.',
      clientId: clientUser.id,
      venue: 'Kathmandu Conference Hall',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      status: EventStatus.SCHEDULED
    }
  });

  const galaEvent = await prisma.event.create({
    data: {
      title: 'TT Operations Gala Night',
      description: 'Celebration gala with stakeholders and partners.',
      clientId: clientUser.id,
      venue: 'Lalitpur Grand Ballroom',
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: EventStatus.COMPLETED
    }
  });

  await prisma.eventParticipant.createMany({
    data: [
      {
        eventId: summitEvent.id,
        userId: clientUser.id,
        role: EventParticipantRole.CLIENT
      },
      {
        eventId: summitEvent.id,
        userId: staffUser.id,
        role: EventParticipantRole.STAFF
      },
      {
        eventId: summitEvent.id,
        userId: adminUser.id,
        role: EventParticipantRole.COORDINATOR
      },
      {
        eventId: summitEvent.id,
        userId: vendorUser.id,
        role: EventParticipantRole.VENDOR
      },
      {
        eventId: galaEvent.id,
        userId: clientUser.id,
        role: EventParticipantRole.CLIENT
      },
      {
        eventId: galaEvent.id,
        userId: staffUser.id,
        role: EventParticipantRole.STAFF
      }
    ]
  });

  await prisma.eventUpdate.createMany({
    data: [
      {
        eventId: summitEvent.id,
        createdById: staffUser.id,
        type: EventUpdateType.STATUS,
        status: EventStatus.IN_PROGRESS,
        message: 'Stage setup has started with AV partners.',
        metadata: { location: 'Main Hall', progress: '30%' }
      },
      {
        eventId: summitEvent.id,
        createdById: vendorUser.id,
        type: EventUpdateType.MILESTONE,
        status: EventStatus.SCHEDULED,
        message: 'Lighting rig delivered to venue.',
        metadata: { shipmentId: 'LR-9932' }
      }
    ]
  });

  const summitReport = await prisma.eventReport.create({
    data: {
      eventId: summitEvent.id,
      submittedById: staffUser.id,
      summary: 'Day 1 setup progress is on track.',
      issues: 'Need backup microphones.',
      notes: 'Coordinate with vendor for spares.'
    }
  });

  await prisma.eventMedia.createMany({
    data: [
      {
        eventId: summitEvent.id,
        reportId: summitReport.id,
        uploadedById: staffUser.id,
        type: EventMediaType.PHOTO,
        url: 'https://images.tt.com/events/summit-stage.jpg',
        description: 'Stage truss being assembled.'
      },
      {
        eventId: galaEvent.id,
        uploadedById: adminUser.id,
        type: EventMediaType.DOCUMENT,
        url: 'https://docs.tt.com/events/gala-summary.pdf',
        description: 'Final gala report.'
      }
    ]
  });

  const summitJob = await prisma.job.create({
    data: {
      title: 'Finalize AV Checklist',
      remarks: 'Confirm final AV gear list with vendor.',
      status: JobStatus.IN_PROGRESS,
      priority: JobPriority.LOW,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      eventId: summitEvent.id,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }
  });

  await prisma.jobAssignment.createMany({
    data: [
      {
        jobId: summitJob.id,
        userId: staffUser.id,
        role: 'Lead Coordinator'
      },
      {
        jobId: summitJob.id,
        userId: vendorUser.id,
        role: 'AV Vendor'
      }
    ]
  });

  const summitNotification = await prisma.notification.create({
    data: {
      category: NotificationCategory.EVENT,
      title: 'Summit setup is underway',
      body: 'Stage setup has started for Tech Trust Annual Summit.',
      entityType: NotificationCategory.EVENT,
      entityId: summitEvent.id,
      data: { eventId: summitEvent.id, status: EventStatus.IN_PROGRESS },
      createdById: staffUser.id,
      receipts: {
        create: [
          {
            userId: adminUser.id,
            channel: NotificationChannel.IN_APP,
            deliveredAt: new Date()
          },
          {
            userId: maheshAdmin.id,
            channel: NotificationChannel.IN_APP,
            deliveredAt: new Date()
          },
          {
            userId: clientUser.id,
            channel: NotificationChannel.IN_APP,
            deliveredAt: new Date()
          }
        ]
      }
    }
  });

  await prisma.notification.create({
    data: {
      category: NotificationCategory.JOB,
      title: 'AV checklist assigned',
      body: 'You have been assigned to finalize the AV checklist.',
      entityType: NotificationCategory.JOB,
      entityId: summitJob.id,
      data: { jobId: summitJob.id },
      createdById: adminUser.id,
      receipts: {
        create: [
          {
            userId: staffUser.id,
            channel: NotificationChannel.IN_APP,
            deliveredAt: new Date()
          },
          {
            userId: vendorUser.id,
            channel: NotificationChannel.IN_APP,
            deliveredAt: new Date()
          }
        ]
      }
    }
  });

  console.log('✅ Created users:');
  console.log(`   - Admin: admin@techtrust.com.np (password: password123)`);
  console.log(`   - Admin: maheshbohara0101@gmail.com (password: password123)`);
  console.log(`   - Staff: staff@techtrust.com.np (password: password123)`);
  console.log(`   - Finance: finance@techtrust.com.np (password: password123)`);
  console.log(`   - Client: client@techtrust.com.np (password: password123)`);
  console.log(`   - Vendor: vendor@techtrust.com.np (password: password123)`);
  console.log(
    '✅ Seeded events, participants, jobs, notifications, and media.'
  );
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
