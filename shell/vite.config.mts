/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig(({ mode }) => {
  const remoteMusic =
    process.env.VITE_REMOTE_MUSIC_URL ||
    'http://localhost:4201/assets/remoteEntry.js';
  const remoteMovies =
    process.env.VITE_REMOTE_MOVIES_URL ||
    'http://localhost:4202/assets/remoteEntry.js';

  return {
    server: {
      port: 4200,
      host: 'localhost',
      strictPort: true,
    },
    plugins: [
      react(),
      federation({
        name: 'streambox',
        exposes: {
          './auth': './src/store/authStore.ts',
        },
        remotes: {
          music: remoteMusic,
          movies: remoteMovies,
        },
        // Remotes must resolve the same React and zustand instances as the shell,
        // otherwise hooks from `streambox/auth` run against a second React copy.
        shared: {
          react: { requiredVersion: '^19.0.0' },
          'react-dom': { requiredVersion: '^19.0.0' },
          zustand: { requiredVersion: '^5.0.0' },
        },
      }),
    ],
    build: {
      outDir: path.join(__dirname, '../dist'),
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
