import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDisableHmr = process.env.DISABLE_HMR === 'true';
    return {
      base: process.env.ELECTRON_BUILD === 'true' ? './' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: isDisableHmr ? false : undefined,
      },
      plugins: [
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: [
            'logo-sa-diary.png',
            'logo-sa-diary-192.png',
            'logo-sa-diary-512.png',
            'logo-sa-diary-maskable-192.png',
            'logo-sa-diary-maskable-512.png',
            'screenshot_mobile.jpg',
            'screenshot_desktop.jpg'
          ],
          manifest: {
            id: '/',
            name: 'SA Diary & Movement Tracker',
            short_name: 'SA Diary',
            description: 'Professional tool to generate structured fortnightly work diaries and transport route logs.',
            theme_color: '#2563eb',
            background_color: '#f8fafc',
            display: 'standalone',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/logo-sa-diary-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/logo-sa-diary-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/logo-sa-diary-maskable-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: '/logo-sa-diary-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
            globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: false
          }
        })
      ],
      build: {
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              docx: ['docx'],
              icons: ['lucide-react']
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
