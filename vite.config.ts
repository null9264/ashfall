import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 前端只产出静态资源，部署到 Cloudflare Pages。
// API 由同站的 /functions 后端处理，前端用绝对路径 /api/* 调用。
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
