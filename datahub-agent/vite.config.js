import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // No root or outDir override needed if your files are in the repository root
})

By removing the custom `root` and `outDir`, Vite will correctly find `index.html` in your main folder and create a `dist` folder right next to it, which the updated Canvas workflow will then pick up and deploy.
