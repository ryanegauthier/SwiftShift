import type { TimeOffRequest } from '../types';

const STORAGE_KEY = 'swiftshift.timeOffRequests';

const readTimeOffRequests = (): TimeOffRequest[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as TimeOffRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTimeOffRequests = (requests: TimeOffRequest[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event('timeoff:updated'));
};

export const getTimeOffRequests = () => readTimeOffRequests();

export const addTimeOffRequest = (request: TimeOffRequest) => {
  const requests = readTimeOffRequests();
  writeTimeOffRequests([request, ...requests]);
};

export const updateTimeOffRequest = (updated: TimeOffRequest) => {
  const requests = readTimeOffRequests();
  const next = requests.map(request => (request.id === updated.id ? updated : request));
  writeTimeOffRequests(next);
};

export const deleteTimeOffRequest = (requestId: number) => {
  const requests = readTimeOffRequests();
  writeTimeOffRequests(requests.filter(request => request.id !== requestId));
};

export const subscribeTimeOffRequests = (callback: () => void) => {
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
  window.addEventListener('timeoff:updated', handleCustom);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('timeoff:updated', handleCustom);
  };
};
