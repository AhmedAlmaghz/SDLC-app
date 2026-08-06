import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "src"),
      "@contracts": path.resolve(templateRoot, "contracts"),
      "@db": path.resolve(templateRoot, "db"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  css: {
    // Tests don't render components; disable PostCSS/Tailwind processing so the
    // tailwindcss plugin's config hook doesn't run (it breaks under vitest).
    postcss: {},
  },
  test: {
    environment: "node",
    // Use the vmThreads pool: the default "forks" pool fails to initialize the
    // worker test context on some Windows + Node 24 setups (the `describe` API
    // throws "Cannot read properties of undefined (reading 'config')").
    pool: "vmThreads",
    include: ["api/**/*.test.ts", "api/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
  },
});
