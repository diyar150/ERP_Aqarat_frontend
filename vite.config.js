import { defineConfig } from 'vite'
import path from "path"
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'favicon.png',
                'icons/pwa-192.png',
                'icons/pwa-512.png',
                'icons/apple-touch-icon.png',
                'offline.html',
            ],
            manifest: {
                id: '/',
                name: 'Hiload System',
                short_name: 'Hiload',
                description: 'Admin dashboard — expenses, currencies, and users',
                theme_color: '#2563EB',
                background_color: '#0A0A0A',
                display: 'standalone',
                display_override: ['standalone', 'minimal-ui'],
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/admin/dashboard?source=pwa',
                lang: 'en',
                dir: 'auto',
                categories: ['business', 'finance', 'productivity'],
                icons: [
                    {
                        src: '/icons/pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                // Single SPA bundle exceeds Workbox's 2 MiB default
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,ttf,otf}'],
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => request.destination === 'image',
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'images',
                            expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 7 },
                        },
                    },
                    {
                        urlPattern: ({ request }) =>
                            request.destination === 'font' || request.destination === 'style',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'static-assets',
                            expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 30 },
                        },
                    },
                ],
            },
            // Keep SW off in `vite` so hot reload stays simple; use preview/prod to test install.
            devOptions: {
                enabled: false,
            },
        }),
    ],
    resolve: {
        // Keep a single React identity for hooks used by prebundled deps (@dnd-kit, etc.).
        dedupe: ['react', 'react-dom'],
        alias: {
            "@": path.resolve("./src"),
            buffer: 'buffer/',
            react: path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
        },
    },
    optimizeDeps: {
        // Vite 8/Rolldown can inline CJS react into @dnd-kit chunks, which breaks hooks
        // (Cannot read properties of null (reading 'useMemo')). Serve dnd-kit as ESM so
        // it imports the shared react entry instead.
        exclude: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        include: ['react', 'react-dom', 'react-dom/client'],
    },
    define: {
        global: 'globalThis',
    },
    assetsInclude: ['**/*.ttf', '**/*.otf', '**/*.woff', '**/*.woff2'],
})
