import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/VoriumDemo/',
  server: {
    port: 5190, // Change this to the port you want
  },
})
