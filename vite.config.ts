import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * pine-rpc's index re-exports a Node-only `JsonRpcServer` (node:http / node:crypto
 * / ws) that the browser never uses but that rollup tries to bundle, failing on
 * the node builtins. The browser-facing `PineProvider` touches none of them, so
 * we stub the server module out of the bundle entirely.
 */
function stubPineServer(): Plugin {
  const EMPTY = "\0pine-server-stub";
  return {
    name: "stub-pine-server",
    enforce: "pre",
    resolveId(id, importer) {
      // Matches both the bare re-export specifier ("./server/JsonRpcServer.js"
      // from pine-rpc's index) and any already-resolved absolute path.
      if (id.includes("JsonRpcServer") && (importer?.includes("pine-rpc") ?? true)) {
        return EMPTY;
      }
      return null;
    },
    load(id) {
      if (id === EMPTY) return "export class JsonRpcServer {}";
      return null;
    },
  };
}

export default defineConfig({
  plugins: [stubPineServer(), react()],
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
