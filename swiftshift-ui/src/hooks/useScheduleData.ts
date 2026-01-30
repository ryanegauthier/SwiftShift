import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: api.getLocations,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const usePositions = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: api.getPositions,
    staleTime: 1000 * 60 * 60,
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useShifts = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['shifts', startDate, endDate],
    queryFn: () => api.getShifts(startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
