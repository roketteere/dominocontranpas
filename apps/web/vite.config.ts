/// <reference types="node" />
import { defineConfig, type ServerOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const envPort = process.env.PORT;
const serverConfig: ServerOptions = {
    strictPort: false,
    host: true,
};
if (envPort !== undefined && envPort !== "") {
    serverConfig.port = Number(envPort);
}

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: serverConfig,
    resolve: {
        alias: {
            "@convex": path.resolve(here, "../convex"),
        },
    },
    build: {
        target: "es2022",
        sourcemap: true,
    },
});
