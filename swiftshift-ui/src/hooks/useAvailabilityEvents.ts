import { useEffect, useState } from 'react';
import type { AvailabilityEvent } from '../types';
import {
  addAvailabilityEvent,
  deleteAvailabilityEvent,
  getAvailabilityEvents,
  subscribeAvailabilityEvents,
  updateAvailabilityEvent,
} from '../services/availabilityStore';

export const useAvailabilityEvents = () => {
  const [events, setEvents] = useState<AvailabilityEvent[]>(() => getAvailabilityEvents());

  useEffect(() => {
    return subscribeAvailabilityEvents(() => {
      setEvents(getAvailabilityEvents());
    });
  }, []);

  const addEvent = (event: AvailabilityEvent) => {
    addAvailabilityEvent(event);
    setEvents(getAvailabilityEvents());
  };

  const updateEvent = (event: AvailabilityEvent) => {
    updateAvailabilityEvent(event);
    setEvents(getAvailabilityEvents());
  };

  const deleteEvent = (eventId: number) => {
    deleteAvailabilityEvent(eventId);
    setEvents(getAvailabilityEvents());
  };

  return { events, addEvent, updateEvent, deleteEvent };
};
