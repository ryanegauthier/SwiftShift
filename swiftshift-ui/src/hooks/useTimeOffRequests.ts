import { useEffect, useState } from 'react';
import type { TimeOffRequest } from '../types';
import {
  addTimeOffRequest,
  deleteTimeOffRequest,
  getTimeOffRequests,
  subscribeTimeOffRequests,
  updateTimeOffRequest,
} from '../services/timeOffStore';

export const useTimeOffRequests = () => {
  const [requests, setRequests] = useState<TimeOffRequest[]>(() => getTimeOffRequests());

  useEffect(() => {
    return subscribeTimeOffRequests(() => {
      setRequests(getTimeOffRequests());
    });
  }, []);

  const addRequest = (request: TimeOffRequest) => {
    addTimeOffRequest(request);
    setRequests(getTimeOffRequests());
  };

  const updateRequest = (request: TimeOffRequest) => {
    updateTimeOffRequest(request);
    setRequests(getTimeOffRequests());
  };

  const deleteRequest = (requestId: number) => {
    deleteTimeOffRequest(requestId);
    setRequests(getTimeOffRequests());
  };

  return { requests, addRequest, updateRequest, deleteRequest };
};
