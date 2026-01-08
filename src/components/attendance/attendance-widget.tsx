'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconClock,
  IconHome,
  IconBuilding,
  IconPlayerPlay,
  IconLogout
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { UserRole } from '@/types/user-role';
import { isWithinCheckoutRadius } from '@/lib/distance';
import { isLateCheckIn } from '@/lib/kathmandu-time';

interface AttendanceSession {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  workLocation: 'OFFICE' | 'SITE';
  status: string;
  isLate: boolean;
  lateMinutes: number | null;
  totalHours: number | null;
  checkInLocationLat?: number | null;
  checkInLocationLng?: number | null;
}

interface AttendanceData {
  activeSession: AttendanceSession | null;
  hasActiveSession: boolean;
}

export function AttendanceWidget() {
  const { data: session } = useSession();
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);
  const [workLocation, setWorkLocation] = useState<'OFFICE' | 'SITE'>('OFFICE');
  const [lateReason, setLateReason] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [locationInterval, setLocationInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  const userRole = session?.user?.role as UserRole;
  const canUseAttendance =
    userRole === UserRole.STAFF || userRole === UserRole.FINANCE;

  // Fetch current attendance status
  const fetchAttendance = useCallback(async () => {
    if (!canUseAttendance) return;

    try {
      const response = await fetch('/api/attendance/current');
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  }, [canUseAttendance]);

  // Get user location
  const getCurrentLocation = useCallback((): Promise<{
    lat: number;
    lng: number;
    address?: string;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Try to get address from reverse geocoding (optional)
          let address: string | undefined;
          const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
          if (apiKey) {
            try {
              const response = await fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`
              );
              if (response.ok) {
                const data = await response.json();
                address = data.results[0]?.formatted;
              }
            } catch (error) {
              // Ignore geocoding errors - address is optional
            }
          }

          resolve({ lat, lng, address });
        },
        (error) => {
          reject(new Error('Failed to get location: ' + error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  // Calculate elapsed time
  useEffect(() => {
    if (!attendanceData?.activeSession) {
      setElapsedTime('00:00:00');
      return;
    }

    const checkInTime = new Date(
      attendanceData.activeSession.checkInTime
    ).getTime();

    // Calculate elapsed time immediately
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsed = now - checkInTime;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    // Calculate immediately on mount/update
    calculateElapsed();

    // Then update every second
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [attendanceData?.activeSession]);

  // Location tracking every 5 minutes
  useEffect(() => {
    if (!attendanceData?.activeSession) {
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }
      return;
    }

    const trackLocation = async () => {
      try {
        const location = await getCurrentLocation();
        await fetch('/api/attendance/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: attendanceData.activeSession!.id,
            latitude: location.lat,
            longitude: location.lng,
            address: location.address
          })
        });
      } catch (error) {
        console.error('Failed to track location:', error);
      }
    };

    // Track immediately
    trackLocation();

    // Then track every 5 minutes
    const interval = setInterval(trackLocation, 5 * 60 * 1000);
    setLocationInterval(interval);

    return () => {
      clearInterval(interval);
    };
  }, [attendanceData?.activeSession, getCurrentLocation]);

  // Initial fetch
  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  const handleCheckIn = async () => {
    setLoading(true);
    setLocationError(null);

    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      // Check if late (10 AM Kathmandu time)
      const now = new Date();
      const isLate = isLateCheckIn(now);

      if (isLate && !lateReason.trim()) {
        setLocationError('Please provide a reason for being late');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workLocation,
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
          notes: checkInNotes || null,
          lateReason: isLate ? lateReason : null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check in');
      }

      toast.success('Checked in successfully');
      setCheckInPopoverOpen(false);
      setLateReason('');
      setCheckInNotes('');
      await fetchAttendance();
    } catch (error: any) {
      setLocationError(error.message || 'Failed to get location');
      toast.error(error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    setLoading(true);
    setLocationError(null);

    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      // Check if checkout location is within radius (500 meters)
      // Get check-in location from activeSession
      const checkInLat = activeSession?.checkInLocationLat ?? null;
      const checkInLng = activeSession?.checkInLocationLng ?? null;

      // Check-in location is required - if missing, block checkout
      if (
        checkInLat === null ||
        checkInLat === undefined ||
        checkInLng === null ||
        checkInLng === undefined
      ) {
        const errorMsg =
          'Check-in location is missing. Cannot validate check-out location. Please contact administrator.';
        setLocationError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      // Validate distance
      const withinRadius = isWithinCheckoutRadius(
        checkInLat,
        checkInLng,
        location.lat,
        location.lng
      );

      if (!withinRadius) {
        // Checkout is completely blocked if outside 500m radius
        const errorMsg =
          'Check-out location is outside the allowed radius (500 meters). Check-out from this location is not allowed. Please check out from a location within 500 meters of your check-in location.';
        setLocationError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
          notes: checkOutNotes || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (
          error.error === 'CHECKOUT_OUT_OF_RADIUS' ||
          error.error === 'CHECKOUT_LOCATION_MISSING'
        ) {
          const errorMsg =
            error.message ||
            'Check-out location is outside the allowed radius (500 meters).';
          setLocationError(errorMsg);
          toast.error(errorMsg);
          setLoading(false);
          return;
        }
        const errorMsg = error.message || error.error || 'Failed to check out';
        setLocationError(errorMsg);
        throw new Error(errorMsg);
      }

      toast.success('Checked out successfully');
      setCheckOutNotes('');
      setLocationError(null);
      setCheckOutPopoverOpen(false);
      // Small delay to ensure database update is complete before fetching
      await new Promise((resolve) => setTimeout(resolve, 100));
      await fetchAttendance(); // Fetch updated attendance data
    } catch (error: any) {
      setLocationError(error.message || 'Failed to get location');
      toast.error(error.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  if (!canUseAttendance) {
    return null;
  }

  const hasActiveSession = attendanceData?.hasActiveSession ?? false;
  const activeSession = attendanceData?.activeSession;
  const isLoading = attendanceData === null;

  // Show skeleton loading while fetching attendance data
  if (isLoading) {
    return (
      <div className='flex items-center gap-2'>
        <Skeleton className='h-8 w-[140px] rounded-md' />{' '}
        {/* Submit Attendance button skeleton */}
        <Skeleton className='hidden h-8 w-[120px] rounded-md md:block' />{' '}
        {/* Office/Site toggle skeleton */}
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      {hasActiveSession && activeSession ? (
        <Popover
          open={checkOutPopoverOpen}
          onOpenChange={setCheckOutPopoverOpen}
        >
          <PopoverTrigger asChild>
            <button
              className='bg-primary text-primary-foreground hover:bg-primary/90 flex w-[120px] cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50'
              disabled={loading}
            >
              <IconClock className='h-4 w-4' />
              <span className='text-sm tabular-nums'>{elapsedTime}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className='w-80' align='start'>
            <div className='space-y-4'>
              <div>
                <h4 className='mb-1 text-sm font-medium'>Check Out</h4>
                <p className='text-muted-foreground text-xs'>
                  Confirm your location to check out
                </p>
              </div>
              {locationError && (
                <div className='text-destructive text-sm'>{locationError}</div>
              )}
              <div className='space-y-2'>
                <Label htmlFor='checkOutNotes'>Notes (Optional)</Label>
                <Textarea
                  id='checkOutNotes'
                  placeholder='Add any notes...'
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setCheckOutPopoverOpen(false);
                    setCheckOutNotes('');
                    setLocationError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCheckOut} disabled={loading} size='sm'>
                  {loading ? 'Checking out...' : 'Check Out'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <Popover
            open={checkInPopoverOpen}
            onOpenChange={setCheckInPopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant='default'
                size='sm'
                disabled={loading}
                className='px-2 md:px-3'
              >
                <IconPlayerPlay className='h-3 w-3 md:h-4 md:w-4' />
                <span className='hidden text-xs md:inline md:text-sm'>
                  Submit Attendance
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-80' align='start'>
              <div className='space-y-4'>
                <div>
                  <h4 className='mb-1 text-sm font-medium'>Check In</h4>
                  <p className='text-muted-foreground text-xs'>
                    Provide your current location to check in
                  </p>
                </div>
                {locationError && (
                  <div className='text-destructive text-sm'>
                    {locationError}
                  </div>
                )}
                {/* Office/Site selection - shown on mobile inside popover */}
                <div className='space-y-2 md:hidden'>
                  <Label htmlFor='workLocation' className='text-sm'>
                    Work Location
                  </Label>
                  <ToggleGroup
                    type='single'
                    value={workLocation}
                    onValueChange={(value) =>
                      value && setWorkLocation(value as 'OFFICE' | 'SITE')
                    }
                    className='w-full'
                  >
                    <ToggleGroupItem value='OFFICE' className='flex-1'>
                      <IconHome className='h-4 w-4' />
                      Office
                    </ToggleGroupItem>
                    <ToggleGroupItem value='SITE' className='flex-1'>
                      <IconBuilding className='h-4 w-4' />
                      Site
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                {/* Check if late - show reason field */}
                {(() => {
                  const now = new Date();
                  const isLate = isLateCheckIn(now);
                  return isLate ? (
                    <div className='space-y-2'>
                      <Label htmlFor='lateReason' className='text-sm'>
                        Reason for being late{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Textarea
                        id='lateReason'
                        placeholder='Eg. Overslept, Traffic, Public Transport, etc.'
                        value={lateReason}
                        onChange={(e) => setLateReason(e.target.value)}
                        rows={3}
                        className='text-sm'
                      />
                    </div>
                  ) : null;
                })()}
                <div className='space-y-2'>
                  <Label htmlFor='checkInNotes' className='text-sm'>
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id='checkInNotes'
                    placeholder='Add any notes...'
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    rows={2}
                    className='text-sm'
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setCheckInPopoverOpen(false);
                      setLateReason('');
                      setCheckInNotes('');
                      setLocationError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCheckIn} disabled={loading} size='sm'>
                    {loading ? 'Checking in...' : 'Submit'}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <ToggleGroup
            type='single'
            value={workLocation}
            onValueChange={(value) =>
              value && setWorkLocation(value as 'OFFICE' | 'SITE')
            }
            className='hidden md:flex'
          >
            <ToggleGroupItem value='OFFICE' className='flex-1'>
              <IconHome className='h-4 w-4' />
              Office
            </ToggleGroupItem>
            <ToggleGroupItem value='SITE' className='flex-1'>
              <IconBuilding className='h-4 w-4' />
              Site
            </ToggleGroupItem>
          </ToggleGroup>
        </>
      )}
    </div>
  );
}
