import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "ChangeThis",
      fileName: "widget",
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        entryFileNames: "widget.global.js"
      }
    }
  }
});
