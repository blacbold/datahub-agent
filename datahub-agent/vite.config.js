import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Point Vite to the folder containing index.html
  root: 'datahub-agent/datahub-agent',
  build: {
    // Ensure the build output goes back to the standard dist folder at the repo root
    outDir: '../../dist',
    emptyOutDir: true,
  }
})
