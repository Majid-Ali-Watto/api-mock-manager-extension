import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// content.js / injected.js run as classic content scripts and cannot `import`.
// Fail the build if Rollup ever splits shared code out of them into a chunk.
const classicContentScripts = {
  name: "classic-content-scripts",
  generateBundle(_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === "chunk" && ["content", "injected"].includes(chunk.name) && chunk.imports.length) {
        this.error(`${chunk.fileName} must be self-contained but imports: ${chunk.imports.join(", ")}`);
      }
    }
  },
};

export default defineConfig({
  plugins: [vue(), classicContentScripts],
  build: {
    // Disable source maps in production for smaller bundle size
    sourcemap: false,
    outDir: "dist",
    emptyOutDir: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background.js"),
        content: resolve(__dirname, "src/content.js"),
        injected: resolve(__dirname, "src/injected.js")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' || chunkInfo.name === 'content' || chunkInfo.name === 'injected'
            ? '[name].js'
            : 'assets/[name]-[hash].js';
        }
      }
    }
  },
  // Exclude test and documentation files from being processed
  publicDir: 'public',
  // Optimize build performance
  optimizeDeps: {
    include: ['vue', 'idb']
  }
});
