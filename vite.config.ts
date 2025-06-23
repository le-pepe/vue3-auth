import { defineConfig } from 'vite'
import path from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [dts()],
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'Vue3Auth',
            formats: ['es', 'umd'],
            fileName: (format) => `index.${format}.js`
        },
        rollupOptions: {
            external: ['vue', 'axios'],
            output: {
                globals: {
                    vue: 'Vue',
                    axios: 'axios'
                }
            }
        }
    }
})
