import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { zyzz } from 'zyzz/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [zyzz({ reset: true, include: ['src/**'] }), react()],
})
