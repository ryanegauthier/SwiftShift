import { useState } from 'react';
import { mockUsers } from '../data/mockData';
import type { AuthUser } from '../types';

type LoginProps = {
  onLogin: (user: AuthUser) => void;
};

const ADMIN_EMAIL = 'admin@swiftshift.com';
const ADMIN_PASSWORD = 'admin123';
const TUTOR_PASSWORD = 'tutor123';

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      onLogin({
        id: 0,
        name: 'Admin',
        email,
        role: 'admin',
      });
      return;
    }

    const tutor = mockUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (tutor && password === TUTOR_PASSWORD) {
      onLogin({
        id: tutor.id,
        name: `${tutor.first_name} ${tutor.last_name}`,
        email: tutor.email,
        role: 'tutor',
      });
      return;
    }

    setError('Invalid credentials. Try the admin or tutor demo login.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
        <p className="mt-2 text-sm text-gray-500">
          Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}
        </p>
        <p className="text-sm text-gray-500">
          Tutor: use any mock tutor email / {TUTOR_PASSWORD}
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-600">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-600">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};
