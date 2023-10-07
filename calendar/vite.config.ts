import path from 'path';
import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { tsconfigBaseAliases } from 'nx-vue3-vite';

export default defineConfig({
    assetsInclude: /\.(pdf|jpg|png|svg)$/,
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            ...tsconfigBaseAliases(__dirname),
            // Add your aliases here
        },
    },
    publicDir: path.resolve(__dirname, './src/public'),
    plugins: [Vue()],
});
