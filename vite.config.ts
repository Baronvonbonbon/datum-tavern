import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  optimizeDeps: {
    // pine-rpc ships smoldot WASM — exclude from pre-bundling
    exclude: ["pine-rpc", "smoldot"],
  },
  server: {
    port: 5174,
  },
});
