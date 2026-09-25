import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:8000",
          changeOrigin: false,
        },
        ...(env.AMAP_SECURITY_CODE
          ? {
              "/_AMapService": {
                target: "https://restapi.amap.com",
                changeOrigin: true,
                rewrite: (path: string) =>
                  path.replace(/^\/_AMapService/, "") +
                  (path.includes("?") ? "&" : "?") +
                  "jscode=" +
                  encodeURIComponent(env.AMAP_SECURITY_CODE),
              },
            }
          : {}),
      },
    },
  };
});
