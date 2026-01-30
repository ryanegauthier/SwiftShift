import { useEffect, useState } from 'react';
import { TimePickerPopover } from './TimePickerPopover';
import { useUsers } from '../hooks/useScheduleData';
import { useAvailabilityEvents } from '../hooks/useAvailabilityEvents';
import { useAuth } from '../hooks/useAuth';
import type { AvailabilityEvent, AvailabilityPreference } from '../types';

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];

const availabilityTypes: Array<{ value: AvailabilityPreference; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
];

const getDefaultFormState = (userId?: number) => ({
  user_id: userId ? String(userId) : '',
  day_of_week: '1',
  start_time: '14:00',
  end_time: '18:00',
  preference: 'available' as AvailabilityPreference,
  notes: '',
});

export const AvailabilityManager = () => {
  const { user } = useAuth();
  const { data: users } = useUsers();
  const { events, addEvent, updateEvent, deleteEvent } = useAvailabilityEvents();
  const [formState, setFormState] = useState(() => getDefaultFormState(user?.role === 'tutor' ? user.id : undefined));
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormState(getDefaultFormState(user?.role === 'tutor' ? user.id : undefined));
    setEditingId(null);
  };

  useEffect(() => {
    if (user?.role === 'tutor' && !editingId) {
      setFormState(prev => ({ ...prev, user_id: String(user.id) }));
    }
  }, [user, editingId]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.user_id || !formState.start_time || !formState.end_time) {
      return;
    }

    if (editingId !== null) {
      updateEvent({
        id: editingId,
        user_id: Number(formState.user_id),
        day_of_week: Number(formState.day_of_week),
        start_time: formState.start_time,
        end_time: formState.end_time,
        preference: formState.preference,
        notes: formState.notes || undefined,
      });
      resetForm();
      return;
    }

    const newEvent: AvailabilityEvent = {
      id: Date.now(),
      user_id: Number(formState.user_id),
      day_of_week: Number(formState.day_of_week),
      start_time: formState.start_time,
      end_time: formState.end_time,
      preference: formState.preference,
      notes: formState.notes || undefined,
    };

    addEvent(newEvent);
    resetForm();
  };

  const handleEdit = (event: AvailabilityEvent) => {
    setEditingId(event.id);
    setFormState({
      user_id: String(event.user_id),
      day_of_week: String(event.day_of_week),
      start_time: event.start_time,
      end_time: event.end_time,
      preference: event.preference,
      notes: event.notes ?? '',
    });
  };

  const handleDelete = (eventId: number) => {
    deleteEvent(eventId);
    if (editingId === eventId) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Set Availability</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-gray-600">
            Tutor
            <select
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.user_id}
              onChange={event => setFormState(prev => ({ ...prev, user_id: event.target.value }))}
              disabled={user?.role === 'tutor'}
              required
            >
              <option value="">Select tutor</option>
              {users?.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-600">
            Day
            <select
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.day_of_week}
              onChange={event => setFormState(prev => ({ ...prev, day_of_week: event.target.value }))}
            >
              {daysOfWeek.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <TimePickerPopover
                label="Start time"
                value={formState.start_time}
                onChange={value => handleTimeChange('start_time', value)}
                fallbackValue="14:00"
              />
              <TimePickerPopover
                label="End time"
                value={formState.end_time}
                onChange={value => handleTimeChange('end_time', value)}
                fallbackValue="18:00"
              />
            </div>
          </div>

          <label className="text-sm font-medium text-gray-600">
            Preference
            <select
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.preference}
              onChange={event =>
                setFormState(prev => ({ ...prev, preference: event.target.value as AvailabilityPreference }))
              }
            >
              {availabilityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-600 md:col-span-2">
            Notes
            <textarea
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              rows={3}
              value={formState.notes}
              onChange={event => setFormState(prev => ({ ...prev, notes: event.target.value }))}
            />
          </label>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              {editingId !== null ? 'Update availability' : 'Add availability'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Availability Preferences</h3>
        {events.filter(event => !user || user.role === 'admin' || event.user_id === user.id).length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No availability saved yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {events
              .filter(event => !user || user.role === 'admin' || event.user_id === user.id)
              .map(event => {
                const tutor = users?.find(user => user.id === event.user_id);
                const dayLabel = daysOfWeek.find(day => day.value === event.day_of_week)?.label ?? 'Day';
                const preferenceLabel = availabilityTypes.find(type => type.value === event.preference)?.label ?? event.preference;

                return (
                  <div key={event.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {tutor?.first_name} {tutor?.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {dayLabel} · {event.start_time} - {event.end_time} · {preferenceLabel}
                        </div>
                        {event.notes && (
                          <p className="mt-2 text-xs text-gray-500">{event.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          onClick={() => handleEdit(event)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(event.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
