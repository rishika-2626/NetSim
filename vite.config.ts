import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  base: "./", // ✅ IMPORTANT for Render

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});