import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // already providing manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/rpc\/submit_exam_result/,
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'exam-sync-queue',
                options: {
                  maxRetentionTime: 24 * 60, // Retry for up to 24 Hours
                },
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules', 'tests/journeys.spec.ts'],
  },
  build: {
    // Disable sourcemap to prevent .ts source files from being copied to dist
    // (Vercel serves .ts as video/mp2t MIME type, breaking module loading)
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        // Force .js extension for all output chunks
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('@supabase/supabase-js')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
