import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests live next to the code they cover as *.test.ts. "unit" tests fake the
// database and session; an "integration" project against a real test
// database can be added to `projects` alongside it.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**", ".next/**", "**/*.integration.test.ts"],
        },
      },
    ],
  },
});
