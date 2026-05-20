/// <reference types="node" />
import { defineConfig, type ServerOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
    build: {
        target: "es2022",
        sourcemap: true,
    },
});
