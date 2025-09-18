import {defineConfig} from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      sanity: path.resolve(__dirname, 'node_modules/sanity/dist/index.mjs')
    }
  }
})
