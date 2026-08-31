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
        // Infraestructura / integracion (no es logica de negocio pura)
        "src/lib/prisma.ts",
        "src/lib/metrics.ts",
        "src/lib/observe.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
