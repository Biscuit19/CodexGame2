import { tuningPlugin } from "./scripts/tuning-plugin.mjs";
import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  plugins: [tuningPlugin()],
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        game: "index.html",
        mixer: "audio-mixer/index.html",
        workbench: "game-workbench/index.html",
      },
      output: { manualChunks: { phaser: ["phaser"], three: ["three"] } },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5173 },
});
