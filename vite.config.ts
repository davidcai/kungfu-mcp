import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "mcp-app.html",
      output: {
        entryFileNames: "mcp-app.js",
        assetFileNames: "mcp-app[extname]",
      },
    },
  },
});
