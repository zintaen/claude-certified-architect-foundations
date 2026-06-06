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
            urlPattern: /^https:\/\/[^\/]+/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules', 'tests/e2e.spec.js']
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});
