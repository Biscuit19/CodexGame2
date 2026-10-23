import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: {
      input: { game: "index.html", mixer: "audio-mixer/index.html" },
      output: { manualChunks: { phaser: ["phaser"], three: ["three"] } },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5173 },
});
