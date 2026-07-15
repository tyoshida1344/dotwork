import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // `~` = src ルート。深い相対パス（../../）を避けてルート基準で import する。
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
