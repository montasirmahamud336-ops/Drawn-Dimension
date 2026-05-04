import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawApiBase = String(env.VITE_API_BASE_URL ?? "").trim();
  const cmsMediaTarget = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "http://127.0.0.1:4000";

  return {
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: false,
      },
      watch: {
        ignored: [
          "data/**",
          "media/**",
          "uploads/**",
          "**/server-node/data/**",
          "**/server-node/media/**",
          "**/server-node/uploads/**",
          "server-node/data/**",
          "server-node/media/**",
          "server-node/uploads/**",
        ],
      },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        "/cms-media": {
          target: cmsMediaTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/cms-media/, "/media"),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
