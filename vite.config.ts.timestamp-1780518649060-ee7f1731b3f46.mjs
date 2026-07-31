// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/DrawnDimension/node_modules/vite/dist/node/index.js";
import react from "file:///C:/DrawnDimension/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\DrawnDimension";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawApiBase = String(env.VITE_API_BASE_URL ?? "").trim();
  const cmsMediaTarget = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "http://127.0.0.1:4000";
  return {
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: false
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
          "server-node/uploads/**"
        ]
      },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true
        },
        "/cms-media": {
          target: cmsMediaTarget,
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/cms-media/, "/media")
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxEcmF3bkRpbWVuc2lvblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcRHJhd25EaW1lbnNpb25cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L0RyYXduRGltZW5zaW9uL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksIFwiXCIpO1xuICBjb25zdCByYXdBcGlCYXNlID0gU3RyaW5nKGVudi5WSVRFX0FQSV9CQVNFX1VSTCA/PyBcIlwiKS50cmltKCk7XG4gIGNvbnN0IGNtc01lZGlhVGFyZ2V0ID0gcmF3QXBpQmFzZSA/IHJhd0FwaUJhc2UucmVwbGFjZSgvXFwvKyQvLCBcIlwiKSA6IFwiaHR0cDovLzEyNy4wLjAuMTo0MDAwXCI7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIGhvc3Q6IFwiOjpcIixcbiAgICAgIHBvcnQ6IDgwODAsXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgICAgaG1yOiB7XG4gICAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIHdhdGNoOiB7XG4gICAgICAgIGlnbm9yZWQ6IFtcbiAgICAgICAgICBcImRhdGEvKipcIixcbiAgICAgICAgICBcIm1lZGlhLyoqXCIsXG4gICAgICAgICAgXCJ1cGxvYWRzLyoqXCIsXG4gICAgICAgICAgXCIqKi9zZXJ2ZXItbm9kZS9kYXRhLyoqXCIsXG4gICAgICAgICAgXCIqKi9zZXJ2ZXItbm9kZS9tZWRpYS8qKlwiLFxuICAgICAgICAgIFwiKiovc2VydmVyLW5vZGUvdXBsb2Fkcy8qKlwiLFxuICAgICAgICAgIFwic2VydmVyLW5vZGUvZGF0YS8qKlwiLFxuICAgICAgICAgIFwic2VydmVyLW5vZGUvbWVkaWEvKipcIixcbiAgICAgICAgICBcInNlcnZlci1ub2RlL3VwbG9hZHMvKipcIixcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBwcm94eToge1xuICAgICAgICBcIi9hcGlcIjoge1xuICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjgwMDBcIixcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIFwiL2Ntcy1tZWRpYVwiOiB7XG4gICAgICAgICAgdGFyZ2V0OiBjbXNNZWRpYVRhcmdldCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgcmV3cml0ZTogKHJlcXVlc3RQYXRoKSA9PiByZXF1ZXN0UGF0aC5yZXBsYWNlKC9eXFwvY21zLW1lZGlhLywgXCIvbWVkaWFcIiksXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcGx1Z2luczogW3JlYWN0KCldLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlPLFNBQVMsY0FBYyxlQUFlO0FBQy9RLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sYUFBYSxPQUFPLElBQUkscUJBQXFCLEVBQUUsRUFBRSxLQUFLO0FBQzVELFFBQU0saUJBQWlCLGFBQWEsV0FBVyxRQUFRLFFBQVEsRUFBRSxJQUFJO0FBRXJFLFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxPQUFPO0FBQUEsUUFDTCxTQUFTO0FBQUEsVUFDUDtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLFFBQ0EsY0FBYztBQUFBLFVBQ1osUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsU0FBUyxDQUFDLGdCQUFnQixZQUFZLFFBQVEsZ0JBQWdCLFFBQVE7QUFBQSxRQUN4RTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakIsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
