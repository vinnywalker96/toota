import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      splitVendorChunkPlugin(),
      isProduction && visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html'
      })
    ].filter(Boolean),
    
    build: {
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@headlessui/react', '@heroicons/react', 'framer-motion', 'tailwindcss'],
            'form-vendor': ['formik', 'yup'],
            'date-vendor': ['date-fns', 'react-datepicker', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/interaction'],
            'map-vendor': ['@react-google-maps/api', 'leaflet'],
            'chart-vendor': ['recharts'],
            'websocket-vendor': ['react-use-websocket', 'socket.io-client', 'websocket']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    
    optimizeDeps: {
      exclude: ['jsonwebtoken']
    },
    
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true
      }
    }
  };
});
