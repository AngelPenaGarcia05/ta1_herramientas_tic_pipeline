import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      // 'lcov' genera coverage/lcov.info (lo consume SonarCloud)
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/actions/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "**/node_modules/**",
        // Cliente de base de datos: integracion pura, no se testea en unitarias
        "src/lib/prisma.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
