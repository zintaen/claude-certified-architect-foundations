import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/cyberskill-logo.svg', 'assets/styles.css'],
      manifest: false, // already providing manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
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
      },
    },
  },
});
