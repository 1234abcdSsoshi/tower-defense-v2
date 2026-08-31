import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify("test"),
  },
  test: {
    // シムは DOM に触らない。触るようになったら、それ自体が設計の後退なので落ちてよい
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
