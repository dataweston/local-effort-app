import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "electron-main": "src/main/electron-main.ts",
    preload: "src/main/preload.ts"
  },
  outDir: "dist/main",
  format: ["cjs"],
  dts: false,
  sourcemap: true,
  clean: false,
  platform: "node",
  target: "node18",
  splitting: false,
  shims: false,
  outExtension() {
    return { js: ".cjs" };
  }
});
