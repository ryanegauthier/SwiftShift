import { useState } from 'react';
import { format } from 'date-fns';
import { TimePickerPopover } from './TimePickerPopover';
import { useUsers } from '../hooks/useScheduleData';
import { useTimeOffRequests } from '../hooks/useTimeOffRequests';
import type { TimeOffRequest, TimeOffType } from '../types';

const timeOffTypes: Array<{ value: TimeOffType; label: string }> = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'PTO' },
  { value: 'sick', label: 'Sick' },
  { value: 'holiday', label: 'Holiday' },
];

const defaultFormState = {
  user_id: '',
  type: 'unpaid' as TimeOffType,
  start_date: '',
  end_date: '',
  all_day: true,
  start_time: '09:00',
  end_time: '17:00',
  notes: '',
};

export const TimeOffManager = () => {
  const { data: users } = useUsers();
  const { requests, addRequest, updateRequest, deleteRequest } = useTimeOffRequests();
  const [formState, setFormState] = useState(defaultFormState);
  const [editingId, setEditingId] = useState<number | null>(null);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingId(null);
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.user_id || !formState.start_date || !formState.end_date) {
      return;
    }

    if (editingId !== null) {
      updateRequest({
        id: editingId,
        user_id: Number(formState.user_id),
        type: formState.type,
        start_date: formState.start_date,
        end_date: formState.end_date,
        all_day: formState.all_day,
        start_time: formState.start_time,
        end_time: formState.end_time,
        status: requests.find(request => request.id === editingId)?.status ?? 'pending',
        notes: formState.notes,
      });
      resetForm();
      return;
    }

    const newRequest: TimeOffRequest = {
      id: Date.now(),
      user_id: Number(formState.user_id),
      type: formState.type,
      start_date: formState.start_date,
      end_date: formState.end_date,
      all_day: formState.all_day,
      start_time: formState.start_time,
      end_time: formState.end_time,
      status: 'pending',
      notes: formState.notes || undefined,
    };

    addRequest(newRequest);
    resetForm();
  };

  const handleEdit = (request: TimeOffRequest) => {
    setEditingId(request.id);
    setFormState({
      user_id: String(request.user_id),
      type: request.type,
      start_date: request.start_date,
      end_date: request.end_date,
      all_day: request.all_day ?? false,
      start_time: request.start_time ?? '09:00',
      end_time: request.end_time ?? '17:00',
      notes: request.notes ?? '',
    });
  };

  const handleDelete = (requestId: number) => {
    deleteRequest(requestId);
    if (editingId === requestId) {
      resetForm();
    }
  };

  const updateStatus = (requestId: number, status: TimeOffRequest['status']) => {
    const target = requests.find(request => request.id === requestId);
    if (!target) {
      return;
    }
    updateRequest({ ...target, status });
  };

  const formatDate = (date: string) => format(new Date(date), 'EEE, MMM d');

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Request Time Off</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-gray-600">
            Tutor
            <select
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.user_id}
              onChange={event => setFormState(prev => ({ ...prev, user_id: event.target.value }))}
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
            Type
            <select
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.type}
              onChange={event => setFormState(prev => ({ ...prev, type: event.target.value as TimeOffType }))}
            >
              {timeOffTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-600">
            Start date
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.start_date}
              onChange={event => setFormState(prev => ({ ...prev, start_date: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm font-medium text-gray-600">
            End date
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={formState.end_date}
              onChange={event => setFormState(prev => ({ ...prev, end_date: event.target.value }))}
              required
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 md:col-span-2">
            <input
              type="checkbox"
              checked={formState.all_day}
              onChange={event => setFormState(prev => ({ ...prev, all_day: event.target.checked }))}
            />
            All day
          </label>

          {!formState.all_day && (
            <div className="md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <TimePickerPopover
                  label="Start time"
                  value={formState.start_time}
                  onChange={value => handleTimeChange('start_time', value)}
                  fallbackValue="09:00"
                />
                <TimePickerPopover
                  label="End time"
                  value={formState.end_time}
                  onChange={value => handleTimeChange('end_time', value)}
                  fallbackValue="17:00"
                />
              </div>
            </div>
          )}

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
              {editingId !== null ? 'Update request' : 'Add request'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Time Off Requests</h3>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No requests submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map(request => {
              const tutor = users?.find(user => user.id === request.user_id);
              const typeLabel = timeOffTypes.find(type => type.value === request.type)?.label ?? request.type;

              return (
                <div key={request.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {tutor?.first_name} {tutor?.last_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)} · {typeLabel}
                        {!request.all_day && request.start_time && request.end_time && (
                          <span className="ml-1 text-[10px] text-gray-500">
                            ({request.start_time} - {request.end_time})
                          </span>
                        )}
                        {request.all_day && (
                          <span className="ml-1 text-[10px] text-gray-500">(All day)</span>
                        )}
                      </div>
                      {request.notes && (
                        <p className="mt-2 text-xs text-gray-500">{request.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 font-medium ${
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : request.status === 'denied'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {request.status}
                      </span>
                      {request.status === 'pending' && (
                        <>
                          <button
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateStatus(request.id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="text-red-500 hover:text-red-600"
                            onClick={() => updateStatus(request.id, 'denied')}
                          >
                            Deny
                          </button>
                        </>
                      )}
                      <button
                        className="text-gray-600 hover:text-gray-900"
                        onClick={() => handleEdit(request)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(request.id)}
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
