import React from 'react';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import {
  IconApps,
  IconBell,
  IconCalendarEvent,
  IconChecklist,
  IconClipboardCheck,
  IconClockCheck,
  IconTruckDelivery,
  IconUsersGroup
} from '@tabler/icons-react';

const summaryStats = [
  {
    title: 'Attendance compliance',
    value: '98%',
    delta: '+2.3% vs last week',
    note: 'Staff check-ins across all hubs'
  },
  {
    title: 'Upcoming events',
    value: '12',
    delta: '4 new briefs',
    note: 'On-site + virtual'
  },
  {
    title: 'Meetings today',
    value: '7',
    delta: '3 client, 4 internal',
    note: 'Auto synced from calendar'
  },
  {
    title: 'To-do items',
    value: '32',
    delta: '5 overdue tasks',
    note: 'Staff & vendor assignments'
  },
  {
    title: 'Transportation jobs',
    value: '9',
    delta: '2 awaiting vendor ack',
    note: 'Bookings created by staff'
  },
  {
    title: 'Vendors engaged',
    value: '18',
    delta: '6 suppliers active',
    note: 'All notified via email/SMS'
  }
];

const notifications = [
  {
    title: 'Admin scheduled a kickoff with Mero Bank',
    detail: 'Meeting for AV requirements assigned to Client + Staff',
    time: '2m ago',
    read: false
  },
  {
    title: 'New transportation booking',
    detail: 'Staff requested 3-ton truck for Expo load-out',
    time: '15m ago',
    read: false
  },
  {
    title: 'Vendor contract updated',
    detail: 'Lighting vendor approved revised scope',
    time: '32m ago',
    read: true
  },
  {
    title: 'Task assigned: Stage layout QA',
    detail: 'Admin assigned to Events team with due date today',
    time: '1h ago',
    read: true
  },
  {
    title: 'Finance reminder',
    detail: 'Supplier invoices ready for review',
    time: '3h ago',
    read: true
  }
];

const quickLinks = [
  {
    title: 'Attendance',
    description: 'Check-In, Check-Out, Attendance History',
    icon: IconClockCheck,
    roles: 'Staff + Admin'
  },
  {
    title: 'Events',
    description: 'Upcoming, Past, Updates, Reports, Summary',
    icon: IconCalendarEvent,
    roles: 'Admin + Manager'
  },
  {
    title: 'Meeting',
    description: '3-5 upcoming, Past log, Summary export',
    icon: IconUsersGroup,
    roles: 'Admin + Manager + Staff'
  },
  {
    title: 'To Do List',
    description: 'Job assignments for Staff + Vendor/Supplier',
    icon: IconChecklist,
    roles: 'Admin + Staff + Vendor'
  },
  {
    title: 'Transportation',
    description: 'Bookings & entry logs with vendor alerts',
    icon: IconTruckDelivery,
    roles: 'Staff + Vendor'
  },
  {
    title: 'More',
    description: 'Access extra tools & configurations',
    icon: IconApps,
    roles: 'All roles'
  }
];

const eventTimeline = [
  {
    name: 'Tech Trust Leadership Summit',
    date: '18 Nov • 10:00 AM',
    venue: 'Hyatt Regency',
    status: 'Scheduled'
  },
  {
    name: 'Startup Demo Day',
    date: '22 Nov • 01:30 PM',
    venue: 'TT HQ Auditorium',
    status: 'In progress'
  },
  {
    name: 'Client Appreciation Gala',
    date: '25 Nov • 06:00 PM',
    venue: 'Soltee Crown Plaza',
    status: 'Pending sign-off'
  },
  {
    name: 'Vendor Expo',
    date: '28 Nov • 09:00 AM',
    venue: 'Bhrikutimandap Ground',
    status: 'Scheduled'
  }
];

const meetingNotes = [
  {
    title: 'Client briefing – Masta Foods',
    participants: 'Client + Staff',
    time: 'Today • 14:30',
    action: 'Accept / Decline with reason'
  },
  {
    title: 'Vendor onboarding – AV Nepal',
    participants: 'Vendor/Supplier + Admin',
    time: 'Tomorrow • 09:00',
    action: 'Share requirements'
  },
  {
    title: 'Finance sync – Billing + Ops',
    participants: 'Finance + Admin',
    time: 'Fri • 11:00',
    action: 'Review transportation invoices'
  }
];

const jobList = [
  {
    title: 'Main stage install',
    type: 'Events • Staff',
    status: 'In progress',
    detail: 'Checklist shared with rigging vendor'
  },
  {
    title: 'Client approvals',
    type: 'Admin • Client',
    status: 'Waiting feedback',
    detail: 'Layouts sent to client for signature'
  },
  {
    title: 'Vendor advance',
    type: 'Finance • Vendor',
    status: 'Ready for payout',
    detail: 'Payment schedule verified'
  }
];

