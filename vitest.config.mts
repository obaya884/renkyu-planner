import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    // 日本以外のタイムゾーンでも日付の計算が変わらないことを、全テストで確かめる
    env: { TZ: "America/Los_Angeles" },
    include: ["src/**/*.test.ts"],
  },
});
