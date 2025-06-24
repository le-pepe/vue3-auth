import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    splitting: false,
    sourcemap: true,
    minify: false,
    clean: true,
    format: ['esm', 'cjs'],
    dts: true,
    target: 'esnext',
    external: ['vue', 'axios', 'vue-router'],
})