const transportationFeed = [
  {
    route: 'TT HQ ➝ BICC',
    vendor: 'RoadRunner Logistics',
    time: 'Load-out at 07:30',
    status: 'In transit'
  },
  {
    route: 'Warehouse ➝ City Hall',
    vendor: 'Metro Movers',
    time: 'Drop-off at 09:15',
    status: 'Delivered'
  },
  {
    route: 'Airport Cargo ➝ Hyatt',
    vendor: 'SkyLift Services',
    time: 'Pick-up at 11:00',
    status: 'Awaiting pickup'
  }
];

export default function OverViewLayout({
  sales,
  pie_stats,
  bar_stats,
  area_stats
}: {
  sales: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-8'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-muted-foreground text-sm'>
              Operations Control • All roles
            </p>
            <h2 className='text-2xl font-bold tracking-tight'>
              Welcome to Tech Trust
            </h2>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline'>View calendar</Button>
            <Button>Create record</Button>
          </div>
        </div>

        <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
          <Card className='order-2 lg:order-1'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='flex items-center gap-2'>
                <IconBell className='text-primary h-4 w-4' />
                Recent notifications
              </CardTitle>
              <Badge variant='outline'>Last 5 updates</Badge>
            </CardHeader>
            <CardContent className='space-y-3'>
              {notifications.map((item) => (
                <button
                  key={item.title}
                  className='hover:border-primary flex w-full flex-col gap-1 rounded-lg border p-3 text-left text-sm transition'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-start gap-2'>
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          item.read ? 'bg-muted' : 'bg-primary'
                        }`}
                        aria-hidden
                      />
                      <div>
                        <p className='font-medium'>{item.title}</p>
                        <p className='text-muted-foreground text-xs'>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                    <span className='text-muted-foreground text-[11px] whitespace-nowrap'>
                      {item.time}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
            <div className='border-t px-3 pt-3'>
              <Button variant='ghost' className='w-full text-sm'>
                See all notifications
              </Button>
            </div>
          </Card>
          <div className='order-1 space-y-4 lg:order-2'>
            {summaryStats.slice(0, 3).map((stat) => (
              <Card key={`${stat.title}-sidebar`} className='p-5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-xs tracking-wide uppercase'>
                      {stat.title}
                    </p>
                    <p className='pt-2 text-3xl font-semibold'>{stat.value}</p>
                  </div>
                  <Badge variant='secondary'>{stat.delta}</Badge>
                </div>
                <p className='text-muted-foreground mt-3 text-sm'>
                  {stat.note}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {summaryStats.map((stat) => (
            <Card key={stat.title} className='p-5'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-muted-foreground text-xs tracking-wide uppercase'>
                    {stat.title}
                  </p>
                  <p className='pt-2 text-3xl font-semibold'>{stat.value}</p>
                </div>
                <Badge variant='secondary'>{stat.delta}</Badge>
              </div>
              <p className='text-muted-foreground mt-3 text-sm'>{stat.note}</p>
            </Card>
          ))}
        </div>

        <div className='grid gap-6 lg:grid-cols-[2fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Workspace shortcuts</CardTitle>
              <CardDescription>
                Navigate across Attendance, Events, Meeting, To Do,
                Transportation and More.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3'>
              {quickLinks.map((link) => (
                <button
                  key={link.title}
                  className='hover:border-primary flex w-full items-start gap-3 rounded-lg border p-3 text-left transition'
                >
                  <link.icon className='text-primary mt-1 h-4 w-4' />
                  <div>
                    <p className='text-sm font-semibold'>{link.title}</p>
                    <p className='text-muted-foreground text-xs'>
                      {link.description}
                    </p>
                    <p className='text-muted-foreground mt-1 text-[11px]'>
                      {link.roles}
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <section className='grid gap-6 lg:grid-cols-[1.1fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Attendance control</CardTitle>
              <CardDescription>
                Staff use OTP/location based Check-In. Admin can audit
                everything.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              <div>
                <p className='font-semibold'>Check-In</p>
                <p className='text-muted-foreground'>
                  Mobile + GPS verification ensures compliance with the allowed
                  location radius.
                </p>
              </div>
              <div>
                <p className='font-semibold'>Check-Out</p>
                <p className='text-muted-foreground'>
                  System validates that a check-in exists and enforces the 500
                  meter radius unless an Admin override is logged.
                </p>
              </div>
              <div>
                <p className='font-semibold'>Attendance History</p>
                <p className='text-muted-foreground'>
                  Staff see their timeline; Admin/Platform Admin can filter,
                  export and investigate anomalies.
                </p>
              </div>
            </CardContent>
          </Card>
          {bar_stats}
        </section>

        <section className='grid gap-6 xl:grid-cols-3'>
          <Card className='xl:col-span-2'>
            <CardHeader>
              <CardTitle>Upcoming events (3-5)</CardTitle>
              <CardDescription>
                Tap into a record to view tech riders, layouts and task status.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {eventTimeline.map((event) => (
                <div
                  key={event.name}
                  className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3'
                >
                  <div>
                    <p className='text-sm font-semibold'>{event.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {event.date} • {event.venue}
                    </p>
                  </div>
                  <Badge variant='secondary'>{event.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className='space-y-6'>
            {pie_stats}
            <Card>
              <CardHeader>
                <CardTitle>Event controls</CardTitle>
                <CardDescription>
                  Multi-role access for Admin, Manager, Staff, Vendors and
                  Clients.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <p>
                  <strong>Upcoming events:</strong> Staff + Clients see only
                  what belongs to them, Admin sees everything.
                </p>
                <p>
                  <strong>Past events:</strong> Admin/Manager can filter/export
                  notes, media and reports.
                </p>
                <p>
                  <strong>Event updates:</strong> Setup progress notifies Admin,
                  Staff, Vendors and Clients in real time.
                </p>
                <p>
                  <strong>Event reports:</strong> Staff/Coordinators submit
                  on-ground updates for Finance + Admin review.
                </p>
                <p>
                  <strong>Summary:</strong> Full overview with filters by date,
                  client or venue.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className='grid gap-6 lg:grid-cols-2'>
          <div>{area_stats}</div>
          <Card>
            <CardHeader>
              <CardTitle>Meeting workspace</CardTitle>
              <CardDescription>
                Staff accept/decline with reasons; Admin + Manager monitor all.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              {meetingNotes.map((meeting) => (
                <div
                  key={meeting.title}
                  className='space-y-1 rounded-lg border p-3'
                >
                  <p className='font-semibold'>{meeting.title}</p>
                  <p className='text-muted-foreground text-xs'>
                    {meeting.participants}
                  </p>
                  <p className='text-sm'>{meeting.time}</p>
                  <p className='text-muted-foreground text-xs'>
                    {meeting.action}
                  </p>
                </div>
              ))}
              <div className='bg-muted text-muted-foreground rounded-lg p-3 text-xs'>
                <strong>Summary of all meetings:</strong> Admin/Manager can
                filter by department or participant and export logs.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-6 lg:grid-cols-[1.5fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Job list overview</CardTitle>
              <CardDescription>
                Admin assigns tasks, Staff & Vendors complete updates instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              {jobList.map((job) => (
                <div key={job.title} className='rounded-lg border p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='font-semibold'>{job.title}</p>
                    <Badge variant='outline'>{job.status}</Badge>
                  </div>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {job.type}
                  </p>
                  <p className='mt-2'>{job.detail}</p>
                </div>
              ))}
              <div className='bg-muted text-muted-foreground rounded-lg p-3 text-xs'>
                <strong>To Do List:</strong> Staff + Vendor/Supplier receive
                notifications whenever a task is created or updated.
              </div>
            </CardContent>
          </Card>
          <div className='space-y-6'>
            {sales}
            <Card>
              <CardHeader>
                <CardTitle>To Do policy</CardTitle>
              </CardHeader>
              <CardContent className='text-muted-foreground space-y-3 text-sm'>
                <p>
                  • Admin can assign tasks to Staff or Vendor/Supplier users and
                  monitor progress.
                </p>
                <p>
                  • Automatic notifications fire on every change, ensuring the
                  right person responds quickly.
                </p>
                <p>
                  • Clients can follow tasks linked to their events for full
                  transparency.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Transportation activities (3-5)</CardTitle>
              <CardDescription>
                Staff create bookings, vendors receive instant notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              {transportationFeed.map((entry) => (
                <div key={entry.route} className='rounded-lg border p-4'>
                  <p className='font-semibold'>{entry.route}</p>
                  <p className='text-muted-foreground text-xs'>
                    Vendor: {entry.vendor}
                  </p>
                  <p className='mt-1'>{entry.time}</p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Status: {entry.status}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transportation controls</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p>
                • <strong>Transportation Booking:</strong> Staff creates or
                manages bookings and selects the vendor/supplier to be notified.
              </p>
              <p>
                • <strong>Transportation Entry:</strong> Record vehicle number,
                driver info, pickup & drop-off plus delivery status for Admin
                and Manager tracking.
              </p>
              <p>
                • Admin and Platform Admin can audit every trip, filter by
                vendor and export run sheets.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
