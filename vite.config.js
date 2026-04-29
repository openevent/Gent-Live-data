import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api/gent is rewritten directly to data.stad.gent so `npm run dev`
// works without Vercel. In production (Vercel) the api/gent.js edge function
// handles the same path -- keep the two in sync.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/gent': {
        target: 'https://data.stad.gent',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://x')
          // Catalog-search mode: /api/gent?catalog=1&q=foo
          if (url.searchParams.get('catalog')) {
            const q = url.searchParams.get('q') || ''
            const where = encodeURIComponent('search("' + q + '")')
            return '/api/explore/v2.1/catalog/datasets?limit=20&where=' + where + '&select=dataset_id,metas'
          }
          // Records mode: /api/gent?dataset=<slug>&...
          const dataset = url.searchParams.get('dataset')
          url.searchParams.delete('dataset')
          url.searchParams.delete('catalog')
          const qs = url.searchParams.toString()
          return '/api/explore/v2.1/catalog/datasets/' + dataset + '/records' + (qs ? '?' + qs : '')
        },
      },
    },
  },
})
