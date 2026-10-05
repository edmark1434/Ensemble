import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// /assets is both the marketplace page and Vite's build output folder.
// A document request for the folder itself is EISDIR, so serve the app instead.
function rewriteMarketplaceDocument(req: { url?: string }, _res: unknown, next: () => void) {
  const raw = req.url || ''
  const queryIndex = raw.indexOf('?')
  const pathname = queryIndex === -1 ? raw : raw.slice(0, queryIndex)
  if (pathname === '/assets' || pathname === '/assets/') {
    const search = queryIndex === -1 ? '' : raw.slice(queryIndex)
    req.url = `/index.html${search}`
  }
  next()
}

function marketplaceSpaFallback(): Plugin {
  return {
    name: 'marketplace-spa-fallback',
    configureServer(server) {
      server.middlewares.use(rewriteMarketplaceDocument)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteMarketplaceDocument)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
  plugins: [
    marketplaceSpaFallback(),
    react(),
    tailwindcss()
  
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
