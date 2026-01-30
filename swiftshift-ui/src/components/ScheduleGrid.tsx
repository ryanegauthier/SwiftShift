import { useCallback, useEffect, useRef, useState } from 'react';
import { useShifts, useUsers, useLocations, usePositions } from '../hooks/useScheduleData';
import { useAvailabilityEvents } from '../hooks/useAvailabilityEvents';
import { useTimeOffRequests } from '../hooks/useTimeOffRequests';
import { useAuth } from '../hooks/useAuth';
import { format, startOfWeek, endOfWeek, addDays, addMinutes } from 'date-fns';
import type { Shift } from '../types';

const locationColors = [
  '#2563eb',
  '#16a34a',
  '#f97316',
  '#0ea5e9',
  '#a855f7',
];

const getLocationColorByIndex = (index: number) =>
  locationColors[index % locationColors.length];

export const ScheduleGrid = () => {
  const today = new Date();
  const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }, (_, idx) => addDays(weekStartDate, idx));
  const isWeekday = today >= weekStartDate && today <= addDays(weekStartDate, 4);
  const defaultDayIndex = isWeekday ? Math.max(0, Math.min(4, today.getDay() - 1)) : 0;

  const [view, setView] = useState<'week' | 'day'>('day');
  const [scheduleScope, setScheduleScope] = useState<'user' | 'location'>('user');
  const [selectedDayIndex, setSelectedDayIndex] = useState(defaultDayIndex);
  const [draftShifts, setDraftShifts] = useState<Shift[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddUserId, setQuickAddUserId] = useState<string>('');
  const [quickAddStart, setQuickAddStart] = useState('14:00');
  const [quickAddEnd, setQuickAddEnd] = useState('16:00');
  const [quickAddLocationId, setQuickAddLocationId] = useState('auto');
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [dropLocationId, setDropLocationId] = useState('auto');
  const [dropPayload, setDropPayload] = useState<{
    userId: number;
    start_time: string;
    end_time: string;
    day: Date;
  } | null>(null);
  const [shiftTimeOverrides, setShiftTimeOverrides] = useState<
    Record<number, { start_time: string; end_time: string }>
  >({});
  const [overlapMessage, setOverlapMessage] = useState('');
  const dragStateRef = useRef<{
    shiftId: number;
    edge: 'start' | 'end';
    startX: number;
    lastSteps: number;
  } | null>(null);
  const bodyStyleRef = useRef<{ userSelect: string; cursor: string } | null>(null);
  const gridStepPxRef = useRef<number>(80);
  const dayGridRef = useRef<HTMLDivElement | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: shifts, isLoading: shiftsLoading } = useShifts(weekStart, weekEnd);
  const { data: users } = useUsers();
  const { data: locations } = useLocations();
  const { data: positions } = usePositions();
  const { events: availabilityEvents } = useAvailabilityEvents();
  const { requests: timeOffRequests } = useTimeOffRequests();
  const { user: authUser } = useAuth();

  const safeShifts = shifts ?? [];
  const allShifts = [...safeShifts, ...draftShifts];
  const currentUserId = authUser?.role === 'tutor' ? authUser.id : undefined;
  const ignoreLocationFilterForTutor =
    authUser?.role === 'tutor' && scheduleScope === 'user';
  const filteredShifts =
    ignoreLocationFilterForTutor || selectedLocationId === 'all'
      ? allShifts
      : allShifts.filter(shift => String(shift.location_id) === selectedLocationId);
  const scopedShifts =
    scheduleScope === 'user' && currentUserId
      ? filteredShifts.filter(shift => shift.user_id === currentUserId)
      : filteredShifts;
  const shiftsByDay = days.map(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayShifts = scopedShifts
      .filter(shift => format(new Date(shift.start_time), 'yyyy-MM-dd') === dayKey)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return { day, dayShifts };
  });

  const selectedDay = days[selectedDayIndex];
  const selectedDayShifts = shiftsByDay[selectedDayIndex]?.dayShifts ?? [];

  useEffect(() => {
    if (!authUser || authUser.role !== 'tutor' || scheduleScope !== 'location') {
      return;
    }

    if (shiftsLoading) {
      return;
    }

    if (view === 'week') {
      setScheduleScope('user');
      return;
    }

    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    const userShift = allShifts.find(
      shift =>
        shift.user_id === authUser.id &&
        format(new Date(shift.start_time), 'yyyy-MM-dd') === dayKey
    );
    const fallbackLocationId =
      users?.find(u => u.id === authUser.id)?.locations[0] ?? locations?.[0]?.id;
    const nextLocationId = userShift?.location_id ?? fallbackLocationId;

    if (nextLocationId && String(nextLocationId) !== selectedLocationId) {
      setSelectedLocationId(String(nextLocationId));
    }
  }, [authUser, scheduleScope, selectedDay, allShifts, users, locations, selectedLocationId, shiftsLoading]);

  const openHour = 14;
  const closeHour = selectedDay.getDay() === 5 ? 18 : 19;
  const slotMinutes = 30;
  const totalSlots = ((closeHour - openHour) * 60) / slotMinutes;
  const slots = Array.from({ length: totalSlots }, (_, idx) => openHour * 60 + idx * slotMinutes);

  const tutorsWithShifts = (users ?? []).filter(user =>
    selectedDayShifts.some(shift => shift.user_id === user.id)
  );
  const userLocationForDay = new Map<number, number>();
  selectedDayShifts.forEach(shift => {
    if (!userLocationForDay.has(shift.user_id)) {
      userLocationForDay.set(shift.user_id, shift.location_id);
    }
  });
  const tutorsForDay =
    scheduleScope === 'location' && selectedLocationId === 'all'
      ? [...tutorsWithShifts].sort(
          (a, b) => (userLocationForDay.get(a.id) ?? 0) - (userLocationForDay.get(b.id) ?? 0)
        )
      : tutorsWithShifts;

  const parseTimeForDay = (day: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(day);
    date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return date;
  };

  const isDateWithinRange = (dayKey: string, startDate: string, endDate: string) => {
    return dayKey >= startDate && dayKey <= endDate;
  };

  const hasApprovedTimeOff = (userId: number, day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    return timeOffRequests.some(
      request =>
        request.user_id === userId &&
        request.status === 'approved' &&
        isDateWithinRange(dayKey, request.start_date, request.end_date)
    );
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    payload: { user_id: number; start_time: string; end_time: string }
  ) => {
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnDay = (event: React.DragEvent<HTMLDivElement>, day: Date) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw || !users || users.length === 0) {
      return;
    }
    let payload: { user_id: number; start_time: string; end_time: string } | null = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
    if (!payload?.user_id) {
      return;
    }
    setDropPayload({
      userId: payload.user_id,
      start_time: payload.start_time,
      end_time: payload.end_time,
      day,
    });
    setDropLocationId('auto');
    setDropModalOpen(true);
  };

  const openQuickAdd = (userId?: number, start?: string, end?: string) => {
    if (userId) {
      setQuickAddUserId(String(userId));
    }
    if (start) {
      setQuickAddStart(start);
    }
    if (end) {
      setQuickAddEnd(end);
    }
    setQuickAddOpen(true);
  };

  const closeQuickAdd = () => {
    setQuickAddOpen(false);
    setQuickAddUserId('');
    setQuickAddLocationId('auto');
  };

  const closeDropModal = () => {
    setDropModalOpen(false);
    setDropLocationId('auto');
    setDropPayload(null);
  };

  const handleQuickAdd = () => {
    const userId = Number(quickAddUserId);
    if (!userId || !users || users.length === 0) {
      return;
    }
    const user = users.find(u => u.id === userId);
    if (!user) {
      return;
    }
    const selectedLocation =
      quickAddLocationId === 'auto'
        ? user.locations[0] ?? locations?.[0]?.id ?? 1
        : Number(quickAddLocationId);
    const locationId = selectedLocation ?? user.locations[0] ?? locations?.[0]?.id ?? 1;
    const positionId = user.positions[0] ?? positions?.[0]?.id ?? 1;
    const start = parseTimeForDay(selectedDay, quickAddStart);
    const end = parseTimeForDay(selectedDay, quickAddEnd);

    if (end <= start) {
      return;
    }

    const overlapsExisting = allShifts.some(shift => {
      if (shift.user_id !== userId || shift.location_id !== locationId) {
        return false;
      }
      const existingStart = new Date(shift.start_time);
      const existingEnd = new Date(shift.end_time);
      return existingStart < end && existingEnd > start;
    });
    if (overlapsExisting) {
      const locationName = locations?.find(loc => loc.id === locationId)?.name;
      setOverlapMessage(
        locationName
          ? `Already scheduled at ${locationName} during this time.`
          : 'Already scheduled during this time.'
      );
      return;
    }

    setDraftShifts(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        user_id: userId,
        location_id: locationId,
        position_id: positionId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: 'Quick add',
        published: false,
      },
      ...prev,
    ]);
    closeQuickAdd();
  };

  const confirmDrop = () => {
    if (!dropPayload || !users || users.length === 0) {
      return;
    }
    const userForDrop = users.find(u => u.id === dropPayload.userId);
    if (!userForDrop) {
      return;
    }
    const resolvedLocationId =
      dropLocationId === 'auto'
        ? userForDrop.locations[0] ?? locations?.[0]?.id ?? 1
        : Number(dropLocationId);
    const locationId = resolvedLocationId ?? userForDrop.locations[0] ?? locations?.[0]?.id ?? 1;
    const positionId = userForDrop.positions[0] ?? positions?.[0]?.id ?? 1;
    const start = parseTimeForDay(dropPayload.day, dropPayload.start_time);
    const end = parseTimeForDay(dropPayload.day, dropPayload.end_time);
    if (end <= start) {
      end.setHours(start.getHours() + 1);
    }

    const overlapsExisting = allShifts.some(shift => {
      if (shift.user_id !== dropPayload.userId || shift.location_id !== locationId) {
        return false;
      }
      const existingStart = new Date(shift.start_time);
      const existingEnd = new Date(shift.end_time);
      return existingStart < end && existingEnd > start;
    });
    if (overlapsExisting) {
      const locationName = locations?.find(loc => loc.id === locationId)?.name;
      setOverlapMessage(
        locationName
          ? `Already scheduled at ${locationName} during this time.`
          : 'Already scheduled during this time.'
      );
      closeDropModal();
      return;
    }

    setDraftShifts(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        user_id: dropPayload.userId,
        location_id: locationId,
        position_id: positionId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: 'Added from availability',
        published: false,
      },
      ...prev,
    ]);
    closeDropModal();
  };

  const removeDraftShift = (shiftId: number) => {
    setDraftShifts(prev => prev.filter(shift => shift.id !== shiftId));
    setShiftTimeOverrides(prev => {
      const next = { ...prev };
      delete next[shiftId];
      return next;
    });
  };

  const confirmRemoveShift = (shiftId: number) => {
    const confirmed = window.confirm('Remove this shift?');
    if (!confirmed) {
      return;
    }
    removeDraftShift(shiftId);
  };

  const getLocationColor = (locationId?: number) => {
    if (!locationId) {
      return '#4b5563';
    }
    return locationColors[(locationId - 1) % locationColors.length];
  };

  const getEffectiveTimes = (shift: Shift) => {
    const override = shiftTimeOverrides[shift.id];
    const start = new Date(override?.start_time ?? shift.start_time);
    const end = new Date(override?.end_time ?? shift.end_time);
    return { start, end };
  };

  const buildMergedShifts = (userShifts: typeof selectedDayShifts) => {
    const sorted = [...userShifts]
      .map(shift => ({ shift, ...getEffectiveTimes(shift) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: Array<{
      start: Date;
      end: Date;
      shifts: typeof userShifts;
      locationId?: number;
    }> = [];

    sorted.forEach(entry => {
      const { start, end, shift } = entry;
      const last = merged[merged.length - 1];

      if (
        !last ||
        start > last.end ||
        (last.locationId && last.locationId !== shift.location_id)
      ) {
        merged.push({ start, end, shifts: [shift], locationId: shift.location_id });
        return;
      }

      if (end > last.end) {
        last.end = end;
      }
      last.shifts.push(shift);
    });

    return merged;
  };

  const updateShiftTime = useCallback((shiftId: number, minutesDelta: number, edge: 'start' | 'end') => {
    const baseShift = allShifts.find(shift => shift.id === shiftId);
    if (!baseShift) {
      return;
    }
    const current = shiftTimeOverrides[shiftId] ?? {
      start_time: baseShift.start_time,
      end_time: baseShift.end_time,
    };
    const start = new Date(current.start_time);
    const end = new Date(current.end_time);
    const day = new Date(start);
    const openHour = 14;
    const closeHour = day.getDay() === 5 ? 18 : 19;
    const minStart = new Date(day);
    minStart.setHours(openHour, 0, 0, 0);
    const maxEnd = new Date(day);
    maxEnd.setHours(closeHour, 0, 0, 0);
    const nextStart = edge === 'start' ? addMinutes(start, minutesDelta) : start;
    const nextEnd = edge === 'end' ? addMinutes(end, minutesDelta) : end;
    if (nextStart < minStart) {
      nextStart.setTime(minStart.getTime());
    }
    if (nextEnd > maxEnd) {
      nextEnd.setTime(maxEnd.getTime());
    }

    if (nextEnd <= nextStart) {
      return;
    }

    setShiftTimeOverrides(prev => ({
      ...prev,
      [shiftId]: {
        start_time: nextStart.toISOString(),
        end_time: nextEnd.toISOString(),
      },
    }));
  }, [allShifts, shiftTimeOverrides]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }
      const stepPx = gridStepPxRef.current || 80;
      const deltaX = event.clientX - dragState.startX;
      const steps = Math.round(deltaX / stepPx);
      if (steps === dragState.lastSteps) {
        return;
      }
      const stepDelta = steps - dragState.lastSteps;
      dragState.lastSteps = steps;
      updateShiftTime(dragState.shiftId, stepDelta * 30, dragState.edge);
    };

    const handleUp = () => {
      dragStateRef.current = null;
      if (bodyStyleRef.current) {
        document.body.style.userSelect = bodyStyleRef.current.userSelect;
        document.body.style.cursor = bodyStyleRef.current.cursor;
        bodyStyleRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [updateShiftTime]);

  useEffect(() => {
    const updateStepSize = () => {
      if (!dayGridRef.current) {
        return;
      }
      const rect = dayGridRef.current.getBoundingClientRect();
      const labelWidth = 220;
      const gridWidth = Math.max(rect.width - labelWidth, 0);
      const stepPx = totalSlots > 0 ? gridWidth / totalSlots : 80;
      gridStepPxRef.current = Math.max(40, stepPx);
    };

    updateStepSize();
    window.addEventListener('resize', updateStepSize);
    return () => window.removeEventListener('resize', updateStepSize);
  }, [totalSlots]);

  if (shiftsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  if (!shifts || shifts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No shifts scheduled this week</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border bg-white p-1">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${view === 'week' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${view === 'day' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              onClick={() => setView('day')}
            >
              Day
            </button>
          </div>
          <div className="inline-flex rounded-lg border bg-white p-1">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${scheduleScope === 'user' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              onClick={() => setScheduleScope('user')}
            >
              User schedule
            </button>
            {(authUser?.role !== 'tutor' || view !== 'week') && (
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${scheduleScope === 'location' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                onClick={() => setScheduleScope('location')}
              >
                Location schedule
              </button>
            )}
          </div>
          {scheduleScope === 'location' && (
            <select
              className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700"
              value={selectedLocationId}
              onChange={event => setSelectedLocationId(event.target.value)}
              disabled={authUser?.role === 'tutor'}
            >
              <option value="all">All locations</option>
              {(locations ?? []).map(location => (
                <option key={location.id} value={String(location.id)}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {overlapMessage && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{overlapMessage}</span>
          <button
            className="text-red-900 hover:text-red-950"
            onClick={() => setOverlapMessage('')}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="font-medium text-gray-700">Location legend:</span>
        {(locations ?? []).map((location, index) => (
          <div key={location.id} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: getLocationColorByIndex(index) }}
            />
            <span>{location.name}</span>
          </div>
        ))}
      </div>

      {view === 'week' && (
        <div className="mt-6 space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {shiftsByDay.map(({ day, dayShifts }) => (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className="bg-white rounded-lg border"
                onDragOver={event => event.preventDefault()}
                onDrop={event => handleDropOnDay(event, day)}
              >
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="text-sm text-gray-500">{format(day, 'EEE')}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {format(day, 'MMM d')}
                </div>
              </div>
              <div className="p-3 space-y-3">
                {dayShifts.length === 0 && (
                  <div className="text-sm text-gray-500">No shifts</div>
                )}
                {scheduleScope === 'user' &&
                  (users ?? [])
                    .filter(user => dayShifts.some(shift => shift.user_id === user.id))
                    .flatMap(user => {
                      const userShifts = dayShifts.filter(shift => shift.user_id === user.id);
                      const mergedShifts = buildMergedShifts(userShifts);

                      return mergedShifts.map((mergedShift, index) => {
                        const positionIds = new Set(mergedShift.shifts.map(s => s.position_id));
                        const position = positions?.find(p => p.id === mergedShift.shifts[0]?.position_id);
                        const location = locations?.find(l => l.id === mergedShift.shifts[0]?.location_id);
                        const startTime = mergedShift.start;
                        const endTime = mergedShift.end;
                        const hasMultiplePositions = positionIds.size > 1;
                        const locationColor = getLocationColor(location?.id);

                        return (
                          <div
                            key={`${user.id}-${index}`}
                            className="border rounded-md p-3 shadow-sm"
                            style={{ borderLeftWidth: '4px', borderLeftColor: locationColor }}
                          >
                            <div className="text-sm font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {hasMultiplePositions ? 'Multiple positions' : position?.name}
                            </div>
                            <div className="text-xs text-gray-500">{location?.name}</div>
                          </div>
                        );
                      });
                    })}
                {scheduleScope === 'location' &&
                  (locations ?? [])
                    .filter(location => dayShifts.some(shift => shift.location_id === location.id))
                    .map(location => {
                      const locationShifts = dayShifts.filter(shift => shift.location_id === location.id);
                      if (selectedLocationId !== 'all') {
                        return locationShifts.map(shift => {
                          const user = users?.find(u => u.id === shift.user_id);
                          const position = positions?.find(p => p.id === shift.position_id);
                          const { start: startTime, end: endTime } = getEffectiveTimes(shift);

                          return (
                            <div
                              key={shift.id}
                              className="border rounded-md p-3 shadow-sm"
                              style={{ borderLeftWidth: '4px', borderLeftColor: getLocationColor(location.id) }}
                            >
                              <div className="text-sm font-semibold text-gray-900">{location.name}</div>
                              <div className="text-xs text-gray-600">
                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user?.first_name} {user?.last_name}
                              </div>
                              <div className="text-xs text-gray-500">{position?.name}</div>
                            </div>
                          );
                        });
                      }

                      return (
                        <div key={`location-group-${location.id}`} className="space-y-2">
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: getLocationColor(location.id) }}
                            />
                            {location.name}
                          </div>
                          {locationShifts.map(shift => {
                            const user = users?.find(u => u.id === shift.user_id);
                            const position = positions?.find(p => p.id === shift.position_id);
                            const { start: startTime, end: endTime } = getEffectiveTimes(shift);

                            return (
                              <div key={shift.id} className="border rounded-md p-3 shadow-sm">
                                <div className="text-xs text-gray-600">
                                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {user?.first_name} {user?.last_name}
                                </div>
                                <div className="text-xs text-gray-500">{position?.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
              </div>
            </div>
          ))}
          </div>

          {(authUser?.role !== 'tutor' || authUser) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Availability Calendar</h3>
              <p className="mt-1 text-sm text-gray-500">
                {authUser?.role === 'tutor'
                  ? 'Your saved availability for the week.'
                  : 'Drag a tutor from their available day into the schedule above.'}
              </p>
              <div className="mt-4 overflow-x-auto">
                <div
                  className="grid min-w-[900px]"
                  style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(140px, 1fr))` }}
                >
                  <div className="sticky left-0 z-10 bg-gray-50 border-b border-r px-4 py-2 text-sm font-semibold text-gray-700">
                    Tutor
                  </div>
                  {days.map(day => (
                    <div key={format(day, 'yyyy-MM-dd')} className="border-b px-2 py-2 text-xs text-gray-500 text-center bg-gray-50">
                      {format(day, 'EEE MMM d')}
                    </div>
                  ))}

                  {(users ?? [])
                    .filter(listUser => authUser?.role !== 'tutor' || listUser.id === authUser.id)
                    .map(listUser => (
                    <div key={listUser.id} className="contents">
                      <div className="sticky left-0 z-10 bg-white border-b border-r px-4 py-3 text-sm font-medium text-gray-900">
                        {listUser.first_name} {listUser.last_name}
                      </div>
                      {days.map(day => {
                        const dayOfWeek = day.getDay() === 0 ? 7 : day.getDay();
                        const dayAvailability = availabilityEvents.filter(
                          event =>
                            event.user_id === listUser.id &&
                            event.day_of_week === dayOfWeek &&
                            event.preference === 'available' &&
                            !hasApprovedTimeOff(listUser.id, day)
                        );

                        return (
                          <div key={`${listUser.id}-${format(day, 'yyyy-MM-dd')}`} className="border-b border-r px-2 py-3">
                            {dayAvailability.length === 0 && (
                              <div className="text-xs text-gray-300">—</div>
                            )}
                            {dayAvailability.map((availability, index) => (
                              <div
                                key={`${listUser.id}-${dayOfWeek}-${index}`}
                                draggable={authUser?.role !== 'tutor'}
                                onDragStart={
                                  authUser?.role !== 'tutor'
                                    ? event =>
                                        handleDragStart(event, {
                                          user_id: listUser.id,
                                          start_time: availability.start_time,
                                          end_time: availability.end_time,
                                        })
                                    : undefined
                                }
                                className={`mb-2 select-none rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ${
                                  authUser?.role !== 'tutor' ? 'cursor-grab hover:bg-gray-200' : 'cursor-default opacity-80'
                                }`}
                              >
                                {availability.start_time} - {availability.end_time}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'day' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {days.map((day, idx) => (
              <button
                key={format(day, 'yyyy-MM-dd')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${idx === selectedDayIndex ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600'}`}
                onClick={() => setSelectedDayIndex(idx)}
              >
                {format(day, 'EEE MMM d')}
              </button>
            ))}
            {authUser?.role !== 'tutor' && (
              <button
                className="ml-auto rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700"
                onClick={() => openQuickAdd()}
              >
                Quick add
              </button>
            )}
          </div>

          <div
            className="overflow-x-auto border rounded-lg bg-white"
            onDragOver={event => event.preventDefault()}
            onDrop={event => handleDropOnDay(event, selectedDay)}
            onContextMenu={event => {
              if (authUser?.role === 'tutor') {
                return;
              }
              event.preventDefault();
              openQuickAdd();
            }}
          >
            <div
              ref={dayGridRef}
              className="grid min-w-[900px]"
              style={{
                gridTemplateColumns: `220px repeat(${slots.length}, minmax(60px, 1fr))`,
                gridTemplateRows: `auto repeat(${Math.max(tutorsWithShifts.length, 1)}, minmax(56px, auto))`,
              }}
            >
              <div className="sticky left-0 z-10 bg-gray-50 border-b border-r px-4 py-2 text-sm font-semibold text-gray-700">
                Tutor
              </div>
              {slots.map((minutesFromMidnight, idx) => {
                const hour = Math.floor(minutesFromMidnight / 60);
                const minutes = minutesFromMidnight % 60;
                const showLabel = minutes === 0;
                return (
                  <div
                    key={`${hour}-${minutes}`}
                    className="border-b px-2 py-2 text-[10px] text-gray-500 text-center bg-gray-50"
                  >
                    {showLabel
                      ? format(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), hour), 'h a')
                      : ''}
                  </div>
                );
              })}

              {tutorsForDay.length === 0 && (
                <div className="col-span-full px-4 py-6 text-sm text-gray-500">
                  No tutor coverage for this day.
                </div>
              )}

              {tutorsForDay.map((tutor, rowIndex) => {
                const userShifts = selectedDayShifts.filter(shift => shift.user_id === tutor.id);
                const mergedShifts = buildMergedShifts(userShifts);
                const gridRow = rowIndex + 2;

                return (
                  <div key={tutor.id} className="contents">
                    <div
                      className="sticky left-0 z-10 bg-white border-b border-r px-4 py-3 text-sm font-medium text-gray-900"
                      style={{ gridRow }}
                    >
                      {tutor.first_name} {tutor.last_name}
                    </div>
                    {slots.map(minutesFromMidnight => (
                      <div
                        key={`${tutor.id}-${minutesFromMidnight}`}
                        className="border-b border-r px-1 py-3"
                        style={{ gridRow }}
                      />
                    ))}
                    {mergedShifts.map((mergedShift, index) => {
                      const startTime = mergedShift.start;
                      const endTime = mergedShift.end;
                      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                      const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
                      const minMinutes = openHour * 60;
                      const maxMinutes = closeHour * 60;
                      const gridStart = Math.max(startMinutes, minMinutes);
                      const gridEnd = Math.min(endMinutes, maxMinutes);
                      const startIdx = Math.floor((gridStart - minMinutes) / slotMinutes);
                      const endIdx = Math.ceil((gridEnd - minMinutes) / slotMinutes);
                      const locationId = mergedShifts[0]?.shifts[0]?.location_id ?? mergedShift.shifts[0]?.location_id;
                      const locationColor = getLocationColor(locationId);
                      const editableShiftId =
                        mergedShift.shifts.length === 1 ? mergedShift.shifts[0]?.id : undefined;

                      if (endIdx <= startIdx) {
                        return null;
                      }

                      return (
                        <div
                          key={`shift-${tutor.id}-${index}`}
                          style={{
                            gridColumn: `${startIdx + 2} / ${endIdx + 2}`,
                            gridRow,
                          }}
                        >
                          <div
                            className="relative mx-1 my-1 rounded-md px-2 py-2 text-xs font-medium text-white shadow"
                            style={{ backgroundColor: locationColor }}
                            onContextMenu={event => {
                              if (authUser?.role === 'tutor' || !editableShiftId) {
                                return;
                              }
                              event.preventDefault();
                              confirmRemoveShift(editableShiftId);
                            }}
                          >
                            {authUser?.role !== 'tutor' && editableShiftId && (
                              <>
                                <div
                                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-white/20"
                                  onMouseDown={event => {
                                    event.preventDefault();
                                    bodyStyleRef.current = {
                                      userSelect: document.body.style.userSelect,
                                      cursor: document.body.style.cursor,
                                    };
                                    document.body.style.userSelect = 'none';
                                    document.body.style.cursor = 'ew-resize';
                                    dragStateRef.current = {
                                      shiftId: editableShiftId,
                                      edge: 'start',
                                      startX: event.clientX,
                                      lastSteps: 0,
                                    };
                                  }}
                                  title="Drag to adjust start"
                                />
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-white/20"
                                  onMouseDown={event => {
                                    event.preventDefault();
                                    bodyStyleRef.current = {
                                      userSelect: document.body.style.userSelect,
                                      cursor: document.body.style.cursor,
                                    };
                                    document.body.style.userSelect = 'none';
                                    document.body.style.cursor = 'ew-resize';
                                    dragStateRef.current = {
                                      shiftId: editableShiftId,
                                      edge: 'end',
                                      startX: event.clientX,
                                      lastSteps: 0,
                                    };
                                  }}
                                  title="Drag to adjust end"
                                />
                              </>
                            )}
                            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {(authUser?.role !== 'tutor' || authUser) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">
                Availability for {format(selectedDay, 'EEE, MMM d')}
              </h3>
              <div className="mt-3 space-y-3">
                {(users ?? [])
                  .filter(listUser => authUser?.role !== 'tutor' || listUser.id === authUser.id)
                  .map(listUser => {
                  const dayOfWeek = selectedDay.getDay() === 0 ? 7 : selectedDay.getDay();
                  const userAvailability = availabilityEvents.filter(
                    event =>
                      event.user_id === listUser.id &&
                      event.day_of_week === dayOfWeek &&
                      event.preference === 'available' &&
                      !hasApprovedTimeOff(listUser.id, selectedDay)
                  );

                  if (userAvailability.length === 0) {
                    return null;
                  }

                  return (
                    <div key={`availability-${listUser.id}`} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {listUser.first_name} {listUser.last_name}
                      </span>
                      {userAvailability.map((availability, index) => (
                        <button
                          type="button"
                          key={`${listUser.id}-availability-${index}`}
                          draggable={authUser?.role !== 'tutor'}
                          onDragStart={
                            authUser?.role !== 'tutor'
                              ? event =>
                                  handleDragStart(event, {
                                    user_id: listUser.id,
                                    start_time: availability.start_time,
                                    end_time: availability.end_time,
                                  })
                              : undefined
                          }
                          onClick={
                            authUser?.role !== 'tutor'
                              ? () => openQuickAdd(listUser.id, availability.start_time, availability.end_time)
                              : undefined
                          }
                          className={`rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ${authUser?.role !== 'tutor' ? 'hover:bg-gray-200' : 'cursor-default opacity-80'}`}
                        >
                          {availability.start_time} - {availability.end_time}
                        </button>
                      ))}
                    </div>
                  );
                })}
                {(users ?? [])
                  .filter(listUser => authUser?.role !== 'tutor' || listUser.id === authUser.id)
                  .every(listUser => {
                  const dayOfWeek = selectedDay.getDay() === 0 ? 7 : selectedDay.getDay();
                  return availabilityEvents.every(
                    event =>
                      event.user_id !== listUser.id ||
                      event.day_of_week !== dayOfWeek ||
                      event.preference !== 'available'
                  );
                }) && (
                  <p className="text-sm text-gray-500">No availability saved for this day.</p>
                )}
              </div>
            </div>
          )}

          {quickAddOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900">Quick add shift</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {format(selectedDay, 'EEE, MMM d')}
                </p>
                <div className="mt-4 space-y-3">
                  <label className="text-sm font-medium text-gray-600">
                    Tutor
                    <select
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                      value={quickAddUserId}
                      onChange={event => setQuickAddUserId(event.target.value)}
                    >
                      <option value="">Select tutor</option>
                      {users?.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {user?.role !== 'tutor' && (
                    <label className="text-sm font-medium text-gray-600">
                      Location
                      <select
                        className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={quickAddLocationId}
                        onChange={event => setQuickAddLocationId(event.target.value)}
                      >
                        <option value="auto">Auto (tutor default)</option>
                        {(locations ?? []).map(location => (
                          <option key={location.id} value={String(location.id)}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-gray-600">
                      Start time
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={quickAddStart}
                        onChange={event => setQuickAddStart(event.target.value)}
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-600">
                      End time
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={quickAddEnd}
                        onChange={event => setQuickAddEnd(event.target.value)}
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600"
                    onClick={closeQuickAdd}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                    onClick={handleQuickAdd}
                  >
                    Add shift
                  </button>
                </div>
              </div>
            </div>
          )}
          {dropModalOpen && dropPayload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900">Select location</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {format(dropPayload.day, 'EEE, MMM d')} · {dropPayload.start_time} - {dropPayload.end_time}
                </p>
                <div className="mt-4 space-y-3">
                  <label className="text-sm font-medium text-gray-600">
                    Location
                    <select
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                      value={dropLocationId}
                      onChange={event => setDropLocationId(event.target.value)}
                      disabled={user?.role === 'tutor'}
                    >
                      <option value="auto">Auto (tutor default)</option>
                      {(locations ?? []).map(location => (
                        <option key={location.id} value={String(location.id)}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600"
                    onClick={closeDropModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                    onClick={confirmDrop}
                  >
                    Add shift
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
