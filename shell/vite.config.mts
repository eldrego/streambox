/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig(() => ({
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
        useAuthStore: './src/store/useAuthStore.ts',
      },
      remotes: {
        music: 'http://localhost:4201/assets/remoteEntry.js',
        movies: 'http://localhost:4202/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
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
}));
