import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: 'node_modules/.vite',
  server: {
    host: '0.0.0.0',
    fs: {
      strict: true,
      allow: [process.cwd()]
    }
  },
  preview: {
    host: '0.0.0.0'
  }
});
