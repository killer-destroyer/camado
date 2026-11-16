import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      outDir: "out/main",
      rollupOptions: { input: resolve("desktop/main/index.ts") },
    },
  },
  preload: {
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: resolve("desktop/preload/index.ts"),
        // Окно работает в песочнице — ей нужен CommonJS.
        output: { format: "cjs", entryFileNames: "[name].cjs" },
      },
    },
  },
  renderer: {
    root: "desktop/renderer",
    plugins: [react()],
    build: {
      outDir: resolve("out/renderer"),
      rollupOptions: { input: resolve("desktop/renderer/index.html") },
    },
  },
});
