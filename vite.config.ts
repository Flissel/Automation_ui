import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Vite configuration for the frontend development server
// Note: Keep config minimal and consistent with other agents' standards
export default defineConfig(() => ({
  plugins: [react(), componentTagger()],
  server: {
    host: "0.0.0.0", // Allow LAN access; Windows compatible
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Support '@/xyz' imports
    },
  },
}));

