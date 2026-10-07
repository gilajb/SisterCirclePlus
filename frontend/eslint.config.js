import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // This codebase writes plain apostrophes/quotes in JSX text throughout,
      // which React renders fine.
      "react/no-unescaped-entities": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "src/legacy/**", "test-results/**", "playwright-report/**"]),
]);
