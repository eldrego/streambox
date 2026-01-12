import React, { useState, Suspense, lazy } from 'react';
import { RemoteLoader } from '../components/RemoteLoader';
import { useAuthStore } from '../store/useAuthStore.ts';

const Movies = lazy(() => import('movies/MoviesApp'));
const Music = lazy(() => import('music/MusicApp'));

export function App() {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const [name, setName] = useState('');

  console.log({ user, login, logout });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Streambox Host</h1>

      {!user ? (
        <div className="mt-4">
          <input
            className="border p-1 mr-2"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded"
            onClick={() => login(name)}
          >
            Login
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <span className="mr-2">Hello, {user.name}!</span>
          <button
            className="bg-red-500 text-white px-3 py-1 rounded"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}

      <Suspense fallback={<div>Loading remote…</div>}>
        <Movies />
        <Music />
      </Suspense>
    </div>
  );
}

export default App;
