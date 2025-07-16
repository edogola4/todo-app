import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    fs: {
      allow: [
        // Allow serving files from the project root and node_modules
        resolve(__dirname),
        resolve(__dirname, 'node_modules'),
        // Add the specific path that was causing issues
        resolve(__dirname, '..', 'devexpress-angular-todo-app', 'node_modules'),
        // Allow access to common Angular CLI cache directories
        resolve(__dirname, '.angular'),
        resolve(__dirname, 'dist'),
        resolve(__dirname, 'src'),
      ]
    }
  },
  optimizeDeps: {
    include: [
      '@ckeditor/ckeditor5-build-classic',
      '@ckeditor/ckeditor5-angular'
    ]
  }
});