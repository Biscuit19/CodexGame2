import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: {
      output: { manualChunks: { phaser: ["phaser"], three: ["three"] } },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5173 },
});
