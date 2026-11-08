import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["three", "react", "react-dom"],
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    hmr: false,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
