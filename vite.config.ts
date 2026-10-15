import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5173 },
});
