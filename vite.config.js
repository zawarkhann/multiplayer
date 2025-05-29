import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Allows access from the network
    port: 5174, // Optional: Specify a custom port (default is 5173)
    strictPort: true,
    // https: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    allowedHosts: [
      'localhost',
      'playcanvas.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud', // Allow the iframe's domain
      'amjad-pod-frontend.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/',
      'multiplayer-events.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud',
      'event.pods.social'
    ],
  },
});
