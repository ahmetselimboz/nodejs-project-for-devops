import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  { 
    files: ["**/*.{js,mjs,cjs}"], 
    languageOptions: { globals: { ...globals.browser, ...globals.node } }, 
    rules: { "no-unused-vars": "warn" } 
  },
  { 
    files: ["**/*.js"], 
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } }, 
    rules: { "no-unused-vars": "warn" } 
  },
  { 
    files: ["**/*.test.js", "tests/**/*.js"], 
    languageOptions: { globals: { ...globals.jest, ...globals.node } } 
  }
];
