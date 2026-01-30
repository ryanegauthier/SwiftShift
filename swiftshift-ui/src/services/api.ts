import { mockLocations, mockPositions, mockUsers, mockShifts } from '../data/mockData';
import type { Location, Position, User, Shift } from '../types';

// Toggle this to switch between mock and real API
const USE_MOCK = true;

// Simulate network delay for realistic testing
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  getLocations: async (): Promise<Location[]> => {
    if (USE_MOCK) {
      await delay(300);
      return mockLocations;
    }
    // Real When I Work API call will go here
    const response = await fetch('https://api.wheniwork.com/2/locations', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_WIW_TOKEN}`,
        'W-UserId': import.meta.env.VITE_WIW_USER_ID
      }
    });
    return response.json();
  },

  getPositions: async (): Promise<Position[]> => {
    if (USE_MOCK) {
      await delay(300);
      return mockPositions;
    }
    // Real API later
    const response = await fetch('https://api.wheniwork.com/2/positions', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_WIW_TOKEN}`,
        'W-UserId': import.meta.env.VITE_WIW_USER_ID
      }
    });
    return response.json();
  },

  getUsers: async (): Promise<User[]> => {
    if (USE_MOCK) {
      await delay(400);
      return mockUsers;
    }
    // Real API later
    const response = await fetch('https://api.wheniwork.com/2/users', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_WIW_TOKEN}`,
        'W-UserId': import.meta.env.VITE_WIW_USER_ID
      }
    });
    return response.json();
  },

  getShifts: async (startDate: string, endDate: string): Promise<Shift[]> => {
    if (USE_MOCK) {
      await delay(500);
      // Filter mock shifts by date range
      return mockShifts.filter(shift => {
        const shiftDate = new Date(shift.start_time);
        return shiftDate >= new Date(startDate) && shiftDate <= new Date(endDate);
      });
    }
    // Real API later
    const response = await fetch(
      `https://api.wheniwork.com/2/shifts?start=${startDate}&end=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_WIW_TOKEN}`,
          'W-UserId': import.meta.env.VITE_WIW_USER_ID
        }
      }
    );
    return response.json();
  }
};
