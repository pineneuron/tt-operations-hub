'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  addHours,
  setHours,
  getHours,
  getMinutes
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MeetingStatus } from '@prisma/client';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface CalendarMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  type?: string | null;
}

interface MeetingCalendarViewProps {
  meetings: CalendarMeeting[];
}

const statusColors: Record<MeetingStatus, string> = {
  SCHEDULED: 'bg-blue-500',
  IN_PROGRESS: 'bg-yellow-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
  POSTPONED: 'bg-gray-500'
};

const statusLabels: Record<MeetingStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  POSTPONED: 'Postponed'
};

type CalendarView = 'month' | 'week' | 'day';

export function MeetingCalendarView({ meetings }: MeetingCalendarViewProps) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const grouped: Record<string, CalendarMeeting[]> = {};

    meetings.forEach((meeting) => {
      const start = new Date(meeting.startTime);
      const end = new Date(meeting.endTime);

      // Get all days this meeting spans
      const days = eachDayOfInterval({ start, end });

      days.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        // Avoid duplicates
        if (!grouped[dateKey].find((m) => m.id === meeting.id)) {
          grouped[dateKey].push(meeting);
        }
      });
    });

    return grouped;
  }, [meetings]);

  // Get meetings for a specific date
  const getMeetingsForDate = (date: Date): CalendarMeeting[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return meetingsByDate[dateKey] || [];
  };

  // Get dates that have meetings (for modifiers)
  const datesWithMeetings = useMemo(() => {
    return Object.keys(meetingsByDate).map((dateKey) => new Date(dateKey));
  }, [meetingsByDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (!date) return;

    const dayMeetings = getMeetingsForDate(date);
    if (dayMeetings.length === 1) {
      // If only one meeting, navigate directly to it
      router.push(`/dashboard/meetings/${dayMeetings[0].id}`);
    } else if (dayMeetings.length > 1) {
      // If multiple meetings, navigate to the first one
      router.push(`/dashboard/meetings/${dayMeetings[0].id}`);
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(undefined);
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    if (newView === 'day' && !selectedDate) {
      setSelectedDate(currentDate);
    }
  };

  // Create a map of dates to meeting indicators for CSS
  const dateMeetingMap = useMemo(() => {
    const map: Record<string, CalendarMeeting[]> = {};
    Object.keys(meetingsByDate).forEach((dateKey) => {
      map[dateKey] = meetingsByDate[dateKey];
    });
    return map;
  }, [meetingsByDate]);

  // Get calendar weeks for the month
  const calendarWeeks = useMemo(() => {
    if (view !== 'month') return [];

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const weeks: Date[][] = [];
    let date = start;

    while (date <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(date));
        date = addDays(date, 1);
      }
      weeks.push(week);
    }

    return weeks;
  }, [currentDate, view]);

  // Get week days for week view
  const weekDays = useMemo(() => {
    if (view !== 'week') return [];

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [currentDate, view]);

  // Get day hours for day/week view (24 hours)
  const dayHours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  const selectedDateMeetings = selectedDate
    ? getMeetingsForDate(selectedDate)
    : [];
  const today = new Date();

  // Get meetings for a specific hour
  const getMeetingsForHour = (date: Date, hour: number): CalendarMeeting[] => {
    const dayMeetings = getMeetingsForDate(date);
    return dayMeetings.filter((meeting) => {
      const meetingStart = new Date(meeting.startTime);
      return getHours(meetingStart) === hour;
    });
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (view === 'month') {
      const prev = new Date(currentDate);
      prev.setMonth(prev.getMonth() - 1);
      handleDateChange(prev);
    } else if (view === 'week') {
      handleDateChange(subWeeks(currentDate, 1));
    } else {
      handleDateChange(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() + 1);
      handleDateChange(next);
    } else if (view === 'week') {
      handleDateChange(addWeeks(currentDate, 1));
    } else {
      handleDateChange(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    const todayDate = new Date();
    handleDateChange(todayDate);
    if (view === 'day') {
      setSelectedDate(todayDate);
    }
  };

  // Format date based on view
  const getDateLabel = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
      }
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between px-1'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={handleToday}>
            Today
          </Button>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={handlePrevious}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={handleNext}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
          <h2 className='ml-2 text-xl font-semibold'>{getDateLabel()}</h2>
        </div>

        <div className='flex items-center gap-2'>
          <Select
            value={view}
            onValueChange={(value) => handleViewChange(value as CalendarView)}
          >
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='month'>Month</SelectItem>
              <SelectItem value='week'>Week</SelectItem>
              <SelectItem value='day'>Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Content */}
      {view === 'month' && (
        <div className='bg-card flex-1 overflow-hidden rounded-lg border'>
          {/* Days of week header */}
          <div className='bg-muted/50 grid grid-cols-7 border-b'>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className='text-muted-foreground p-2 text-center text-sm font-medium'
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar weeks */}
          <div className='grid grid-cols-7 divide-x divide-y'>
            {calendarWeeks.map((week, weekIdx) =>
              week.map((date, dayIdx) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayMeetings = getMeetingsForDate(date);
                const isToday = isSameDay(date, today);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isSelected =
                  selectedDate && isSameDay(date, selectedDate);

                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={cn(
                      'bg-background relative min-h-32 p-2',
                      !isCurrentMonth && 'bg-muted/30',
                      isSelected && 'bg-accent/50'
                    )}
                    onClick={() => handleDateSelect(date)}
                  >
                    {/* Date number */}
                    <div
                      className={cn(
                        'mb-1 px-1 text-sm font-medium',
                        isToday &&
                          'bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full',
                        !isCurrentMonth && 'text-muted-foreground opacity-50',
                        isSelected && !isToday && 'text-primary'
                      )}
                    >
                      {format(date, 'd')}
                    </div>

                    {/* Meetings */}
                    <div className='space-y-1'>
                      {dayMeetings.slice(0, 4).map((meeting) => {
                        const startTime = format(
                          new Date(meeting.startTime),
                          'h:mma'
                        ).toLowerCase();
                        const meetingTitle =
                          meeting.title.length > 30
                            ? `${meeting.title.substring(0, 30)}...`
                            : meeting.title;

                        return (
                          <div
                            key={meeting.id}
                            className={cn(
                              'cursor-pointer truncate rounded px-2 py-1 text-xs transition-opacity hover:opacity-80',
                              'text-[11px] font-medium text-white',
                              statusColors[meeting.status]
                            )}
                            title={`${meeting.title} - ${statusLabels[meeting.status]}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/meetings/${meeting.id}`);
                            }}
                          >
                            <span className='font-semibold'>{startTime}</span>{' '}
                            {meetingTitle}
                          </div>
                        );
                      })}
                      {dayMeetings.length > 4 && (
                        <div
                          className='text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5 text-xs'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDateSelect(date);
                          }}
                        >
                          + {dayMeetings.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className='bg-card flex-1 overflow-auto rounded-lg border'>
          {/* Days header */}
          <div className='bg-muted/50 sticky top-0 z-10 grid grid-cols-8 border-b'>
            <div className='border-r p-2'></div>
            {weekDays.map((date) => {
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={format(date, 'yyyy-MM-dd')}
                  className={cn(
                    'border-r p-2 text-center',
                    isToday && 'bg-primary/10'
                  )}
                >
                  <div className='text-muted-foreground text-xs'>
                    {format(date, 'EEE')}
                  </div>
                  <div
                    className={cn(
                      'mt-1 text-lg font-semibold',
                      isToday &&
                        'bg-primary text-primary-foreground mx-auto flex h-8 w-8 items-center justify-center rounded-full'
                    )}
                  >
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hours grid */}
          <div className='grid grid-cols-8'>
            {dayHours.map((hour) => (
              <React.Fragment key={hour}>
                <div className='text-muted-foreground border-r border-b p-2 pr-4 text-right text-xs'>
                  {format(setHours(new Date(), hour), 'h a')}
                </div>
                {weekDays.map((date) => {
                  const hourMeetings = getMeetingsForHour(date, hour);
                  return (
                    <div
                      key={`${format(date, 'yyyy-MM-dd')}-${hour}`}
                      className='relative flex min-h-20 flex-col justify-center border-r border-b p-1'
                      onClick={() => handleDateSelect(date)}
                    >
                      {hourMeetings.map((meeting) => {
                        return (
                          <div
                            key={meeting.id}
                            className={cn(
                              'mb-1 w-full cursor-pointer rounded px-2 py-1.5 text-[11px] text-white transition-opacity hover:opacity-80',
                              statusColors[meeting.status]
                            )}
                            title={`${meeting.title} - ${statusLabels[meeting.status]}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/meetings/${meeting.id}`);
                            }}
                          >
                            <div className='truncate leading-tight font-semibold'>
                              {meeting.title}
                            </div>
                            <div className='mt-0.5 truncate text-[10px] opacity-90'>
                              {format(new Date(meeting.startTime), 'h:mma')} -{' '}
                              {format(new Date(meeting.endTime), 'h:mma')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div className='bg-card flex-1 overflow-auto rounded-lg border'>
          {/* Day header */}
          <div className='bg-muted/50 border-b p-4'>
            <div className='text-muted-foreground text-sm'>
              {format(currentDate, 'EEEE')}
            </div>
            <div className='mt-1 text-2xl font-semibold'>
              {format(currentDate, 'MMMM d, yyyy')}
            </div>
          </div>

          {/* Hours grid */}
          <div className='grid grid-cols-12'>
            {dayHours.map((hour) => {
              const hourMeetings = getMeetingsForHour(currentDate, hour);
              return (
                <React.Fragment key={hour}>
                  <div className='text-muted-foreground border-r border-b p-2 pr-4 text-right text-xs'>
                    {format(setHours(new Date(), hour), 'h a')}
                  </div>
                  <div
                    className='relative col-span-11 flex min-h-20 flex-col justify-center border-r border-b p-1'
                    onClick={() => handleDateSelect(currentDate)}
                  >
                    {hourMeetings.map((meeting) => {
                      return (
                        <div
                          key={meeting.id}
                          className={cn(
                            'mb-1 w-full cursor-pointer rounded px-3 py-2 text-white transition-opacity hover:opacity-80',
                            statusColors[meeting.status]
                          )}
                          title={`${meeting.title} - ${statusLabels[meeting.status]}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/meetings/${meeting.id}`);
                          }}
                        >
                          <div className='truncate text-sm leading-tight font-semibold'>
                            {meeting.title}
                          </div>
                          <div className='mt-1 truncate text-xs opacity-90'>
                            {format(new Date(meeting.startTime), 'h:mma')} -{' '}
                            {format(new Date(meeting.endTime), 'h:mma')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
