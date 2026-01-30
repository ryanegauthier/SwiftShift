import { useEffect, useState } from 'react';
import { useShifts, useUsers, useLocations, usePositions } from '../hooks/useScheduleData';
import { useAvailabilityEvents } from '../hooks/useAvailabilityEvents';
import { useTimeOffRequests } from '../hooks/useTimeOffRequests';
import { useAuth } from '../hooks/useAuth';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import type { Shift } from '../types';

const locationColors = [
  '#2563eb',
  '#16a34a',
  '#f97316',
  '#0ea5e9',
  '#a855f7',
];

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
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: shifts, isLoading: shiftsLoading } = useShifts(weekStart, weekEnd);
  const { data: users } = useUsers();
  const { data: locations } = useLocations();
  const { data: positions } = usePositions();
  const { events: availabilityEvents } = useAvailabilityEvents();
  const { requests: timeOffRequests } = useTimeOffRequests();
  const { user } = useAuth();

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

  const safeShifts = shifts ?? [];
  const allShifts = [...safeShifts, ...draftShifts];
  const currentUserId = user?.role === 'tutor' ? user.id : undefined;
  const ignoreLocationFilterForTutor =
    user?.role === 'tutor' && scheduleScope === 'user';
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
    if (!user || user.role !== 'tutor' || scheduleScope !== 'location') {
      return;
    }

    if (view === 'week') {
      setScheduleScope('user');
      return;
    }

    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    const userShift = allShifts.find(
      shift =>
        shift.user_id === user.id &&
        format(new Date(shift.start_time), 'yyyy-MM-dd') === dayKey
    );
    const fallbackLocationId =
      users?.find(u => u.id === user.id)?.locations[0] ?? locations?.[0]?.id;
    const nextLocationId = userShift?.location_id ?? fallbackLocationId;

    if (nextLocationId && String(nextLocationId) !== selectedLocationId) {
      setSelectedLocationId(String(nextLocationId));
    }
  }, [user, scheduleScope, selectedDay, allShifts, users, locations, selectedLocationId]);

  const openHour = 14;
  const closeHour = selectedDay.getDay() === 5 ? 18 : 19;
  const hours = Array.from({ length: closeHour - openHour }, (_, idx) => openHour + idx);

  const tutorsWithShifts = (users ?? []).filter(user =>
    selectedDayShifts.some(shift => shift.user_id === user.id)
  );

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
    event: React.DragEvent<HTMLDivElement>,
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
    const user = users.find(u => u.id === payload.user_id);
    if (!user) {
      return;
    }
    const locationId = user.locations[0] ?? locations?.[0]?.id ?? 1;
    const positionId = user.positions[0] ?? positions?.[0]?.id ?? 1;
    const start = parseTimeForDay(day, payload.start_time);
    const end = parseTimeForDay(day, payload.end_time);
    if (end <= start) {
      end.setHours(start.getHours() + 1);
    }

    setDraftShifts(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        user_id: payload.user_id,
        location_id: locationId,
        position_id: positionId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: 'Added from availability',
        published: false,
      },
      ...prev,
    ]);
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
    const locationId = user.locations[0] ?? locations?.[0]?.id ?? 1;
    const positionId = user.positions[0] ?? positions?.[0]?.id ?? 1;
    const start = parseTimeForDay(selectedDay, quickAddStart);
    const end = parseTimeForDay(selectedDay, quickAddEnd);

    if (end <= start) {
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

  const getLocationColor = (locationId?: number) => {
    if (!locationId) {
      return '#4b5563';
    }
    return locationColors[(locationId - 1) % locationColors.length];
  };

  const buildMergedShifts = (userShifts: typeof selectedDayShifts) => {
    const sorted = [...userShifts].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const merged: Array<{
      start: Date;
      end: Date;
      shifts: typeof userShifts;
    }> = [];

    sorted.forEach(shift => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const last = merged[merged.length - 1];

      if (!last || start > last.end) {
        merged.push({ start, end, shifts: [shift] });
        return;
      }

      if (end > last.end) {
        last.end = end;
      }
      last.shifts.push(shift);
    });

    return merged;
  };

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
            {(user?.role !== 'tutor' || view !== 'week') && (
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
              disabled={user?.role === 'tutor'}
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
                              {mergedShift.shifts.length > 1 && (
                                <span className="ml-1 text-[10px] text-gray-500">
                                  ({mergedShift.shifts.length} sessions)
                                </span>
                              )}
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
                    .flatMap(location => {
                      const locationShifts = dayShifts.filter(shift => shift.location_id === location.id);
                      return locationShifts.map(shift => {
                        const user = users?.find(u => u.id === shift.user_id);
                        const position = positions?.find(p => p.id === shift.position_id);
                        const startTime = new Date(shift.start_time);
                        const endTime = new Date(shift.end_time);

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
                    })}
              </div>
            </div>
          ))}
          </div>

          {(user?.role !== 'tutor' || user) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Availability Calendar</h3>
              <p className="mt-1 text-sm text-gray-500">
                {user?.role === 'tutor'
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
                    .filter(listUser => user?.role !== 'tutor' || listUser.id === user.id)
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
                                draggable={user?.role !== 'tutor'}
                                onDragStart={
                                  user?.role !== 'tutor'
                                    ? event =>
                                        handleDragStart(event, {
                                          user_id: listUser.id,
                                          start_time: availability.start_time,
                                          end_time: availability.end_time,
                                        })
                                    : undefined
                                }
                                className={`mb-2 select-none rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ${
                                  user?.role !== 'tutor' ? 'cursor-grab hover:bg-gray-200' : 'cursor-default opacity-80'
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
            {user?.role !== 'tutor' && (
              <button
                className="ml-auto rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700"
                onClick={() => openQuickAdd()}
              >
                Quick add
              </button>
            )}
          </div>

          {(user?.role !== 'tutor' || user) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">
                Availability for {format(selectedDay, 'EEE, MMM d')}
              </h3>
              <div className="mt-3 space-y-3">
                {(users ?? [])
                  .filter(listUser => user?.role !== 'tutor' || listUser.id === user.id)
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
                          draggable={user?.role !== 'tutor'}
                          onDragStart={
                            user?.role !== 'tutor'
                              ? event =>
                                  handleDragStart(event, {
                                    user_id: listUser.id,
                                    start_time: availability.start_time,
                                    end_time: availability.end_time,
                                  })
                              : undefined
                          }
                          onClick={
                            user?.role !== 'tutor'
                              ? () => openQuickAdd(listUser.id, availability.start_time, availability.end_time)
                              : undefined
                          }
                          className={`rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ${user?.role !== 'tutor' ? 'hover:bg-gray-200' : 'cursor-default opacity-80'}`}
                        >
                          {availability.start_time} - {availability.end_time}
                        </button>
                      ))}
                    </div>
                  );
                })}
                {(users ?? [])
                  .filter(listUser => user?.role !== 'tutor' || listUser.id === user.id)
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

          <div
            className="overflow-x-auto border rounded-lg bg-white"
            onDragOver={event => event.preventDefault()}
            onDrop={event => handleDropOnDay(event, selectedDay)}
            onContextMenu={event => {
              if (user?.role === 'tutor') {
                return;
              }
              event.preventDefault();
              openQuickAdd();
            }}
          >
            <div
              className="grid min-w-[900px]"
              style={{
                gridTemplateColumns: `220px repeat(${hours.length}, minmax(80px, 1fr))`,
                gridTemplateRows: `auto repeat(${Math.max(tutorsWithShifts.length, 1)}, minmax(56px, auto))`,
              }}
            >
              <div className="sticky left-0 z-10 bg-gray-50 border-b border-r px-4 py-2 text-sm font-semibold text-gray-700">
                Tutor
              </div>
              {hours.map(hour => (
                <div key={hour} className="border-b px-2 py-2 text-xs text-gray-500 text-center bg-gray-50">
                  {format(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), hour), 'h a')}
                </div>
              ))}

              {tutorsWithShifts.length === 0 && (
                <div className="col-span-full px-4 py-6 text-sm text-gray-500">
                  No tutor coverage for this day.
                </div>
              )}

              {tutorsWithShifts.map((user, rowIndex) => {
                const userShifts = selectedDayShifts.filter(shift => shift.user_id === user.id);
                const mergedShifts = buildMergedShifts(userShifts);
                const gridRow = rowIndex + 2;

                return (
                  <div key={user.id} className="contents">
                    <div
                      className="sticky left-0 z-10 bg-white border-b border-r px-4 py-3 text-sm font-medium text-gray-900"
                      style={{ gridRow }}
                    >
                      {user.first_name} {user.last_name}
                    </div>
                    {hours.map(hour => (
                      <div
                        key={`${user.id}-${hour}`}
                        className="border-b border-r px-1 py-3"
                        style={{ gridRow }}
                      />
                    ))}
                    {mergedShifts.map((mergedShift, index) => {
                      const startTime = mergedShift.start;
                      const endTime = mergedShift.end;
                      const startHour = startTime.getHours();
                      const endHour = endTime.getHours();
                      const gridStart = Math.max(startHour, openHour);
                      const gridEnd = Math.min(endHour, closeHour);
                      const startIdx = gridStart - openHour;
                      const endIdx = gridEnd - openHour;
                      const locationColor = getLocationColor(mergedShift.shifts[0]?.location_id);

                      if (endIdx <= startIdx) {
                        return null;
                      }

                      return (
                        <div
                          key={`shift-${user.id}-${index}`}
                          style={{
                            gridColumn: `${startIdx + 2} / ${endIdx + 2}`,
                            gridRow,
                          }}
                        >
                          <div
                            className="mx-1 my-1 rounded-md px-2 py-2 text-xs font-medium text-white shadow"
                            style={{ backgroundColor: locationColor }}
                          >
                            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                            {mergedShift.shifts.length > 1 && (
                              <span className="ml-1 text-[10px] font-normal text-white/90">
                                ({mergedShift.shifts.length} sessions)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
};
