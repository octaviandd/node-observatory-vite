import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from './node_modules/@tailwindcss/vite/dist/index.mjs';
import tsconfigPaths from "vite-tsconfig-paths";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: "./src/client",
  server: {
    port: 3000,
    hmr: {
      port: 3001,
    },
  },
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/client"),
    },
  },
  define: {
    'process.env': JSON.stringify(process.env),
  },
});
