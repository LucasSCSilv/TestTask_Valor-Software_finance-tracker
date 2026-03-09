import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { withZephyr } from 'vite-plugin-zephyr'
import { federation } from '@module-federation/vite'

const mfConfig = {
  name: 'finance_tracker_reports',
  filename: 'remoteEntry.js',
  exposes: {
    './Reports': './src/Reports.jsx',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
  },
}

export default defineConfig({
  plugins: [
    react(),
    federation(mfConfig),
    withZephyr(),
  ],
  build: {
    target: 'chrome89',
    minify: false,
  },
  server: {
    port: 5174,
    origin: 'http://localhost:5174',
  },
})