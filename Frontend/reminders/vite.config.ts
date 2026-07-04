import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const apiUris: Record<string, string> = {
    development: "http://localhost:3000/api",
    staging: "https://localhost/api",
    production: "https://reminders.thjread.com/api",
};

export default defineConfig(({ mode }) => ({
    define: {
        API_URI: JSON.stringify(apiUris[mode] ?? apiUris.production),
    },
    server: {
        // the backend's debug CORS config allows exactly this origin
        port: 8000,
        strictPort: true,
    },
    build: {
        sourcemap: true,
    },
    plugins: [
        VitePWA({
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.js",
            // sw-manager.ts registers /sw.js itself
            injectRegister: null,
            // public/manifest.json is used as-is
            manifest: false,
            injectManifest: {
                globPatterns: ["**/*.{js,css,html,svg,png,ico,json,xml,txt}"],
                globIgnores: ["404.html", "50x.html"],
            },
        }),
    ],
}));
