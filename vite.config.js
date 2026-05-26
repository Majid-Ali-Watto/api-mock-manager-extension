import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  build: {
    // Disable source maps in production for smaller bundle size
    sourcemap: false,
    outDir: "dist",
    emptyOutDir: true,
    // Minify with esbuild (faster than terser, built-in)
    minify: 'esbuild',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
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
        },
        // Optimize chunk splitting
        manualChunks: undefined
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
