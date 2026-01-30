import { useState } from 'react';
import type { AuthUser } from '../types';
import { clearStoredUser, getStoredUser, setStoredUser } from '../services/authStore';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  const login = (nextUser: AuthUser) => {
    setStoredUser(nextUser);
    setUser(nextUser);
  };

  const logout = () => {
    clearStoredUser();
    setUser(null);
  };

  return { user, login, logout };
};
