import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = tseslint.config(
  { ignores: [".next/**", "coverage/**", "dist/**", "node_modules/**", "sources/**", "next-env.d.ts"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

export default eslintConfig;
