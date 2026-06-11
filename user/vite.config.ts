import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useProxy = env.VITE_USE_PROXY === "true";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      watch: { usePolling: true },
      ...(useProxy && {
        proxy: {
          "/api/auth":          { target: "http://127.0.0.1:8001", changeOrigin: true },
          "/api/users":         { target: "http://127.0.0.1:8001", changeOrigin: true },
          "/api/products":      { target: "http://127.0.0.1:8002", changeOrigin: true },
          "/api/orders":        { target: "http://127.0.0.1:8003", changeOrigin: true },
          "/api/cart":          { target: "http://127.0.0.1:8003", changeOrigin: true },
          "/api/notifications": { target: "http://127.0.0.1:8005", changeOrigin: true },
        },
      }),
    },
  };
});
