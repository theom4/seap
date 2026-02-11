import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'image-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy-image', async (req, res) => {
          try {
            const url = new URL(req.url || '', 'http://localhost').searchParams.get('url')
            if (!url) {
              res.statusCode = 400
              res.end('Missing url parameter')
              return
            }

            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*',
              },
            })

            if (!response.ok) {
              res.statusCode = response.status
              res.end(`Failed to fetch: ${response.statusText}`)
              return
            }

            const contentType = response.headers.get('content-type') || 'image/jpeg'
            const buffer = Buffer.from(await response.arrayBuffer())

            res.setHeader('Content-Type', contentType)
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buffer)
          } catch (error: any) {
            console.error('[proxy-image] Error:', error.message)
            res.statusCode = 500
            res.end(`Proxy error: ${error.message}`)
          }
        })
      },
    },
  ],
})