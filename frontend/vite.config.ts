import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // three-globe (used by react-globe.gl) requires three/webgpu + three/tsl
      // which only exist in three r163+. Point them at globe.gl's own three build.
      "three/webgpu": path.resolve(__dirname, "node_modules/globe.gl/node_modules/three/build/three.webgpu.js"),
      "three/tsl":    path.resolve(__dirname, "node_modules/globe.gl/node_modules/three/build/three.tsl.js"),
    },
  },
}));
