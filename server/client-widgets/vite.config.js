import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../public/js/widgets"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "featured-products": path.resolve(__dirname, "entries/featured-products.jsx"),
        "product-shop": path.resolve(__dirname, "entries/product-shop.jsx"),
        "product-detail": path.resolve(__dirname, "entries/product-detail.jsx"),
        "cart-page": path.resolve(__dirname, "entries/cart-page.jsx"),
        "admin-app": path.resolve(__dirname, "entries/admin-app.jsx"),
        "user-dashboard": path.resolve(__dirname, "entries/user-dashboard.jsx"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
