import { useState } from 'react';
import type { FormEvent } from 'react';
import { RemoteLoader } from '../components/RemoteLoader';
import { auth, useAuth } from '../store/authStore';

export function App() {
  const user = useAuth((state) => state.user);
  const [name, setName] = useState('');
  const trimmedName = name.trim();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedName) return;
    await auth.login({ name: trimmedName });
    setName('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Streambox Host</h1>

      {!user ? (
        <form className="mt-4" onSubmit={handleLogin}>
          <input
            className="border p-1 mr-2"
            placeholder="Enter name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
            disabled={!trimmedName}
          >
            Login
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <span className="mr-2">Hello, {user.name}!</span>
          <button
            type="button"
            className="bg-red-500 text-white px-3 py-1 rounded"
            onClick={() => auth.logout()}
          >
            Logout
          </button>
        </div>
      )}

      {/* Each remote gets its own error boundary + Suspense, so one remote being
          down or slow doesn't blank out the shell or block the other remote. */}
      <RemoteLoader remote="movies" module="./MoviesApp" />
      <RemoteLoader remote="music" module="./MusicApp" />
    </div>
  );
}

export default App;
