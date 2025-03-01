/**
{
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/electron",
    "plugin:import/typescript"
  ],
  "parser": "@typescript-eslint/parser"
}
*/
module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: { project: "tsconfig.json" },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["webpack.*","*.js", "dist/**"],
  overrides: [
      {
          files: [
            "src/**/*.{ts,tsx}"
          ],
          rules: {
              semi: ["error", "always"],
              "@typescript-eslint/promise-function-async": "error",
              "@typescript-eslint/no-floating-promises": "error",
          },
      },
  ],
};
