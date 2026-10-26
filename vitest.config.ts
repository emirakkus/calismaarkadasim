import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testlerde DB istemcisi tembel bağlanır; yalnızca modül yüklenmesi için gerekli.
process.env.DATABASE_URL ||=
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
