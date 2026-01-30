import type { AvailabilityEvent } from '../types';

const STORAGE_KEY = 'swiftshift.availabilityEvents';

const normalizeEvent = (event: Partial<AvailabilityEvent> & { availability_date?: string }) => {
  let dayOfWeek = event.day_of_week;

  if (typeof dayOfWeek === 'string') {
    const parsed = Number(dayOfWeek);
    dayOfWeek = Number.isNaN(parsed) ? undefined : parsed;
  }

  if (!dayOfWeek && event.availability_date) {
    const date = new Date(event.availability_date);
    if (!Number.isNaN(date.getTime())) {
      const jsDay = date.getDay();
      dayOfWeek = jsDay === 0 ? 7 : jsDay;
    }
  }

  if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) {
    return null;
  }

  if (!event.user_id || !event.start_time || !event.end_time || !event.preference) {
    return null;
  }

  return {
    id: event.id ?? Date.now(),
    user_id: Number(event.user_id),
    day_of_week: dayOfWeek,
    start_time: event.start_time,
    end_time: event.end_time,
    preference: event.preference,
    notes: event.notes,
  } as AvailabilityEvent;
};

const readAvailabilityEvents = (): AvailabilityEvent[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Array<Partial<AvailabilityEvent> & { availability_date?: string }>;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeEvent)
      .filter((event): event is AvailabilityEvent => Boolean(event));
  } catch {
    return [];
  }
};

const writeAvailabilityEvents = (events: AvailabilityEvent[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event('availability:updated'));
};

export const getAvailabilityEvents = () => readAvailabilityEvents();

export const addAvailabilityEvent = (event: AvailabilityEvent) => {
  const events = readAvailabilityEvents();
  writeAvailabilityEvents([event, ...events]);
};

export const updateAvailabilityEvent = (updated: AvailabilityEvent) => {
  const events = readAvailabilityEvents();
  const next = events.map(event => (event.id === updated.id ? updated : event));
  writeAvailabilityEvents(next);
};

export const deleteAvailabilityEvent = (eventId: number) => {
  const events = readAvailabilityEvents();
  writeAvailabilityEvents(events.filter(event => event.id !== eventId));
};

export const subscribeAvailabilityEvents = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };
  const handleCustom = () => callback();
  window.addEventListener('storage', handleStorage);
  window.addEventListener('availability:updated', handleCustom);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('availability:updated', handleCustom);
  };
};
