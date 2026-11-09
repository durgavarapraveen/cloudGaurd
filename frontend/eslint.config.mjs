import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Session state lives in localStorage, which is only readable after
      // mount, so the auth guards in the layouts legitimately call setState
      // from an effect. eslint-config-next 16.4 raised these two from warning
      // to error; they stay warnings here so CI reflects real breakage rather
      // than a known, deliberate pattern.
      //
      // Removing the pattern means moving sessions to HttpOnly cookies and
      // guarding on the server. That is tracked in CONTRIBUTING.md.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
