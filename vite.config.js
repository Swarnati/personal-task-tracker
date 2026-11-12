import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "My Tasks",
        short_name: "My Tasks",
        description: "A simple personal task tracker",
        theme_color: "#172b4d",
        background_color: "#f5f7fb",
        display: "standalone",
        start_url: "/",
        icons: []
      }
    })
  ]
});
