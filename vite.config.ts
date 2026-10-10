import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

// Helper to parse key-value lines from backend/auth.env
function loadCustomEnv(filePath: string) {
  const env: Record<string, string> = {}
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
      }
    }
  }
  return env
}

const authEnv = loadCustomEnv(path.resolve(process.cwd(), 'backend/auth.env'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(authEnv.VITE_SUPABASE_URL || 'https://cdxprtdjuplpgacohljj.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(authEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nmTOqgCVeJ0KlAeK25OU5w_SKQ6vQIt'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(authEnv.VITE_SUPABASE_ANON_KEY || authEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_nmTOqgCVeJ0KlAeK25OU5w_SKQ6vQIt'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
})


